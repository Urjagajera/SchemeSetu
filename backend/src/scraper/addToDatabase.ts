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
 * It only ever CREATES schemes: an existing one is never updated or deleted. Everything happens in one transaction,
 * so if anything fails, nothing is added; the next run's --sync-db tries again (see run.ts).
 */

/** The new CSV rows, parsed exactly as the import parses the whole file. */
export function parseNewRows(rows: readonly (readonly string[])[]): ParsedScheme[] {
  const text = encodeCsvRow(CSV_HEADER) + rows.map((r) => encodeCsvRow(r)).join('');
  return parseCsv(text).schemes;
}

export async function addNewSchemes(prisma: PrismaClient, schemes: readonly ParsedScheme[]): Promise<{ added: number; withCriteria: number }> {
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
            },
          });
          withCriteria++;
        }
      }
      return { added: schemes.length, withCriteria };
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  );
}
