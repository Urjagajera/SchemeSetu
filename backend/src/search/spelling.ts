/**
 * Typo-tolerant search: a searched word that appears nowhere in the scheme data ("scolarship", "pention") is replaced
 * by the closest word that does ("scholarship", "pension"). Words are only corrected when they match nothing at all,
 * so a real word, or the start of one ("farm" in "farmer"), is never changed.
 */

/** Every word of the scheme data (names, tags, ministries, descriptions) with how many schemes use it. */
export type Vocabulary = Map<string, number>;

const MIN_LENGTH = 4; // shorter words are left alone: too many real words are one letter apart
const MAX_VOCAB_WORD = 24;

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= MIN_LENGTH && w.length <= MAX_VOCAB_WORD);

/** Builds the vocabulary from one text per scheme (a word counts once per scheme). */
export function buildVocabulary(texts: string[]): Vocabulary {
  const vocab: Vocabulary = new Map();
  for (const text of texts) for (const w of new Set(words(text))) vocab.set(w, (vocab.get(w) ?? 0) + 1);
  return vocab;
}

/** Edit distance where swapping two neighbouring letters counts as one change ("pnesion" -> "pension"). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** How many letters may be wrong: 1 for short words, 2 from 7 letters on. */
const allowed = (w: string) => (w.length >= 7 ? 2 : 1);

/** A word used by at most this many schemes may itself be a typo in the data ("disablity"). */
const RARE = 3;
/** ...and is corrected only to a word used by at least this many times more schemes. */
const MUCH_MORE_COMMON = 10;

/** True when the word is part of a longer word in the data ("farm" in "farmer"): nothing to correct. */
function partOfAWord(word: string, vocab: Vocabulary): boolean {
  for (const v of vocab.keys()) if (v.includes(word)) return true;
  return false;
}

/** The closest word in the data, or null when the word is fine, not plain Latin letters, or nothing is close enough. */
export function correctWord(word: string, vocab: Vocabulary): string | null {
  if (!/^[a-z]+$/.test(word) || word.length < MIN_LENGTH) return null;
  const uses = vocab.get(word) ?? 0;
  if (uses > RARE) return null; // a real, common word
  if (uses === 0 && partOfAWord(word, vocab)) return null;
  const max = allowed(word);
  let best: { w: string; d: number; n: number } | null = null;
  for (const [w, n] of vocab) {
    if (w === word || Math.abs(w.length - word.length) > max) continue;
    const d = editDistance(word, w, max);
    if (d > max) continue;
    // Fewer changes first; then the word more schemes use (real words beat typos in the data).
    if (!best || d < best.d || (d === best.d && n > best.n)) best = { w, d, n };
  }
  if (!best) return null;
  // A word that is in the data (rarely) is only swapped for one that is far more common.
  if (uses > 0 && best.n < uses * MUCH_MORE_COMMON) return null;
  return best.w;
}

/** Corrects each word that matches nothing; returns the words to search and whether anything changed. */
export function correctWords(input: string[], vocab: Vocabulary): { words: string[]; corrected: boolean } {
  let corrected = false;
  const out = input.map((w) => {
    const fix = correctWord(w, vocab);
    if (fix && fix !== w) {
      corrected = true;
      return fix;
    }
    return w;
  });
  return { words: [...new Set(out)], corrected };
}
