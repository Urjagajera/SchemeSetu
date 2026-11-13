import type { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';
import { levelWhereClause } from '../utils/schemeLevel.js';
import { evaluateCriteria } from '../utils/criteriaMatch.js';
import { canonicalState } from '../utils/states.js';
import type { ChatProfile } from './profileForChat.js';

/** What the assistant is told about each scheme: public text from the scheme data only. */
export interface ChatScheme {
  id: string;
  name: string;
  authority: string;
  description: string;
  benefits: string[];
  eligibility: string[];
  documents: string[];
}

const MAX_KEYWORDS = 8;
const MAX_TERMS = 16;
const MAX_CANDIDATES = 3000; // every scheme that matches a word is scored; this only guards against a runaway query
const MAX_TEXT = 600; // per field, so a few schemes fit in one small-model request

const clip = (s: string) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s);
const clipList = (list: string[], n: number) => list.slice(0, n).map(clip);

/** Words of a phrase that say nothing about the topic ("small farmer" -> "farmer"). */
const FILLER = new Set('and the for with from into small big new old get buy how can are any'.split(' '));

/** A rough stem so "farmers", "tractors", "machinery" also find "farmer", "tractor", "machine". */
export function stem(word: string): string {
  if (word.length > 6 && word.endsWith('ery')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Short forms too short to search for on their own ("sc" is inside "scheme"), written out the way schemes spell them. */
const SHORT_FORMS: Record<string, string> = { sc: 'scheduled caste', st: 'scheduled tribe' };

/** One search word or phrase: the phrase as given, and its separate words (stemmed) when it has more than one. */
export interface SearchGroup {
  phrase: string;
  parts: string[];
}

/**
 * What to look for, one group per search word or phrase: the phrase as given (a full scheme name should still match
 * as a whole), plus its separate words, stemmed ("farm machinery" -> "farm", "machin"). "SC"/"ST" are written out.
 */
export function searchGroups(keywords: string[]): SearchGroup[] {
  const groups: SearchGroup[] = [];
  for (const raw of keywords.map((w) => w.trim().toLowerCase())) {
    const k = SHORT_FORMS[raw] ?? raw;
    if (k.length < 3 || groups.some((g) => g.phrase === k)) continue;
    const words = k.split(/[^\p{L}\p{M}\p{N}]+/u).map((w) => SHORT_FORMS[w] ?? w);
    const parts = [...new Set(words.filter((w) => w.length >= 3 && !FILLER.has(w)).map(stem))].filter((w) => w !== k);
    groups.push({ phrase: k, parts });
  }
  return groups.slice(0, MAX_KEYWORDS);
}

/** Every term the groups search for, phrases first. */
export function searchTerms(keywords: string[]): string[] {
  const groups = searchGroups(keywords);
  return [...new Set([...groups.map((g) => g.phrase), ...groups.flatMap((g) => g.parts)])].slice(0, MAX_TERMS);
}

/**
 * The schemes most worth showing for some English search words: matched on name, tags and description. Every
 * matching scheme is scored (a name hit counts most), and a word that few schemes contain ("tractor") counts more
 * than one that many do ("farmer"). With a profile, schemes the person clearly fails (a hard criterion such as age
 * or gender) are left out, and only central schemes and those of their state are kept.
 */
export async function findSchemesForChat(keywords: string[], profile: ChatProfile | null, limit = 5): Promise<ChatScheme[]> {
  // A state named in the question ("...in Gujarat") is where, not what: it narrows the schemes like a profile's state
  // does, instead of matching every scheme whose text mentions that state.
  const named = keywords.map((k) => canonicalState(k.trim())).find((st): st is string => st !== null);
  const state = profile?.state ?? named ?? null;
  const topical = keywords.filter((k) => canonicalState(k.trim()) === null);
  const groups = searchGroups(topical);
  const terms = searchTerms(topical);
  if (terms.length === 0) return [];

  const and: Prisma.SchemeWhereInput[] = [
    {
      OR: terms.flatMap((w) => [
        { name: { contains: w, mode: 'insensitive' as const } },
        { tags: { some: { name: { contains: w, mode: 'insensitive' as const } } } },
        { description: { contains: w, mode: 'insensitive' as const } },
      ]),
    },
  ];
  if (state) and.push({ OR: [levelWhereClause('Central') ?? {}, { authorityName: { equals: state, mode: 'insensitive' } }] });

  const rows = await prisma.scheme.findMany({
    where: { AND: and },
    select: { id: true, name: true, description: true, tags: { select: { name: true } }, eligibilityCriteria: true },
    orderBy: { id: 'asc' },
    take: MAX_CANDIDATES,
  });

  const docs = rows
    .filter((s) => !profile || !s.eligibilityCriteria || !evaluateCriteria(s.eligibilityCriteria as never, profile).some((r) => r.status === 'failed' && !r.soft))
    .map((s) => ({ s, name: s.name.toLowerCase(), tags: s.tags.map((t) => t.name.toLowerCase()).join(' | '), description: s.description.toLowerCase() }));

  // How telling each term is: rare among the matching schemes = high weight.
  const weight = new Map(
    terms.map((t) => {
      const df = docs.filter((d) => d.name.includes(t) || d.tags.includes(t) || d.description.includes(t)).length;
      return [t, Math.log(1 + docs.length / Math.max(df, 1))];
    }),
  );

  // Each search word or phrase counts once: the phrase itself, or the average of its words (so a long or made-up name
  // cannot outweigh a short, specific word like "tractor").
  const termScore = (d: (typeof docs)[number], t: string) =>
    (weight.get(t) ?? 0) * ((d.name.includes(t) ? 3 : 0) + (d.tags.includes(t) ? 2 : 0) + (d.description.includes(t) ? 1 : 0));
  const scored = docs
    .map((d) => ({
      s: d.s,
      score: groups.reduce((sum, g) => {
        const whole = termScore(d, g.phrase);
        const split = g.parts.length > 0 ? g.parts.reduce((x, t) => x + termScore(d, t), 0) / g.parts.length : 0;
        return sum + Math.max(whole, split);
      }, 0),
    }))
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .slice(0, limit);

  const full = await prisma.scheme.findMany({ where: { id: { in: scored.map(({ s }) => s.id) } } });
  const byId = new Map(full.map((s) => [s.id, s]));

  return scored.map(({ s: { id } }) => byId.get(id)!).filter(Boolean).map((s) => ({
    id: s.id,
    name: s.name,
    authority: s.authorityName,
    description: clip(s.description),
    benefits: clipList(s.benefits, 4),
    eligibility: clipList(s.eligibilityRawText, 5),
    documents: clipList(s.documentRequirements, 6),
  }));
}
