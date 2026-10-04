import { TAG_RENAMES } from './tagRenames.js';

/** The name a source tag is stored under: merged-away spellings become the one that was kept. */
export function canonicalTagName(name: string, renames: Record<string, string> = TAG_RENAMES): string {
  return Object.prototype.hasOwnProperty.call(renames, name) ? renames[name] : name;
}

/** Canonical names for one scheme's tags, each once, in source order. */
export function canonicalTags(tags: string[], renames: Record<string, string> = TAG_RENAMES): string[] {
  return [...new Set(tags.map((t) => canonicalTagName(t, renames)))];
}
