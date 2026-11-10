/**
 * dryRunStatusGates.ts
 * READ-ONLY dry run of parseStatusGates.ts (government job, income tax, BPL, pension). No database writes.
 *
 * Writes reports/status-gates-dry-run.md for the accuracy review:
 *   A. every rule it would store, with the sentence that drove it (to check precision: is each one right?)
 *   B. every sentence it saw but rejected, with the reason (to check recall: is a real rule being missed?)
 *
 * Usage: npm run ingest:status-gates-dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { extractStatusGates, StatusGates } from './parseStatusGates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GATES = ['govtJob', 'incomeTax', 'bpl', 'pension'] as const;
const clip = (s: string, n = 260) => (s.length > n ? s.slice(0, n) + '…' : s);

async function main() {
  const schemes = await prisma.scheme.findMany({
    select: { name: true, sourceUrl: true, eligibilityRawText: true },
    orderBy: { name: 'asc' },
  });
  const rows = schemes.map((s) => ({ ...s, gates: extractStatusGates(s.eligibilityRawText) as StatusGates }));

  const out: string[] = ['# Status rules dry run (government job, income tax, BPL, pension)', '', `Schemes read: ${rows.length}`, ''];
  for (const g of GATES) {
    const decided = rows.filter((r) => r.gates[g].value !== null);
    const counts: Record<string, number> = {};
    decided.forEach((r) => (counts[r.gates[g].value!] = (counts[r.gates[g].value!] || 0) + 1));
    const conflicts = rows.filter((r) => r.gates[g].nullReason);
    const rejected = rows.flatMap((r) => r.gates[g].rejected.map((x) => ({ name: r.name, ...x })));
    console.log(`${g}: ${decided.length} schemes ${JSON.stringify(counts)}; ${conflicts.length} conflicts; ${rejected.length} rejected sentences`);

    out.push(`## ${g}`, '', `Would store: ${decided.length} ${JSON.stringify(counts)}; left null because sentences disagree: ${conflicts.length}; rejected sentences: ${rejected.length}`, '');
    out.push(`### A. Stored (${decided.length})`, '');
    decided.forEach((r, i) => out.push(`${i + 1}. **${r.gates[g].value}** — ${r.name}`, ...r.gates[g].matchedSentences.map((s) => `   - "${clip(s)}"`)));
    out.push('', `### Conflicts (${conflicts.length})`, '');
    conflicts.forEach((r) => out.push(`- ${r.name}: ${r.gates[g].nullReason}`));
    out.push('', `### B. Rejected (${rejected.length})`, '');
    rejected.forEach((x, i) => out.push(`${i + 1}. [${x.reason}] ${x.name}: "${clip(x.sentence)}"`));
    out.push('');
  }
  const file = path.resolve(__dirname, '../../reports/status-gates-dry-run.md');
  fs.writeFileSync(file, out.join('\n'));
  console.log(`Report: ${file}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
