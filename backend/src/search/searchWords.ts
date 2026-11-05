import type { Prisma } from '@prisma/client';
import { INDIAN_STATES_AND_UTS } from '../utils/states.js';

/**
 * Search box text (typed, or spoken through voice search) turned into the words to look for.
 * "Pension schemes for widows in Gujarat" becomes the words ["pension", "widow"] and the state "Gujarat": filler
 * words are dropped, a plural "s" is trimmed so "widows" also finds "widow", and a state's name narrows the search
 * to central schemes plus that state's own, instead of matching every scheme whose text mentions the state.
 */
export interface SearchWords {
  words: string[];
  state: string | null;
}

const MAX_WORDS = 8;

const STOPWORDS = new Set(
  (
    'a an and or of for to in on at by with from about into under as is are was were be been am do does did can could ' +
    'should would will shall may might the this that these those there their them they it its me my i we our us you your ' +
    'he she his her what which who whom whose when where why how any some all please tell know give get need want find ' +
    'show list search looking look help related available scheme schemes yojana yojna government govt sarkari'
  ).split(' '),
);

/** Lowercase words of the text; \p{M} keeps the vowel signs of Hindi and Gujarati words, which are marks, not letters. */
const tokens = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

/** "widows" -> "widow", "subsidies" -> "subsid" (still found inside "subsidy"); "class" and "bus" stay. */
function singular(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

export function searchWords(text: string): SearchWords {
  let rest = ` ${tokens(text).join(' ')} `;
  let state: string | null = null;
  // Matched as whole words, so "Goa" is not found inside another word. The first state named is the one used.
  for (const name of INDIAN_STATES_AND_UTS) {
    const phrase = ` ${tokens(name).join(' ')} `;
    if (rest.includes(phrase)) {
      state ??= name;
      rest = rest.replace(phrase, ' ');
    }
  }
  const words = [...new Set(tokens(rest).filter((w) => !STOPWORDS.has(w)).map(singular))].slice(0, MAX_WORDS);
  return { words, state };
}

/** Words of one or two letters ("pm", "sc") are found only as whole words: inside other words they match almost anything. */
const isShort = (w: string) => [...w].length <= 2;
const wholeWord = (w: string) => new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{M}\\p{N}])`, 'u');

/**
 * The database condition: a scheme matching ANY of the words (name, description, authority or a tag). Short words
 * are left to the ranking, unless they are all there is.
 */
export function textWhere(words: string[]): Prisma.SchemeWhereInput {
  const long = words.filter((w) => !isShort(w));
  const used = long.length > 0 ? long : words;
  return {
    OR: used.flatMap((w) => [
      { name: { contains: w, mode: 'insensitive' as const } },
      { description: { contains: w, mode: 'insensitive' as const } },
      { authorityName: { contains: w, mode: 'insensitive' as const } },
      { tags: { some: { name: { contains: w, mode: 'insensitive' as const } } } },
    ]),
  };
}

export interface RankRow {
  id: string;
  name: string;
  description: string;
  authorityName: string;
  tags: Array<{ name: string }>;
}

/**
 * Best matches first: a scheme that has more of the words comes first; then where they appear (in the name counts
 * most, then a tag, then the authority or description); the whole search written in the name gets a bonus.
 * Ties go by name, so the order is stable from page to page.
 */
export function rankSchemes<T extends RankRow>(rows: T[], words: string[], phrase: string): T[] {
  const tests = words.map((w) => (isShort(w) ? (s: string) => wholeWord(w).test(s) : (s: string) => s.includes(w)));
  const wholePhrase = tokens(phrase).join(' ');
  const scored = rows.map((row) => {
    const name = row.name.toLowerCase();
    const tags = row.tags.map((t) => t.name.toLowerCase()).join(' | ');
    const authority = row.authorityName.toLowerCase();
    const description = row.description.toLowerCase();
    let matched = 0;
    let score = 0;
    for (const has of tests) {
      const where = (has(name) ? 3 : 0) + (has(tags) ? 2 : 0) + (has(authority) ? 1 : 0) + (has(description) ? 1 : 0);
      if (where > 0) matched++;
      score += where;
    }
    if (words.length > 1 && wholePhrase && tokens(row.name).join(' ').includes(wholePhrase)) score += 5;
    return { row, matched, rank: matched * 100 + score };
  });
  // The database matches short words anywhere ("pm" inside "development"); here they must be whole words.
  return scored.filter((s) => s.matched > 0).sort((a, b) => b.rank - a.rank || a.row.name.localeCompare(b.row.name)).map((s) => s.row);
}
