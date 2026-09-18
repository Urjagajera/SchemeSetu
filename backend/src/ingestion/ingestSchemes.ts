/**
 * ingestSchemes.ts
 * Database batch ingestion script for SchemeSetu.
 *
 * Reads parsed CSV data from backend/data/final_data_without_process_mode_.csv
 * and performs idempotent upserts into the Scheme table, keyed on `sourceUrl`.
 *
 * IMPORTANT:
 * - Writes Scheme fields (sourceUrl, name, authorityName, description, benefits,
 *   documentRequirements, applicationMode, applicationProcess, eligibilityRawText)
 *   AND links Category/Tag relations (see below). Does NOT touch
 *   EligibilityCriteria — no source data exists for it in this CSV.
 * - Category = the scheme's authority/ministry grouping, per Category's own
 *   schema.prisma field comments ("raw OFFERED BY value" / level / stateName) —
 *   NOT a topical subject area like "Agriculture" or "Education". The source
 *   CSV has no separate topical-category column (checked: url, OFFERED BY,
 *   TITLE, tag_1..9, DETAILS, benefit_1..15, eligibility_1..15, MODE FOR APPLY,
 *   APPLICTION PROCESS, document_requirement_1..15 — that's the complete header
 *   row), so this is the only schema-consistent, data-supported interpretation.
 *   One Category per scheme, connected/created from its own authorityName.
 * - Tag = the genuine topical/demographic signal that does exist in the source
 *   data: the tag_1..9 columns, already flattened into ParsedScheme.tags by
 *   csvParser.ts. Many-to-many, one Tag row per distinct tag string across the
 *   whole dataset.
 * - Supports `--limit=N` (or INGEST_LIMIT env var) for phased rollouts (Phase A: 20 rows, Phase B: all 4,722 rows).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseCsvFile } from './csvParser.js';
import prisma from '../db/prisma.js';
import { deriveLevel } from '../utils/schemeLevel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseLimitArg(): number | null {
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--limit=')) {
      const val = parseInt(arg.slice('--limit='.length), 10);
      if (!isNaN(val) && val > 0) return val;
    } else if (arg === '--limit' && i + 1 < process.argv.length) {
      const val = parseInt(process.argv[i + 1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  if (process.env.INGEST_LIMIT) {
    const val = parseInt(process.env.INGEST_LIMIT, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

async function runIngestion(): Promise<void> {
  const csvPath = path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ERROR: CSV file not found at expected path:\n  ${csvPath}`);
    process.exit(1);
  }

  const limit = parseLimitArg();

  console.log('================================================================================');
  console.log('                    SCHEMESETU - DATABASE SCHEME INGESTION                     ');
  console.log('================================================================================\n');

  console.log(`Loading and parsing CSV from: ${csvPath}...`);
  const parseStart = Date.now();
  const parseResult = parseCsvFile(csvPath);
  const parseElapsed = Date.now() - parseStart;

  console.log(`Parsed ${parseResult.totalRows} schemes in ${parseElapsed} ms.`);
  console.log(`Mojibake repairs applied across: ${parseResult.mojibakeModifiedRowCount} rows.`);
  console.log(`Salvaged applicationMode exclusions: ${parseResult.salvagedRowCount} rows.`);

  const schemesToIngest = limit ? parseResult.schemes.slice(0, limit) : parseResult.schemes;

  console.log(`\nIngestion Target: ${schemesToIngest.length} rows (limit: ${limit ? limit : 'none - FULL DATASET'})\n`);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ link: string; error: string }> = [];

  for (let idx = 0; idx < schemesToIngest.length; idx++) {
    const scheme = schemesToIngest[idx];
    const currentIndex = idx + 1;

    try {
      const level = deriveLevel(scheme.authorityName);
      const categoryLink = {
        connectOrCreate: {
          where: { name: scheme.authorityName },
          create: {
            name: scheme.authorityName,
            level,
            stateName: level === 'State' ? scheme.authorityName : null,
          },
        },
      };
      const tagLink = {
        connectOrCreate: scheme.tags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      };

      await prisma.scheme.upsert({
        where: { sourceUrl: scheme.sourceUrl },
        update: {
          name: scheme.name,
          authorityName: scheme.authorityName,
          description: scheme.description,
          benefits: scheme.benefits,
          documentRequirements: scheme.documentRequirements,
          applicationMode: scheme.applicationMode,
          applicationProcess: scheme.applicationProcess,
          eligibilityRawText: scheme.eligibilityRawText,
          // `set: []` first, so a re-run reflects the CSV's current tags/authority
          // exactly (matching how plain-array fields like `benefits` are fully
          // overwritten above) rather than only ever accumulating connections.
          categories: { set: [], ...categoryLink },
          tags: { set: [], ...tagLink },
        },
        create: {
          sourceUrl: scheme.sourceUrl,
          name: scheme.name,
          authorityName: scheme.authorityName,
          description: scheme.description,
          benefits: scheme.benefits,
          documentRequirements: scheme.documentRequirements,
          applicationMode: scheme.applicationMode,
          applicationProcess: scheme.applicationProcess,
          eligibilityRawText: scheme.eligibilityRawText,
          categories: categoryLink,
          tags: tagLink,
        },
      });

      successCount++;

      // Log every row for small batches (<= 50) or periodic milestones for large batches
      if (schemesToIngest.length <= 50) {
        console.log(`[${currentIndex}/${schemesToIngest.length}] Upserted: "${scheme.name}" (${scheme.sourceUrl})`);
      } else if (currentIndex % 250 === 0 || currentIndex === schemesToIngest.length) {
        const batchElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Progress] ${currentIndex}/${schemesToIngest.length} schemes upserted (${batchElapsed}s elapsed)...`);
      }
    } catch (err: unknown) {
      errorCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push({ link: scheme.sourceUrl, error: errorMessage });
      console.error(`❌ [Error at index ${currentIndex}] Failed to upsert ${scheme.sourceUrl}: ${errorMessage}`);
    }
  }

  const totalElapsedMs = Date.now() - startTime;
  const totalElapsedSec = (totalElapsedMs / 1000).toFixed(2);

  console.log('\n================================================================================');
  console.log('                          INGESTION SUMMARY REPORT                              ');
  console.log('================================================================================');
  console.log(`Total Schemes Targeted : ${schemesToIngest.length}`);
  console.log(`Successfully Upserted  : ${successCount}`);
  console.log(`Errors Encountered     : ${errorCount}`);
  console.log(`Total Elapsed Time     : ${totalElapsedMs} ms (${totalElapsedSec} s)`);
  console.log('================================================================================\n');

  if (errors.length > 0) {
    console.error('Errors summary:');
    errors.slice(0, 10).forEach((e) => console.error(` - ${e.link}: ${e.error}`));
    if (errors.length > 10) console.error(` ... and ${errors.length - 10} more errors`);
    process.exit(1);
  }
}

runIngestion()
  .catch((err) => {
    console.error('Fatal error during ingestion:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
