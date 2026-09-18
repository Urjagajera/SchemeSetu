/**
 * dryRunParseCsv.ts
 * Extended dry-run verification script for SchemeSetu CSV parser.
 * Reads dataset, parses all rows, and outputs deep-dive samples:
 * 1. 10 evenly spaced rows across the entire 4,722-row dataset
 * 2. 5 more of the 125 salvaged rows (beyond the first 2 shown in Sprint 7)
 * 3. 3 rows mentioning "Lakh" in eligibility text
 * 4. Total count of rows with empty tags array + 2 full examples
 * 5. Single row with the most eligibility items and single row with the most document requirements
 *
 * CRITICAL CONSTRAINT: ZERO DATABASE WRITES, ZERO PRISMA CALLS, CONSOLE ONLY.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { parseCsvFile, parseApplicationMode, ParsedScheme } from './csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ ERROR: CSV file not found at expected path:\n  ${csvPath}`);
  process.exit(1);
}

console.log('================================================================================');
console.log('              SCHEMESETU CSV PARSER - EXTENDED DIVERSITY & EDGE-CASE AUDIT      ');
console.log('================================================================================\n');

const startTime = Date.now();
const result = parseCsvFile(csvPath);
const elapsedMs = Date.now() - startTime;

console.log(`Dataset parsed: ${result.totalRows} rows in ${elapsedMs} ms.`);
console.log(`Mojibake repairs applied across: ${result.mojibakeModifiedRowCount} rows.`);
console.log(`Total applicationMode salvaged rows: ${result.salvagedRowCount}.\n`);

// -----------------------------------------------------------------------------
// SECTION 1: 10 ROWS SPREAD ACROSS THE DATASET (EVENLY SPACED)
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(' SECTION 1: 10 ROWS SPREAD EVENLY ACROSS DATASET (INDICES 0 TO 4700)');
console.log('================================================================================\n');

const spreadIndices = [0, 470, 940, 1410, 1880, 2350, 2820, 3290, 3760, 4700];

spreadIndices.forEach((targetIdx, orderIdx) => {
  const actualIdx = Math.min(targetIdx, result.schemes.length - 1);
  const scheme = result.schemes[actualIdx];
  console.log(`--- [Section 1 - Sample ${orderIdx + 1}/10] Row Index: ${actualIdx} | "${scheme.name}" ---`);
  console.log(JSON.stringify(scheme, null, 2));
  console.log('\n');
});

// -----------------------------------------------------------------------------
// SECTION 2: 5 MORE OF THE 125 SALVAGED ROWS (DIFFERENT FROM FIRST 2)
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(' SECTION 2: 5 MORE OF THE 125 SALVAGED ROWS (SAMPLES #3 THROUGH #7)');
console.log('================================================================================\n');

// Identify all salvaged row URLs from raw CSV
const rawCsv = fs.readFileSync(csvPath, 'utf8');
const rawRecords = parse(rawCsv, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
}) as Array<Record<string, string>>;

const salvagedUrls: string[] = [];
for (const r of rawRecords) {
  const modeRes = parseApplicationMode(r['MODE FOR APPLY']);
  if (modeRes.isSalvaged) {
    salvagedUrls.push(r['url'].trim());
  }
}

console.log(`Total salvaged URLs identified in dataset: ${salvagedUrls.length}`);
console.log(`First 2 were displayed in Sprint 7 (SSS and IPSFTSMPPU). Showing samples #3 through #7:\n`);

// Get next 5 (indices 2 through 6)
const next5SalvagedUrls = salvagedUrls.slice(2, 7);
next5SalvagedUrls.forEach((url, idx) => {
  const scheme = result.schemes.find((s) => s.sourceUrl === url);
  if (scheme) {
    console.log(`--- [Section 2 - Salvaged Sample ${idx + 3}/125] "${scheme.name}" ---`);
    console.log(JSON.stringify(scheme, null, 2));
    console.log('\n');
  }
});

// -----------------------------------------------------------------------------
// SECTION 3: 3 ROWS WHOSE ELIGIBILITY TEXT MENTIONS "Lakh" (CASE-INSENSITIVE)
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(' SECTION 3: 3 ROWS WITH "Lakh" IN ELIGIBILITY TEXT');
console.log('================================================================================\n');

const lakhSchemes: ParsedScheme[] = [];
for (const s of result.schemes) {
  if (s.eligibilityRawText.some((text) => /lakh/i.test(text))) {
    lakhSchemes.push(s);
    if (lakhSchemes.length === 3) break;
  }
}

lakhSchemes.forEach((scheme, idx) => {
  console.log(`--- [Section 3 - Lakh Sample ${idx + 1}/3] "${scheme.name}" ---`);
  console.log(JSON.stringify(scheme, null, 2));
  console.log('\n');
});

// -----------------------------------------------------------------------------
// SECTION 4: ROWS WHERE TAGS ARRAY ENDED UP EMPTY
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(' SECTION 4: ROWS WHERE TAGS ARRAY IS EMPTY');
console.log('================================================================================\n');

const emptyTagSchemes = result.schemes.filter((s) => s.tags.length === 0);
console.log(`Total rows with empty tags: ${emptyTagSchemes.length} (out of ${result.totalRows} total rows)`);

if (emptyTagSchemes.length > 0) {
  console.log('\nShowing 2 full examples with empty tags:\n');
  const samplesToShow = emptyTagSchemes.slice(0, 2);
  samplesToShow.forEach((scheme, idx) => {
    console.log(`--- [Section 4 - Empty Tags Sample ${idx + 1}/2] "${scheme.name}" ---`);
    console.log(JSON.stringify(scheme, null, 2));
    console.log('\n');
  });
}

// -----------------------------------------------------------------------------
// SECTION 5: MAXIMUM ITEMS IN ELIGIBILITY AND DOCUMENT REQUIREMENTS
// -----------------------------------------------------------------------------
console.log('================================================================================');
console.log(' SECTION 5: MAXIMUM ITEMS IN ELIGIBILITY & DOCUMENT REQUIREMENTS');
console.log('================================================================================\n');

const maxEligibilityScheme = result.schemes.reduce(
  (max, s) => (s.eligibilityRawText.length > max.eligibilityRawText.length ? s : max),
  result.schemes[0]
);

const maxDocsScheme = result.schemes.reduce(
  (max, s) => (s.documentRequirements.length > max.documentRequirements.length ? s : max),
  result.schemes[0]
);

console.log(`[Max Eligibility Items] Count: ${maxEligibilityScheme.eligibilityRawText.length} items`);
console.log(`Scheme: "${maxEligibilityScheme.name}" (${maxEligibilityScheme.sourceUrl})`);
console.log(JSON.stringify(maxEligibilityScheme, null, 2));
console.log('\n');

console.log(`[Max Document Requirements] Count: ${maxDocsScheme.documentRequirements.length} items`);
console.log(`Scheme: "${maxDocsScheme.name}" (${maxDocsScheme.sourceUrl})`);
console.log(JSON.stringify(maxDocsScheme, null, 2));
console.log('\n');

console.log('================================================================================');
console.log(' SECTION 6: TARGETED VERIFICATION: PMFMPE & MEGHALAYA DAIRY (OVERFLOW-SPLITTING)');
console.log('================================================================================\n');

const targetedUrls = [
  'https://www.myscheme.gov.in/schemes/pmfmpe',
  'https://www.myscheme.gov.in/schemes/mdds',
];

for (const url of targetedUrls) {
  const scheme = result.schemes.find((s) => s.sourceUrl === url);
  if (scheme) {
    console.log(`--- [Targeted Verification] "${scheme.name}" (${scheme.sourceUrl}) ---`);
    console.log(`Benefits count: ${scheme.benefits.length} | Eligibility items count: ${scheme.eligibilityRawText.length}`);
    console.log(JSON.stringify(scheme, null, 2));
    console.log('\n');
  } else {
    console.warn(`⚠️ Warning: Targeted scheme not found for URL: ${url}`);
  }
}

console.log('================================================================================');
console.log('                    EXTENDED AUDIT COMPLETE - ZERO WRITES OCCURRED              ');
console.log('================================================================================');

