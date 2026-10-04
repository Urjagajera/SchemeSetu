/**
 * Words that mark a scheme as relevant to an entrepreneur in the Search filter. Tags are matched by exact lowercase
 * name, so after the tag clean-up merged spellings (MSME -> MSMEs, Start-up -> Start Up, Startups -> Startup,
 * Micro Enterprise -> Micro Enterprises) the kept spellings must be listed too, or those schemes would stop matching.
 */
export const ENTREPRENEUR_KEYWORDS = [
  'entrepreneur', 'business', 'start-up', 'startups', 'industry', 'industries',
  'msme', 'micro enterprise', 'self employment', 'self-employment', 'retailer', 'trader',
  // the spellings the tag clean-up kept
  'msmes', 'start up', 'startup', 'micro enterprises',
];

export function matchesEntrepreneur(tagsLower: string[], titleLower: string, descLower: string): boolean {
  return tagsLower.some((t) => ENTREPRENEUR_KEYWORDS.includes(t)) ||
    ENTREPRENEUR_KEYWORDS.some((kw) => titleLower.includes(kw) || descLower.includes(kw));
}
