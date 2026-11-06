/**
 * Related tags for new schemes.
 *
 * The existing CSV gives most schemes the tags shown on their myScheme page PLUS a few related words that are not on
 * the page ("Farmer" also "Farming", "Cultivator"). SchemeSetu's topic and occupation filters match on those words,
 * so new schemes get them too: learned from the CSV itself as "a scheme tagged X almost always also has Y after it".
 *
 * Measured on 98 schemes left out of the learning (2026-11-05): with these settings, 95 of 98 land in the same
 * Search filters as their CSV row, or better ones (where the CSV had glued tags such as "disabilitypwd").
 */
export const MIN_SCHEMES = 5; // X and Y together in at least this many schemes
export const MIN_SHARE = 0.8; // and Y follows X in at least this share of the schemes tagged X

export type RelatedTagRules = Map<string, string[]>;

const key = (t: string) => t.trim().toLowerCase();

/** Learns the rules from every scheme's tag list (in CSV order). */
export function learnRelatedTags(tagLists: readonly (readonly string[])[], minSchemes = MIN_SCHEMES, minShare = MIN_SHARE): RelatedTagRules {
  const seen = new Map<string, number>();
  const together = new Map<string, Map<string, number>>();
  const spelling = new Map<string, string>(); // the first spelling seen of each tag, used when one is added
  for (const list of tagLists) {
    const tags = [...new Set(list.map((t) => t.trim()).filter(Boolean))];
    tags.forEach((t) => spelling.has(key(t)) || spelling.set(key(t), t));
    const keys = tags.map(key);
    keys.forEach((x, i) => {
      seen.set(x, (seen.get(x) ?? 0) + 1);
      for (const y of keys.slice(i + 1)) {
        if (y === x) continue;
        const m = together.get(x) ?? new Map<string, number>();
        m.set(y, (m.get(y) ?? 0) + 1);
        together.set(x, m);
      }
    });
  }
  const rules: RelatedTagRules = new Map();
  for (const [x, ys] of together) {
    const n = seen.get(x) ?? 0;
    const related = [...ys]
      .filter(([, c]) => c >= minSchemes && c / n >= minShare)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([y]) => spelling.get(y) ?? y);
    if (related.length > 0) rules.set(x, related);
  }
  return rules;
}

/** The page's tags first, then the related words they bring, each once; at most `max` (the CSV has 9 tag columns). */
export function withRelatedTags(pageTags: readonly string[], rules: RelatedTagRules, max = 9): string[] {
  const out: string[] = [];
  const have = new Set<string>();
  const add = (t: string) => {
    if (!have.has(key(t)) && out.length < max) {
      have.add(key(t));
      out.push(t);
    }
  };
  pageTags.forEach(add);
  for (const t of pageTags) (rules.get(key(t)) ?? []).forEach(add);
  return out;
}
