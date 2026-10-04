/**
 * Rules for merging tags that differ only in how they are typed. Pure functions: no database, no side effects.
 *
 * What counts as the same tag:
 *   1. Typographic variants: the same words in different case, spacing, hyphens, slashes, ampersands or other
 *      punctuation ("Self-Employment", "Self Employment", "self-employment"; "HIV / AIDS", "HIV & AIDS").
 *   2. Singular / plural of the LAST word, when both forms already exist as tags ("Farmer", "Farmers"; "Fishery",
 *      "Fisheries"). Only an existing tag is ever merged into another, so a wrong guess about how to singularise a
 *      word can never create a merge by itself.
 *
 * What is never merged, on purpose:
 *   - Pairs whose singular and plural mean different things (HELD_BACK_PAIRS: "Aid" and "AIDS", "Art" and "Arts", ...).
 *   - Different spellings and synonyms ("Enterpreneur" vs "Entrepreneur", "Schedule Caste" vs "Scheduled Caste",
 *     "Start Up" vs "Startup", "Farmer" vs "Cultivator"). Those are not typographic and are left alone.
 *   - A plural in any word but the last ("Person With Disability" vs "Persons With Disability").
 */

export interface TagInfo {
  name: string;
  /** Distinct schemes carrying this tag. */
  schemeCount: number;
  /** The tag's entry in the Hindi vocabulary, if it has one. */
  hindi?: string;
}

export type MergeKind = 'typographic' | 'plural' | 'typographic + plural';

export interface MergeGroup {
  canonical: string;
  /** Every member including the canonical one, most used first. */
  members: TagInfo[];
  kind: MergeKind;
  /** Reasons a person should look at this group's choice of canonical form; empty when it is obvious. */
  flags: string[];
}

export interface HeldBackPair {
  singular: string;
  plural: string;
  reason: string;
}

/**
 * Whole-tag keys (singular side) whose plural means something else, so the pair is not merged. Checked against the
 * complete tag, so "Hearing Aid" / "Hearing Aids" is still merged while "Aid" / "AIDS" is not.
 */
export const HELD_BACK_PAIRS: Record<string, string> = {
  aid: 'AIDS is a disease, not "aid"',
  art: '"Arts" (humanities, fine arts) is not the same as "Art"',
  sale: '"Sales" (the business function) is not the same as a "Sale"',
  saving: '"Savings" (money put by) is not the same as "Saving" (the act)',
  water: '"Waters" usually means bodies of water',
  faculty: '"Faculties" are academic divisions, "Faculty" is teaching staff',
  utility: '"Utilities" are public services, "Utility" is usefulness',
  trade: '"Trades" are skilled occupations, "Trade" is commerce',
  pulse: '"Pulses" are legume crops, "Pulse" can be a heartbeat',
  medicine: '"Medicines" are drugs, "Medicine" is the field',
  ward: '"Ward" and "Wards" can mean a municipal ward, a hospital ward or a protected person',
  spectacle: '"Spectacles" are glasses, "Spectacle" is a sight',
  coach: '"Coaches" can be railway coaches, "Coach" a trainer',
};

/** Lower-cased, punctuation and symbols treated as spaces, whitespace collapsed. */
export function typographicKey(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}_]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The keys this key could be the plural of: the same words with the last word made singular. */
export function singularCandidates(key: string): string[] {
  const words = key.split(' ');
  const last = words.pop() as string;
  const out: string[] = [];
  if (last.length >= 4 && last.endsWith('ies')) out.push(`${last.slice(0, -3)}y`);
  if (last.length >= 4 && /(?:s|x|z|ch|sh)es$/.test(last)) out.push(last.slice(0, -2));
  if (last.length >= 3 && last.endsWith('s') && !last.endsWith('ss')) out.push(last.slice(0, -1));
  return out.map((s) => [...words, s].join(' '));
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root) as string;
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

const isTitleCase = (name: string): boolean => name.split(/\s+/).every((w) => /^[A-Z0-9]/.test(w));

/**
 * Picks the form to keep. Order of preference:
 *   1. a member that has a Hindi vocabulary entry (so the translation keeps resolving); if several do, the most used of those;
 *   2. otherwise the member used by the most schemes;
 *   3. a tie goes to the form written in Title Case, then to the alphabetically first.
 */
export function chooseCanonical(members: TagInfo[]): TagInfo {
  const withHindi = members.filter((m) => m.hindi !== undefined);
  const pool = withHindi.length > 0 ? withHindi : members;
  return [...pool].sort(
    (a, b) =>
      b.schemeCount - a.schemeCount ||
      Number(isTitleCase(b.name)) - Number(isTitleCase(a.name)) ||
      a.name.localeCompare(b.name, 'en'),
  )[0];
}

function flagsFor(members: TagInfo[], canonical: TagInfo): string[] {
  const flags: string[] = [];
  const byUse = [...members].sort((a, b) => b.schemeCount - a.schemeCount || a.name.localeCompare(b.name, 'en'));
  const [first, second] = byUse;

  if (canonical.name !== first.name && first.schemeCount > canonical.schemeCount) {
    flags.push(`kept "${canonical.name}" (${canonical.schemeCount}) over the more used "${first.name}" (${first.schemeCount}) because it has the Hindi entry`);
  }
  const hindiMembers = members.filter((m) => m.hindi !== undefined);
  if (new Set(hindiMembers.map((m) => m.hindi)).size > 1) {
    flags.push(`more than one member has a Hindi entry, and they differ: ${hindiMembers.map((m) => `"${m.name}" = ${m.hindi}`).join('; ')}`);
  }
  if (second && first.schemeCount === second.schemeCount) {
    flags.push(`the two most used forms are tied at ${first.schemeCount} schemes`);
  } else if (second && second.schemeCount * 2 >= first.schemeCount && first.schemeCount > 0) {
    flags.push(`close call: ${first.schemeCount} schemes for "${first.name}" against ${second.schemeCount} for "${second.name}"`);
  }
  if (members.length > 3) flags.push(`${members.length} variants in one group`);
  return flags;
}

export interface MergePlan {
  groups: MergeGroup[];
  heldBack: HeldBackPair[];
  /** Variant name to the name it will become, for every tag that is merged away. */
  renames: Record<string, string>;
}

export function planMerges(tags: TagInfo[]): MergePlan {
  const uf = new UnionFind();
  const byKey = new Map<string, TagInfo[]>();
  for (const t of tags) {
    const key = typographicKey(t.name);
    if (key === '') continue; // a tag that is only symbols has no words to compare
    const bucket = byKey.get(key);
    if (bucket) bucket.push(t);
    else byKey.set(key, [t]);
  }
  // Typographic variants share a key, so each key is one node; plural links below join keys into groups.
  for (const key of byKey.keys()) uf.find(key);

  const pluralLinks = new Set<string>();
  const heldBack: HeldBackPair[] = [];
  for (const key of byKey.keys()) {
    for (const singular of singularCandidates(key)) {
      if (!byKey.has(singular) || singular === key) continue;
      if (singular in HELD_BACK_PAIRS) {
        heldBack.push({ singular: byKey.get(singular)![0].name, plural: byKey.get(key)![0].name, reason: HELD_BACK_PAIRS[singular] });
        continue;
      }
      uf.union(singular, key);
      pluralLinks.add(singular);
      pluralLinks.add(key);
    }
  }

  const components = new Map<string, string[]>();
  for (const key of byKey.keys()) {
    const root = uf.find(key);
    const list = components.get(root);
    if (list) list.push(key);
    else components.set(root, [key]);
  }

  const groups: MergeGroup[] = [];
  const renames: Record<string, string> = {};
  for (const keys of components.values()) {
    const members = keys.flatMap((k) => byKey.get(k) as TagInfo[]);
    if (members.length < 2) continue;
    const canonical = chooseCanonical(members);
    const typographic = keys.some((k) => (byKey.get(k) as TagInfo[]).length > 1);
    const plural = keys.length > 1;
    const kind: MergeKind = typographic && plural ? 'typographic + plural' : plural ? 'plural' : 'typographic';
    const ordered = [...members].sort((a, b) => b.schemeCount - a.schemeCount || a.name.localeCompare(b.name, 'en'));
    groups.push({ canonical: canonical.name, members: ordered, kind, flags: flagsFor(members, canonical) });
    for (const m of members) if (m.name !== canonical.name) renames[m.name] = canonical.name;
  }
  groups.sort((a, b) => sum(b) - sum(a) || a.canonical.localeCompare(b.canonical, 'en'));
  heldBack.sort((a, b) => a.singular.localeCompare(b.singular, 'en'));
  return { groups, heldBack, renames };
}

const sum = (g: MergeGroup): number => g.members.reduce((n, m) => n + m.schemeCount, 0);
