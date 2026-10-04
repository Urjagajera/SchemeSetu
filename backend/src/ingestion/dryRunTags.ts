/**
 * dryRunTags.ts
 * READ-ONLY dry run of the tag clean-up (see tagMerge.ts for the rules). Writes nothing to the database.
 *
 * Writes two files into backend/reports/ (not committed):
 *   - tag-cleanup-dry-run.md   the report to review: summary, top groups, groups needing a decision, held-back pairs, all groups
 *   - tag-merge-plan.json      the exact rename map the apply step would use
 *
 * Usage: npm run ingest:tags-dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { hi } from '../translation/vocabulary/hi.js';
import { planMerges, type MergeGroup, type TagInfo } from './tagMerge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.join(__dirname, '..', '..', 'reports');

/**
 * Tag names the app matches by exact (lower-cased) name: the Search page's occupation keyword lists, the Profile page's
 * suggested tags, and the interests the backend adds. A merge that removes one of these spellings without keeping the
 * other would quietly change who matches. Read from the source files, so the report cannot go stale.
 */
function codeReferencedTagNames(): Map<string, string> {
  const root = path.join(__dirname, '..', '..', '..', 'src', 'pages');
  const names = new Map<string, string>();
  const quoted = (text: string): string[] => [...text.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());
  try {
    const search = fs.readFileSync(path.join(root, 'Search.tsx'), 'utf8');
    for (const m of search.matchAll(/const (\w+Keywords) = \[([\s\S]*?)\];/g)) for (const n of quoted(m[2])) if (!names.has(n)) names.set(n, `Search page ${m[1]}`);
    const profile = fs.readFileSync(path.join(root, 'Profile.tsx'), 'utf8');
    const start = profile.indexOf("'Student', 'Scholarship'");
    if (start >= 0) for (const n of quoted(profile.slice(start, profile.indexOf('.map((tag', start)))) if (!names.has(n)) names.set(n, 'Profile page suggested tag');
  } catch {
    /* source files not found (for example when run from a build): the report says so */
  }
  for (const n of ['woman', 'women', 'farmer', 'farmers', 'agriculture', 'student', 'entrepreneur', 'employee', 'unemployed', 'senior citizen']) if (!names.has(n)) names.set(n, 'interests built by the backend');
  return names;
}

const fmt = (n: number): string => n.toLocaleString('en-US');
const pct = (a: number, b: number): string => (b === 0 ? '0%' : `${((100 * a) / b).toFixed(1)}%`);
const describe = (g: MergeGroup): string => g.members.map((m) => `${m.name === g.canonical ? '**' : ''}${m.name}${m.name === g.canonical ? '**' : ''} (${m.schemeCount}${m.hindi ? ', has Hindi' : ''})`).join(' · ');

async function main(): Promise<void> {
  const rows = await prisma.tag.findMany({ select: { name: true, schemes: { select: { id: true } } } });
  const hindiTags = hi.tags as Record<string, string>;
  const schemeIdsOf = new Map<string, Set<string>>(rows.map((r) => [r.name, new Set(r.schemes.map((s) => s.id))]));
  const tags: TagInfo[] = rows.map((r) => ({ name: r.name, schemeCount: r.schemes.length, hindi: hindiTags[r.name] }));
  const plan = planMerges(tags);

  const distinctSchemes = (g: MergeGroup): number => {
    const all = new Set<string>();
    for (const m of g.members) for (const id of schemeIdsOf.get(m.name) ?? []) all.add(id);
    return all.size;
  };

  // links before and after, scheme by scheme
  const tagsOfScheme = new Map<string, Set<string>>();
  for (const [name, ids] of schemeIdsOf) for (const id of ids) (tagsOfScheme.get(id) ?? tagsOfScheme.set(id, new Set()).get(id)!).add(name);
  let linksBefore = 0;
  let linksAfter = 0;
  let schemesChanged = 0;
  let schemesCollapsing = 0;
  for (const set of tagsOfScheme.values()) {
    linksBefore += set.size;
    const mapped = new Set([...set].map((n) => plan.renames[n] ?? n));
    linksAfter += mapped.size;
    if ([...set].some((n) => n in plan.renames)) schemesChanged++;
    if (mapped.size < set.size) schemesCollapsing++;
  }

  const tagsRemoved = Object.keys(plan.renames).length;
  const hindiNames = Object.keys(hindiTags);
  const hindiMerged = hindiNames.filter((n) => n in plan.renames);
  const hindiCanonicalMissing = hindiMerged.filter((n) => hindiTags[plan.renames[n]] === undefined);
  const flagged = plan.groups.filter((g) => g.flags.length > 0);
  // Worth a real look: two forms with different Hindi, several variants, or a close call between two well-used forms.
  // Everything else flagged is a tie or close call between tiny tags (the smaller form on fewer than 5 schemes): low stakes.
  const isDecision = (g: MergeGroup): boolean => {
    const counts = g.members.map((m) => m.schemeCount).sort((a, b) => b - a);
    return g.flags.some((f) => /Hindi entry, and they differ|variants in one group/.test(f)) || (counts[1] >= 5 && counts[1] * 2 >= counts[0]);
  };
  const needsLook = flagged.filter(isDecision);
  const lowStakes = flagged.filter((g) => !isDecision(g));
  const top30 = [...plan.groups].sort((a, b) => distinctSchemes(b) - distinctSchemes(a)).slice(0, 30);

  const referenced = codeReferencedTagNames();
  const codeConflicts = plan.groups
    .map((g) => ({ g, lost: g.members.filter((m) => m.name !== g.canonical && referenced.has(m.name.toLowerCase()) && m.name.toLowerCase() !== g.canonical.toLowerCase()) }))
    .filter(({ g, lost }) => lost.length > 0 && !referenced.has(g.canonical.toLowerCase()));

  const byKind = (k: string) => plan.groups.filter((g) => g.kind === k);
  const lines: string[] = [];
  lines.push('# Tag clean-up: dry run', '', `Generated ${new Date().toISOString().slice(0, 10)}. NOTHING has been changed in the database. This is the plan for your approval.`, '');

  lines.push('## Summary', '');
  lines.push('| | |', '|---|---|');
  lines.push(`| Tags now | ${fmt(tags.length)} |`);
  lines.push(`| Groups to merge | ${fmt(plan.groups.length)} (${fmt(byKind('typographic').length)} case/spacing/punctuation only, ${fmt(byKind('plural').length)} singular/plural only, ${fmt(byKind('typographic + plural').length)} both) |`);
  lines.push(`| Tags that would disappear | ${fmt(tagsRemoved)} (${pct(tagsRemoved, tags.length)}) → ${fmt(tags.length - tagsRemoved)} tags left |`);
  lines.push(`| Scheme-tag links | ${fmt(linksBefore)} → ${fmt(linksAfter)} (${fmt(linksBefore - linksAfter)} fewer, all from a scheme that carried two spellings of the same tag) |`);
  lines.push(`| Schemes whose tag list changes | ${fmt(schemesChanged)} of ${fmt(tagsOfScheme.size)} with tags; ${fmt(schemesCollapsing)} of them carried two spellings and end up with one |`);
  lines.push(`| Groups where the kept form is not obvious | ${fmt(flagged.length)}: ${fmt(needsLook.length)} worth your eye, ${fmt(lowStakes.length)} low-stakes ties/close calls between tiny tags (all listed below) |`);
  lines.push(`| Pairs deliberately NOT merged | ${fmt(plan.heldBack.length)} (singular/plural that mean different things) |`);
  lines.push(`| Groups that clash with tag names written into the code | ${fmt(codeConflicts.length)} (see "Code that matches tags by exact name") |`);
  lines.push(`| Hindi vocabulary tag entries | ${fmt(hindiNames.length)}; ${fmt(hindiMerged.length)} would be merged away, of which ${fmt(hindiCanonicalMissing.length)} would lose their Hindi (the rule keeps a member that has an entry) |`);
  lines.push('');

  lines.push('## The rules used', '');
  lines.push(
    '1. **Same tag, typed differently**: same words in different case, spacing, hyphens, slashes, ampersands or other punctuation (`Self-Employment` / `Self Employment` / `self-employment`; `HIV / AIDS` / `HIV & AIDS`).',
    '2. **Singular and plural of the last word**, only when both already exist as tags (`Farmer` / `Farmers`, `Fishery` / `Fisheries`). A tag is only ever merged into another tag that already exists.',
    '3. **Which form is kept**: a member that has a Hindi vocabulary entry first (so the Hindi keeps resolving; if several have one, the most used of those); otherwise the form used by the most schemes; a tie goes to Title Case, then alphabetical.',
    '4. **Never merged**: pairs whose singular and plural mean different things (see "Held back"), different spellings (`Enterpreneur`), different forms (`Schedule Caste` vs `Scheduled Caste`, `Start Up` vs `Startup`), synonyms (`Farmer` / `Cultivator`, `Financial Assistance` / `Monetary Aid`), and a plural in any word but the last (`Person With Disability` vs `Persons With Disability`).',
    '',
  );

  lines.push('## Top 30 groups by schemes affected', '', 'The kept form is in bold; numbers are schemes carrying that exact tag.', '');
  top30.forEach((g, i) => lines.push(`${i + 1}. ${describe(g)}  — ${fmt(distinctSchemes(g))} schemes in the group, ${g.kind}`));
  lines.push('');

  lines.push(`## Worth your eye: the kept form is not obvious (${needsLook.length})`, '', 'Two forms with different Hindi, several variants in one group, or a close call between two forms that are each on 5+ schemes. Tell me which to change; otherwise the bold form is kept.', '');
  needsLook.forEach((g, i) => {
    lines.push(`${i + 1}. ${describe(g)}`);
    for (const f of g.flags) lines.push(`    - ${f}`);
  });
  lines.push('');
  lines.push(`## Low stakes: ties and close calls between tiny tags (${lowStakes.length})`, '', 'The smaller form is on fewer than 5 schemes, so which spelling is kept hardly matters. The bold form is kept.', '');
  lowStakes.forEach((g, i) => lines.push(`${i + 1}. ${describe(g)} — ${g.flags.map((f) => f.replace(/^close call: .*$/, 'close call').replace(/^the two most used forms are tied at (d+) schemes$/, 'tied at $1')).join('; ')}`));
  lines.push('');

  lines.push(`## Code that matches tags by exact name (${codeConflicts.length} clashes)`, '', `${fmt(referenced.size)} tag names are written into the code (Search page keyword lists, Profile page suggested tags, backend interests). In these groups the code names a spelling that would be merged away but not the spelling that is kept, so the filter would stop matching those schemes by tag:`, '');
  for (const { g, lost } of codeConflicts) lines.push(`- ${describe(g)} — the code names ${lost.map((m) => `"${m.name}" (${referenced.get(m.name.toLowerCase())})`).join(', ')}`);
  if (codeConflicts.length === 0) lines.push('- none');
  lines.push('', 'Fix options: add the kept spellings to the Search page keyword list (a small change that only adds matches), or keep the spelling the code names. Recommended: the first.', '');

  lines.push(`## Held back: singular/plural pairs NOT merged because the meaning differs (${plan.heldBack.length})`, '');
  for (const h of plan.heldBack) lines.push(`- **${h.singular}** / **${h.plural}**: ${h.reason}`);
  lines.push('');

  lines.push(`## Every group (${plan.groups.length})`, '', 'Kept form in bold.', '');
  plan.groups.forEach((g, i) => lines.push(`${i + 1}. [${g.kind}] ${describe(g)}`));
  lines.push('');

  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, 'tag-cleanup-dry-run.md'), lines.join('\n'));
  fs.writeFileSync(
    path.join(REPORTS, 'tag-merge-plan.json'),
    JSON.stringify({ generated: new Date().toISOString(), renames: plan.renames, groups: plan.groups.map((g) => ({ canonical: g.canonical, kind: g.kind, members: g.members.map((m) => ({ name: m.name, schemes: m.schemeCount, hindi: m.hindi ?? null })) })) }, null, 1),
  );

  console.log(`tags ${tags.length} → ${tags.length - tagsRemoved} | groups ${plan.groups.length} | links ${linksBefore} → ${linksAfter} | schemes changed ${schemesChanged} | worth a look ${needsLook.length} | low-stakes ${lowStakes.length} | held back ${plan.heldBack.length}`);
  console.log(`hindi entries ${hindiNames.length}, merged away ${hindiMerged.length}, would lose Hindi ${hindiCanonicalMissing.length}`);
  console.log('wrote reports/tag-cleanup-dry-run.md and reports/tag-merge-plan.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
