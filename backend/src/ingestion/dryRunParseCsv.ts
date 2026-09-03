/**
 * dryRunParseCsv.ts
 * Entrypoint script for dry-run verification of the CSV parsing utility.
 * Reads the dataset, transforms rows into normalized in-memory objects,
 * logs audit counts and samples, and outputs first 5 parsed records as formatted JSON.
 *
 * CRITICAL CONSTRAINT: ZERO DATABASE WRITES, ZERO PRISMA CALLS, CONSOLE ONLY.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseCsvFile } from './csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target CSV path: backend/data/final_data_without_process_mode_.csv
const csvPath = path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv');

console.log('================================================================================');
console.log('                 SCHEMESETU CSV PARSER - DRY RUN AUDIT                          ');
console.log('================================================================================\n');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ ERROR: CSV file not found at expected path:\n  ${csvPath}`);
  process.exit(1);
}

console.log(`Loading dataset from: ${csvPath}\n`);
const startTime = Date.now();
const result = parseCsvFile(csvPath);
const elapsedMs = Date.now() - startTime;

console.log('--------------------------------------------------------------------------------');
console.log(' 1. GENERAL PROCESSING SUMMARY');
console.log('--------------------------------------------------------------------------------');
console.log(`Total rows processed:         ${result.totalRows}`);
console.log(`Parse execution time:         ${elapsedMs} ms\n`);

console.log('--------------------------------------------------------------------------------');
console.log(' 2. MOJIBAKE ENCODING REPAIR AUDIT');
console.log('--------------------------------------------------------------------------------');
console.log(`Rows modified by mojibake repair: ${result.mojibakeModifiedRowCount}`);
console.log('\nSample Before / After Mojibake Repairs (First 2):');
result.mojibakeExamples.forEach((ex, idx) => {
  console.log(`\n[Example ${idx + 1}] Field: ${ex.field}`);
  console.log(`  BEFORE: ${JSON.stringify(ex.before)}`);
  console.log(`  AFTER : ${JSON.stringify(ex.after)}`);
});

console.log('\n--------------------------------------------------------------------------------');
console.log(' 3. APPLICATION MODE & MISPLACED EXCLUSIONS SALVAGE AUDIT');
console.log('--------------------------------------------------------------------------------');
console.log(`Rows with salvaged applicationMode: ${result.salvagedRowCount}`);
console.log('\nSample Salvaged Rows (First 2):');
result.salvageExamples.forEach((ex, idx) => {
  console.log(`\n[Salvage Sample ${idx + 1}] Scheme Link: ${ex.link}`);
  console.log(`  Original Cell Content in 'MODE FOR APPLY':`);
  console.log(`    ${JSON.stringify(ex.originalModeText)}`);
  console.log(`  Resulting applicationMode:`);
  console.log(`    ${JSON.stringify(ex.resultingApplicationMode)}`);
  console.log(`  Appended to eligibilityRawText:`);
  console.log(`    ${JSON.stringify(ex.salvagedTextAppended)}`);
});

console.log('\n--------------------------------------------------------------------------------');
console.log(' 4. MERGE KEY (LINK / URL) UNIQUENESS VERIFICATION');
console.log('--------------------------------------------------------------------------------');
if (result.duplicateLinks.length === 0) {
  console.log(`✅ CONFIRMED: Zero duplicate link values found across all ${result.totalRows} rows.`);
} else {
  console.error(`❌ WARNING: Found ${result.duplicateLinks.length} duplicate link values:`);
  result.duplicateLinks.forEach((dup) => console.error(`  - ${dup}`));
}

console.log('\n--------------------------------------------------------------------------------');
console.log(' 5. FIRST 5 PARSED ROWS AS FORMATTED JSON');
console.log('--------------------------------------------------------------------------------');
console.log(JSON.stringify(result.schemes.slice(0, 5), null, 2));

console.log('\n================================================================================');
console.log('                    DRY RUN COMPLETE - ZERO WRITES OCCURRED                     ');
console.log('================================================================================');
