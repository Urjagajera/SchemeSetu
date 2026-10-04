/**
 * Applying the tag merge, and proving it was additive. The database access sits behind a small interface (TagStore)
 * so the order of operations, the checks and the rollback can be tested without a database; applyTagMerge.ts supplies
 * the real, Prisma-backed store.
 *
 * What "additive" means here, checked scheme by scheme: after the merge every scheme has EXACTLY the tags it had
 * before, with each merged-away name replaced by the one it was merged into. Nothing lost, nothing gained, and a
 * scheme that carried two spellings of one tag ends up with that tag once.
 */
import { isSamePhrase } from './tagMerge.js';

export interface TagRow {
  id: string;
  name: string;
}
export interface LinkRow {
  schemeId: string;
  tagId: string;
}

export interface TagStore {
  loadTags(): Promise<TagRow[]>;
  loadLinks(): Promise<LinkRow[]>;
  countSchemes(): Promise<number>;
  /** Everything done through `tx` is undone if `work` throws. */
  transaction<T>(work: (tx: TagStoreTx) => Promise<T>): Promise<T>;
}
export interface TagStoreTx extends Omit<TagStore, 'transaction'> {
  /** Moves every scheme link from one tag to another (skipping schemes that already have the target) and deletes the first tag. */
  mergeTag(fromId: string, toId: string): Promise<void>;
}

export interface Backup {
  takenAt: string;
  tags: TagRow[];
  links: LinkRow[];
  schemeCount: number;
}

export type SchemeTags = Map<string, Set<string>>;

export function schemeTagsOf(tags: TagRow[], links: LinkRow[]): SchemeTags {
  const nameOf = new Map(tags.map((t) => [t.id, t.name]));
  const out: SchemeTags = new Map();
  for (const l of links) {
    const name = nameOf.get(l.tagId);
    if (name === undefined) continue;
    const set = out.get(l.schemeId);
    if (set) set.add(name);
    else out.set(l.schemeId, new Set([name]));
  }
  return out;
}

/** Every difference between what each scheme should have after the merge and what it has. Empty means additive. */
export function verifyAdditive(before: SchemeTags, after: SchemeTags, renames: Record<string, string>): string[] {
  const problems: string[] = [];
  const renamed = (name: string): string => renames[name] ?? name;
  for (const [schemeId, tags] of before) {
    const expected = new Set([...tags].map(renamed));
    const actual = after.get(schemeId) ?? new Set<string>();
    const lost = [...expected].filter((t) => !actual.has(t));
    const gained = [...actual].filter((t) => !expected.has(t));
    if (lost.length > 0) problems.push(`scheme ${schemeId} lost: ${lost.join(', ')}`);
    if (gained.length > 0) problems.push(`scheme ${schemeId} gained: ${gained.join(', ')}`);
  }
  for (const schemeId of after.keys()) if (!before.has(schemeId)) problems.push(`scheme ${schemeId} has tags now but had none before`);
  return problems;
}

/** Vocabulary tag keys that no longer resolve to a tag that exists, or to a name that has its own vocabulary entry. */
export function unresolvedVocabulary(vocabularyTags: string[], renames: Record<string, string>, existingTagNames: Set<string>, vocabulary: Record<string, string>): string[] {
  const bad: string[] = [];
  for (const key of vocabularyTags) {
    const target = renames[key] ?? key;
    if (!existingTagNames.has(target)) bad.push(`${key}: its tag "${target}" does not exist`);
    else if (target !== key && vocabulary[target] === undefined) bad.push(`${key}: merged into "${target}", which has no Hindi entry`);
  }
  return bad;
}

export interface ApplyProof {
  renamesApplied: number;
  renamesAlreadyDone: number;
  tagsBefore: number;
  tagsAfter: number;
  linksBefore: number;
  linksAfter: number;
  schemesBefore: number;
  schemesAfter: number;
  schemesChecked: number;
  problems: string[];
}

export interface ApplyOptions {
  /** Called with the full tag and link tables before anything is changed. Must finish (or throw) before the merge starts. */
  writeBackup: (backup: Backup) => Promise<void>;
  /** Plan only: do the checks and the backup, change nothing. */
  dryRun?: boolean;
}

export async function applyTagMerge(store: TagStore, renames: Record<string, string>, options: ApplyOptions): Promise<ApplyProof> {
  const tags = await store.loadTags();
  const links = await store.loadLinks();
  const schemesBefore = await store.countSchemes();
  const idOf = new Map(tags.map((t) => [t.name, t.id]));

  // Refuse anything that is not the approved kind of rename.
  const notSame = Object.entries(renames).filter(([from, to]) => !isSamePhrase(from, to));
  if (notSame.length > 0) throw new Error(`refusing: not the same phrase: ${notSame.map(([f, t]) => `"${f}" => "${t}"`).join('; ')}`);
  const missingTarget = Object.values(renames).filter((to) => !idOf.has(to));
  if (missingTarget.length > 0) throw new Error(`refusing: the tag to merge into does not exist: ${[...new Set(missingTarget)].join(', ')}`);
  const chained = Object.values(renames).filter((to) => to in renames);
  if (chained.length > 0) throw new Error(`refusing: a kept tag is itself renamed: ${[...new Set(chained)].join(', ')}`);

  const todo = Object.entries(renames).filter(([from]) => idOf.has(from));
  const alreadyDone = Object.keys(renames).length - todo.length;

  await options.writeBackup({ takenAt: new Date().toISOString(), tags, links, schemeCount: schemesBefore });

  const before = schemeTagsOf(tags, links);
  if (options.dryRun) {
    return { renamesApplied: 0, renamesAlreadyDone: alreadyDone, tagsBefore: tags.length, tagsAfter: tags.length - todo.length, linksBefore: links.length, linksAfter: links.length, schemesBefore, schemesAfter: schemesBefore, schemesChecked: before.size, problems: [] };
  }

  const proof = await store.transaction(async (tx) => {
    for (const [from, to] of todo) await tx.mergeTag(idOf.get(from) as string, idOf.get(to) as string);
    const tagsNow = await tx.loadTags();
    const linksNow = await tx.loadLinks();
    const schemesNow = await tx.countSchemes();
    const problems = verifyAdditive(before, schemeTagsOf(tagsNow, linksNow), renames);
    if (schemesNow !== schemesBefore) problems.push(`scheme count changed from ${schemesBefore} to ${schemesNow}`);
    const left = tagsNow.filter((t) => t.name in renames);
    if (left.length > 0) problems.push(`merged-away tags still exist: ${left.map((t) => t.name).join(', ')}`);
    if (tagsNow.length !== tags.length - todo.length) problems.push(`expected ${tags.length - todo.length} tags, found ${tagsNow.length}`);
    if (problems.length > 0) throw new Error(`proof failed, rolling back: ${problems.slice(0, 5).join(' | ')}${problems.length > 5 ? ` (+${problems.length - 5} more)` : ''}`);
    return { tagsAfter: tagsNow.length, linksAfter: linksNow.length, schemesAfter: schemesNow, problems };
  });

  return { renamesApplied: todo.length, renamesAlreadyDone: alreadyDone, tagsBefore: tags.length, linksBefore: links.length, schemesBefore, schemesChecked: before.size, ...proof };
}
