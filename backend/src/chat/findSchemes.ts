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
const CANDIDATES = 300;
const MAX_TEXT = 600; // per field, so a few schemes fit in one small-model request

const clip = (s: string) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s);
const clipList = (list: string[], n: number) => list.slice(0, n).map(clip);

/**
 * The schemes most worth showing for some English search words: matched on name, tags and description, ranked by
 * where the words appear (a name hit counts most). With a profile, schemes the person clearly fails (a hard
 * criterion such as age or gender) are left out, and only central schemes and those of their state are kept.
 */
export async function findSchemesForChat(keywords: string[], profile: ChatProfile | null, limit = 5): Promise<ChatScheme[]> {
  // A state named in the question ("...in Gujarat") is where, not what: it narrows the schemes like a profile's state
  // does, instead of matching every scheme whose text mentions that state.
  const named = keywords.map((k) => canonicalState(k.trim())).find((st): st is string => st !== null);
  const state = profile?.state ?? named ?? null;
  const words = [...new Set(keywords.filter((k) => canonicalState(k.trim()) === null).map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 3))].slice(0, MAX_KEYWORDS);
  if (words.length === 0) return [];

  const and: Prisma.SchemeWhereInput[] = [
    {
      OR: words.flatMap((w) => [
        { name: { contains: w, mode: 'insensitive' as const } },
        { tags: { some: { name: { contains: w, mode: 'insensitive' as const } } } },
        { description: { contains: w, mode: 'insensitive' as const } },
      ]),
    },
  ];
  if (state) and.push({ OR: [levelWhereClause('Central') ?? {}, { authorityName: { equals: state, mode: 'insensitive' } }] });

  const rows = await prisma.scheme.findMany({
    where: { AND: and },
    include: { tags: true, eligibilityCriteria: true },
    take: CANDIDATES,
  });

  const scored = rows
    .filter((s) => !profile || !s.eligibilityCriteria || !evaluateCriteria(s.eligibilityCriteria as never, profile).some((r) => r.status === 'failed' && !r.soft))
    .map((s) => {
      const name = s.name.toLowerCase();
      const tags = s.tags.map((t) => t.name.toLowerCase()).join(' ');
      const description = s.description.toLowerCase();
      const score = words.reduce((sum, w) => sum + (name.includes(w) ? 3 : 0) + (tags.includes(w) ? 2 : 0) + (description.includes(w) ? 1 : 0), 0);
      return { s, score };
    })
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .slice(0, limit);

  return scored.map(({ s }) => ({
    id: s.id,
    name: s.name,
    authority: s.authorityName,
    description: clip(s.description),
    benefits: clipList(s.benefits, 4),
    eligibility: clipList(s.eligibilityRawText, 5),
    documents: clipList(s.documentRequirements, 6),
  }));
}
