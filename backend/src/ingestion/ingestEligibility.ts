/**
 * ingestEligibility.ts
 * Database ingestion script for SchemeSetu.
 *
 * Reads Scheme.eligibilityRawText from the database and populates the
 * EligibilityCriteria relation (ageMin, ageMax, incomeMinAnnual, incomeMaxAnnual).
 *
 * Locked Rules:
 * - Phase A: Curated test batch of 15 schemes (by link), logs all decisions with source text.
 * - Phase B: Ingests all remaining schemes.
 * - Row is created ONLY if at least one numeric criterion (age/income) is found.
 * - Respects sanity bound (<= 50 lakh) and lower-ceiling rule for dual incomes.
 */

import prisma from '../db/prisma.js';
import { parseEligibilityForScheme, ParsedEligibility } from './parseEligibility.js';

export const PHASE_A_LINKS = [
  'https://www.myscheme.gov.in/schemes/sui',
  'https://www.myscheme.gov.in/schemes/pmsby',
  'https://www.myscheme.gov.in/schemes/sfava',
  'https://www.myscheme.gov.in/schemes/sss',
  'https://www.myscheme.gov.in/schemes/kbpyy',
  'https://www.myscheme.gov.in/schemes/uas',
  'https://www.myscheme.gov.in/schemes/mpkskkn-d',
  'https://www.myscheme.gov.in/schemes/post-st',
  'https://www.myscheme.gov.in/schemes/bsrs',
  'https://www.myscheme.gov.in/schemes/rgisfm',
  'https://www.myscheme.gov.in/schemes/pmfmpe',
  'https://www.myscheme.gov.in/schemes/mdds',
  // 3 baseline comparison schemes:
  'https://www.myscheme.gov.in/schemes/apy',      // Straightforward age-only (18-40)
  'https://www.myscheme.gov.in/schemes/postmsc',  // Straightforward income-only (2.50 lakh)
  'https://www.myscheme.gov.in/schemes/pmmy',     // Baseline with zero criteria (no row)
];

export interface IngestionReportItem {
  link: string;
  title: string;
  matchedSentences: string[];
  parsed: ParsedEligibility;
  rowAction: 'CREATED' | 'SKIPPED_NO_CRITERIA' | 'UPDATED';
  eligibilityCriteriaId?: string;
}

export interface IngestionRunSummary {
  phase: 'A' | 'B';
  totalSchemesEvaluated: number;
  rowsCreatedOrUpdated: number;
  rowsSkippedNoCriteria: number;
  skippedForSanityList: Array<{ link: string; title: string; amount: number; sentence: string; reason: string }>;
  multipleIncomesResolvedList: Array<{ link: string; title: string; chosen: number; candidates: number[]; sentence: string }>;
  items: IngestionReportItem[];
}

function parseCliArgs(): { phase: 'A' | 'B' } {
  for (const arg of process.argv.slice(2)) {
    if (arg === '--phase=B' || arg === '--all') {
      return { phase: 'B' };
    }
    if (arg === '--phase=A' || arg === '--test') {
      return { phase: 'A' };
    }
  }
  // Default to Phase A for safety
  return { phase: 'A' };
}

export async function runIngestion(targetPhase?: 'A' | 'B'): Promise<IngestionRunSummary> {
  const cliConfig = parseCliArgs();
  const phase = targetPhase || cliConfig.phase;

  console.log('================================================================================');
  console.log(`       SCHEMESETU - ELIGIBILITY CRITERIA INGESTION (PHASE ${phase})           `);
  console.log('================================================================================\n');

  const summary: IngestionRunSummary = {
    phase,
    totalSchemesEvaluated: 0,
    rowsCreatedOrUpdated: 0,
    rowsSkippedNoCriteria: 0,
    skippedForSanityList: [],
    multipleIncomesResolvedList: [],
    items: [],
  };

  let schemesToProcess: Array<{ id: string; sourceUrl: string; name: string; eligibilityRawText: string[] }> = [];

  if (phase === 'A') {
    console.log(`Fetching curated test batch of ${PHASE_A_LINKS.length} schemes...`);
    schemesToProcess = await prisma.scheme.findMany({
      where: { sourceUrl: { in: PHASE_A_LINKS } },
      select: { id: true, sourceUrl: true, name: true, eligibilityRawText: true },
    });

    // Ensure order matches PHASE_A_LINKS for clean comparison
    schemesToProcess.sort((a, b) => PHASE_A_LINKS.indexOf(a.sourceUrl) - PHASE_A_LINKS.indexOf(b.sourceUrl));
  } else {
    console.log('Fetching ALL schemes from database...');
    schemesToProcess = await prisma.scheme.findMany({
      select: { id: true, sourceUrl: true, name: true, eligibilityRawText: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  summary.totalSchemesEvaluated = schemesToProcess.length;
  console.log(`Found ${schemesToProcess.length} schemes to process in Phase ${phase}.\n`);

  for (const scheme of schemesToProcess) {
    const parsed = parseEligibilityForScheme(scheme.sourceUrl, scheme.name, scheme.eligibilityRawText);

    // Track sanity bound skips
    if (parsed.incomeResult.skippedForSanity.length > 0) {
      for (const s of parsed.incomeResult.skippedForSanity) {
        summary.skippedForSanityList.push({
          link: scheme.sourceUrl,
          title: scheme.name,
          amount: s.amount,
          sentence: s.sentence,
          reason: s.reason,
        });
      }
    }

    // Track multiple incomes resolved
    if (parsed.incomeResult.multipleIncomesFound && parsed.incomeResult.maxAnnual !== null) {
      const candidates = Array.from(
        new Set(parsed.incomeResult.candidatesConsidered.filter((c) => c.type === 'max').map((c) => c.valueAnnual))
      );
      summary.multipleIncomesResolvedList.push({
        link: scheme.sourceUrl,
        title: scheme.name,
        chosen: parsed.incomeResult.maxAnnual,
        candidates,
        sentence: parsed.incomeResult.matchedSentences.join(' | '),
      });
    }

    let rowAction: 'CREATED' | 'SKIPPED_NO_CRITERIA' | 'UPDATED' = 'SKIPPED_NO_CRITERIA';
    let criteriaId: string | undefined;

    if (parsed.hasAnyCriteria) {
      const upserted = await prisma.eligibilityCriteria.upsert({
        where: { schemeId: scheme.id },
        create: {
          schemeId: scheme.id,
          ageMin: parsed.ageMin,
          ageMax: parsed.ageMax,
          incomeMinAnnual: parsed.incomeMinAnnual,
          incomeMaxAnnual: parsed.incomeMaxAnnual,
        },
        update: {
          ageMin: parsed.ageMin,
          ageMax: parsed.ageMax,
          incomeMinAnnual: parsed.incomeMinAnnual,
          incomeMaxAnnual: parsed.incomeMaxAnnual,
        },
      });
      rowAction = 'CREATED';
      criteriaId = upserted.id;
      summary.rowsCreatedOrUpdated++;
    } else {
      // Rule: Do NOT create row if none parsed. Clean up any existing if re-running.
      await prisma.eligibilityCriteria.deleteMany({
        where: { schemeId: scheme.id },
      });
      rowAction = 'SKIPPED_NO_CRITERIA';
      summary.rowsSkippedNoCriteria++;
    }

    const allMatchedSentences = Array.from(
      new Set([...parsed.ageResult.matchedSentences, ...parsed.incomeResult.matchedSentences])
    );

    summary.items.push({
      link: scheme.sourceUrl,
      title: scheme.name,
      matchedSentences: allMatchedSentences,
      parsed,
      rowAction,
      eligibilityCriteriaId: criteriaId,
    });
  }

  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`Phase ${phase} Ingestion Complete.`);
  console.log(`  Total Evaluated:          ${summary.totalSchemesEvaluated}`);
  console.log(`  Eligibility Rows Written: ${summary.rowsCreatedOrUpdated}`);
  console.log(`  Skipped (No Criteria):    ${summary.rowsSkippedNoCriteria}`);
  console.log(`  Sanity Skips:             ${summary.skippedForSanityList.length}`);
  console.log(`  Multiple Incomes Resolved: ${summary.multipleIncomesResolvedList.length}`);
  console.log('────────────────────────────────────────────────────────────────────────────────\n');

  return summary;
}

// Direct execution entry point
if (process.argv[1] && process.argv[1].endsWith('ingestEligibility.ts')) {
  runIngestion()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error during eligibility ingestion:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
