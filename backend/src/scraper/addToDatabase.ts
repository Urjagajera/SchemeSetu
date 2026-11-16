import type { PrismaClient } from '@prisma/client';
import { parseCsv, ParsedScheme } from '../ingestion/csvParser.js';
import { parseEligibilityForScheme } from '../ingestion/parseEligibility.js';
import { canonicalTags } from '../ingestion/tagCanonical.js';
import { deriveLevel } from '../utils/schemeLevel.js';
import { CSV_HEADER, encodeCsvRow } from './csvRow.js';

/**
 * Puts NEW schemes into the database with the same processing the existing ones had (ingestSchemes.ts and
 * ingestEligibility.ts): the CSV rows go through the same parser (broken-character repair, ways to apply), tags get
 * their cleaned-up names, and eligibility (age, income, gender, state...) is read from the text.
 *
 * It only ever CREATES schemes: an existing one is never updated or deleted. Schemes are added in small batches, each
 * in its own transaction: a batch is all or nothing, and the batches before it stay added. (One transaction for all
 * of them ran past its 10-minute limit from GitHub to Neon with 198 schemes, and undid everything.) Whatever is still
 * missing is added by the next run's --sync-db (see run.ts).
 */

/** Schemes per transaction: about a minute of work from GitHub to Neon, well inside the limit below. */
export const ADD_BATCH_SIZE = 20;

/** The new CSV rows, parsed exactly as the import parses the whole file. */
export function parseNewRows(rows: readonly (readonly string[])[]): ParsedScheme[] {
  const text = encodeCsvRow(CSV_HEADER) + rows.map((r) => encodeCsvRow(r)).join('');
  return parseCsv(text).schemes;
}

export async function addNewSchemes(
  prisma: PrismaClient,
  schemes: readonly ParsedScheme[],
  batchSize = ADD_BATCH_SIZE,
): Promise<{ added: number; withCriteria: number }> {
  let added = 0;
  let withCriteria = 0;
  for (let i = 0; i < schemes.length; i += batchSize) {
    try {
      const r = await addBatch(prisma, schemes.slice(i, i + batchSize));
      added += r.added;
      withCriteria += r.withCriteria;
    } catch (e) {
      // Say how far it got: the earlier batches are in the database, the rest are added by the next --sync-db.
      throw new Error(`${(e as Error).message} (after ${added} of ${schemes.length} were added)`);
    }
  }
  return { added, withCriteria };
}

/** One batch in one transaction: all of it is added, or none of it. */
async function addBatch(prisma: PrismaClient, schemes: readonly ParsedScheme[]): Promise<{ added: number; withCriteria: number }> {
  if (schemes.length === 0) return { added: 0, withCriteria: 0 };
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.scheme.findMany({ where: { sourceUrl: { in: schemes.map((s) => s.sourceUrl) } }, select: { sourceUrl: true } });
      if (existing.length > 0) throw new Error(`already in the database, so nothing was added: ${existing.map((e) => e.sourceUrl).join(', ')}`);

      let withCriteria = 0;
      for (const s of schemes) {
        const level = deriveLevel(s.authorityName);
        const created = await tx.scheme.create({
          data: {
            sourceUrl: s.sourceUrl,
            name: s.name,
            authorityName: s.authorityName,
            description: s.description,
            benefits: s.benefits,
            documentRequirements: s.documentRequirements,
            applicationMode: s.applicationMode,
            applicationProcess: s.applicationProcess,
            eligibilityRawText: s.eligibilityRawText,
            categories: {
              connectOrCreate: {
                where: { name: s.authorityName },
                create: { name: s.authorityName, level, stateName: level === 'State' ? s.authorityName : null },
              },
            },
            tags: { connectOrCreate: canonicalTags(s.tags).map((name) => ({ where: { name }, create: { name } })) },
          },
          select: { id: true },
        });

        const p = parseEligibilityForScheme(s.sourceUrl, s.name, s.eligibilityRawText, s.authorityName);
        if (p.hasAnyCriteria) {
          await tx.eligibilityCriteria.create({
            data: {
              schemeId: created.id,
              ageMin: p.ageMin,
              ageMax: p.ageMax,
              incomeMinAnnual: p.incomeMinAnnual,
              incomeMaxAnnual: p.incomeMaxAnnual,
              gender: p.gender,
              category: p.category,
              state: p.state,
              landOwnership: p.landOwnership,
              residence: p.residence,
              occupation: p.occupation,
              govtJob: p.govtJob,
              incomeTax: p.incomeTax,
              bpl: p.bpl,
              pension: p.pension,
            },
          });
          withCriteria++;
        }
      }
      return { added: schemes.length, withCriteria };
    },
    { timeout: 5 * 60_000, maxWait: 60_000 },
  );
}
