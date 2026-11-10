/**
 * applyStatusGates.ts
 * Fills ONLY the four status-rule columns of EligibilityCriteria (govtJob, incomeTax, bpl, pension) from
 * parseStatusGates.ts, on a database that already holds the schemes. Nothing else is read from or written to
 * any other column. A scheme with a rule but no EligibilityCriteria row gets a row holding just these four.
 *
 * Dry run by default (prints what it would change); --apply writes everything in one transaction.
 * Usage: npm run ingest:status-gates            (dry run)
 *        npm run ingest:status-gates -- --apply
 */
import prisma from '../db/prisma.js';
import { extractStatusGates } from './parseStatusGates.js';

const FIELDS = ['govtJob', 'incomeTax', 'bpl', 'pension'] as const;
type Values = Record<(typeof FIELDS)[number], string | null>;

async function main() {
  const apply = process.argv.includes('--apply');
  const schemes = await prisma.scheme.findMany({
    select: { id: true, eligibilityRawText: true, eligibilityCriteria: { select: { id: true, govtJob: true, incomeTax: true, bpl: true, pension: true } } },
  });
  if (schemes.length < 1000) throw new Error(`only ${schemes.length} schemes: this does not look like the SchemeSetu database, nothing was changed`);

  const updates: Array<{ schemeId: string; values: Values }> = [];
  const creates: Array<{ schemeId: string; values: Values }> = [];
  const counts: Record<string, number> = {};
  for (const s of schemes) {
    const g = extractStatusGates(s.eligibilityRawText);
    const values: Values = { govtJob: g.govtJob.value, incomeTax: g.incomeTax.value, bpl: g.bpl.value, pension: g.pension.value };
    for (const f of FIELDS) if (values[f]) counts[`${f}=${values[f]}`] = (counts[`${f}=${values[f]}`] ?? 0) + 1;
    const row = s.eligibilityCriteria;
    if (row) {
      if (FIELDS.some((f) => row[f] !== values[f])) updates.push({ schemeId: s.id, values });
    } else if (FIELDS.some((f) => values[f] !== null)) {
      creates.push({ schemeId: s.id, values });
    }
  }

  console.log(`Schemes: ${schemes.length}`);
  console.log(`Rules found: ${JSON.stringify(counts)}`);
  console.log(`Criteria rows to update: ${updates.length}; new criteria rows (status rules only): ${creates.length}`);
  if (!apply) {
    console.log('Dry run: nothing written. Run with --apply to write.');
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      for (const u of updates) await tx.eligibilityCriteria.update({ where: { schemeId: u.schemeId }, data: u.values });
      for (const c of creates) await tx.eligibilityCriteria.create({ data: { schemeId: c.schemeId, ...c.values } });
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  );
  console.log('Written in one transaction.');
}

main()
  .catch((e) => {
    console.error((e as Error).message.replace(/postgres(?:ql)?:\/\/\S+/g, '<db>'));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
