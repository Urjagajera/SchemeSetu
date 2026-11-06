/** What one run did, and the short Markdown report shown on GitHub and saved next to the CSV. */
export interface RunReport {
  date: string;
  dryRun: boolean;
  status: string;
  selfCheck: Array<{ url: string; differs: string[] }>;
  siteTotal: number | null;
  listed: number;
  newFound: number;
  added: Array<{ url: string; title: string; ministry: string }>;
  heldBack: Array<{ url: string; title: string; reasons: string[] }>;
  failedToRead: Array<{ url: string; reason: string }>;
  gone: Array<{ url: string; title: string }>;
  goneCheckSkipped: string | null;
  leftForNextRun: number;
  database: string;
}

export function renderReport(r: RunReport): string {
  const out: string[] = [];
  out.push(`# myScheme check, ${r.date}${r.dryRun ? ' (dry run: nothing written)' : ''}`, '');
  out.push(`**Result:** ${r.status}`, '');
  const failed = r.selfCheck.filter((c) => c.differs.length > 0);
  out.push(`- Self-check: ${failed.length === 0 ? `passed (${r.selfCheck.length} schemes)` : `FAILED, so nothing was written`}`);
  for (const c of failed) out.push(`  - ${c.url}: ${c.differs.join(', ')}`);
  if (failed.length > 0) {
    out.push('', 'myScheme may have changed its pages (or edited one of these schemes). Check the scheme(s) above before the next run.');
    return out.join('\n') + '\n';
  }
  out.push(`- myScheme lists: ${r.listed}${r.siteTotal !== null ? ` (it says ${r.siteTotal})` : ''}`);
  out.push(`- New (not in SchemeSetu): ${r.newFound}${r.leftForNextRun > 0 ? `, ${r.leftForNextRun} left for the next runs` : ''}`);
  out.push(`- ${r.dryRun ? 'Would be added' : 'Added'}: ${r.added.length}`);
  out.push(`- Held back: ${r.heldBack.length}`);
  out.push(`- Could not read: ${r.failedToRead.length}`);
  out.push(`- Gone from myScheme (still in SchemeSetu, nothing changed): ${r.gone.length}${r.goneCheckSkipped ? ` (${r.goneCheckSkipped})` : ''}`);
  out.push(`- Database: ${r.database}`);

  const section = (title: string, lines: string[]) => {
    if (lines.length > 0) out.push('', `## ${title}`, '', ...lines);
  };
  section(r.dryRun ? 'Would be added' : 'Added', r.added.map((a) => `- [${a.title}](${a.url}) (${a.ministry})`));
  section('Held back (not added; tried again next run)', r.heldBack.map((h) => `- [${h.title || h.url}](${h.url}): ${h.reasons.join('; ')}`));
  section('Could not read (tried again next run)', r.failedToRead.map((f) => `- ${f.url}: ${f.reason}`));
  section('Gone from myScheme (kept in SchemeSetu)', r.gone.map((g) => `- [${g.title}](${g.url})`));
  return out.join('\n') + '\n';
}
