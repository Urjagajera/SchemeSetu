/**
 * Shared by the eligibility parsers (state, land, residence area): turns the entries of
 * Scheme.eligibilityRawText into single sentences. One entry can hold several sentences; each is judged on its own.
 */

/** Abbreviations whose full stop must not end a sentence ("i.e. Andaman ...", "Rs. 5", "Dr. B.B. Cancer"). */
export const ABBREVIATION = /\b(?:i\.e|e\.g|viz|vs|nos?|dr|mr|mrs|ms|rs|st|etc|approx|sq|km|ha|inc|co|ltd|a\.m|p\.m|u\.t|n\.\s?c\.\s?t|u\.p|m\.p|h\.p|a\.p|t\.n|w\.b)\./gi;
export const INITIALS = /\b([A-Z])\.(?=\s?[A-Z]\.|\s[A-Z][a-z])/g;
/** Stands in for a full stop that is not a sentence end, while splitting. */
export const DOT = '\u0001';

export function splitIntoSentences(entries: string[]): string[] {
  return entries
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((s) => s.replace(ABBREVIATION, (m) => m.replace(/\./g, DOT)).replace(INITIALS, `$1${DOT}`))
    .flatMap((s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9])/))
    .map((s) => s.replace(new RegExp(DOT, 'g'), '.').trim())
    .filter(Boolean);
}
