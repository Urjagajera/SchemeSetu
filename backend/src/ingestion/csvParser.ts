/**
 * csvParser.ts
 * Core CSV parsing and flattening logic for SchemeSetu dataset.
 * RFC4180-compliant, handles multi-line quoted cells, column flattening,
 * mojibake repair, and applicationMode normalization/salvaging.
 *
 * PURE UTILITY — NO SIDE EFFECTS, NO DATABASE WRITES.
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { repairMojibake } from './mojibake.js';

export const VALID_APPLICATION_MODES = ['Online', 'Offline', 'Online - Via CSCs'] as const;
export type ApplicationMode = (typeof VALID_APPLICATION_MODES)[number];

export interface ParsedScheme {
  link: string;
  offeredBy: string;
  title: string;
  tags: string[];
  details: string;
  benefits: string[];
  eligibilityRawText: string[];
  applicationMode: string[];
  applicationProcess: string | null;
  documentRequirements: string[];
}

export interface MojibakeAuditEntry {
  field: string;
  before: string;
  after: string;
}

export interface SalvageAuditEntry {
  link: string;
  originalModeText: string;
  resultingApplicationMode: string[];
  salvagedTextAppended: string;
}

export interface ParseResult {
  schemes: ParsedScheme[];
  totalRows: number;
  mojibakeModifiedRowCount: number;
  mojibakeExamples: MojibakeAuditEntry[];
  salvagedRowCount: number;
  salvageExamples: SalvageAuditEntry[];
  duplicateLinks: string[];
}

export interface ApplicationModeParseResult {
  modes: string[];
  isSalvaged: boolean;
  salvagedText?: string;
}

/**
 * Normalizes and validates the raw MODE FOR APPLY cell value.
 *
 * Vocabulary: "Online", "Offline", "Online - Via CSCs"
 * Multiple values separated by newlines or "&" are split and normalized into atomic mode strings.
 *
 * If any split piece falls outside the known vocabulary, the ENTIRE original cell
 * is treated as misplaced exclusion text and salvaged to eligibilityRawText.
 */
export function parseApplicationMode(raw: string | undefined | null): ApplicationModeParseResult {
  if (!raw) {
    return { modes: [], isSalvaged: false };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { modes: [], isSalvaged: false };
  }

  // Split on newlines and '&'
  const parts = trimmed
    .split(/[\r\n&]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { modes: [], isSalvaged: false };
  }

  const vocabulary = new Set<string>(VALID_APPLICATION_MODES);
  const allValid = parts.every((part) => vocabulary.has(part));

  if (!allValid) {
    return {
      modes: [],
      isSalvaged: true,
      salvagedText: trimmed,
    };
  }

  // Return deduplicated array preserving order
  return {
    modes: Array.from(new Set(parts)),
    isSalvaged: false,
  };
}

/**
 * Flattens numbered columns (e.g. tag_1..tag_9, benefit_1..benefit_15) into an ordered array,
 * skipping empty cells and applying mojibake repair.
 *
 * Optionally splits cells on " | " for overflow handling (benefits, document requirements, eligibility).
 */
function extractNumberedColumns(
  row: Record<string, string>,
  prefix: string,
  start: number,
  end: number,
  splitPipe: boolean = false,
  onMojibakeDetected?: (key: string, before: string, after: string) => void
): string[] {
  const result: string[] = [];

  for (let i = start; i <= end; i++) {
    const key = `${prefix}${i}`;
    const rawVal = row[key];
    if (!rawVal) continue;

    const repaired = repairMojibake(rawVal);
    if (repaired !== rawVal && onMojibakeDetected) {
      onMojibakeDetected(key, rawVal, repaired);
    }

    if (splitPipe && repaired.includes(' | ')) {
      const items = repaired.split(' | ');
      for (const item of items) {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          result.push(trimmed);
        }
      }
    } else {
      const trimmed = repaired.trim();
      if (trimmed.length > 0) {
        result.push(trimmed);
      }
    }
  }

  return result;
}

/**
 * Parses raw CSV content into normalized ParsedScheme objects and gathers audit metadata.
 */
export function parseCsv(csvContent: string): ParseResult {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Array<Record<string, string>>;

  const schemes: ParsedScheme[] = [];
  const seenLinks = new Set<string>();
  const duplicateLinks: string[] = [];
  let mojibakeModifiedRowCount = 0;
  const mojibakeExamples: MojibakeAuditEntry[] = [];
  let salvagedRowCount = 0;
  const salvageExamples: SalvageAuditEntry[] = [];

  for (const row of records) {
    let rowHadMojibakeChange = false;

    const handleMojibake = (field: string, before: string, after: string) => {
      rowHadMojibakeChange = true;
      if (mojibakeExamples.length < 2) {
        let diffIdx = 0;
        while (diffIdx < before.length && diffIdx < after.length && before[diffIdx] === after[diffIdx]) {
          diffIdx++;
        }
        const snippetBefore = before.slice(Math.max(0, diffIdx - 25), Math.min(before.length, diffIdx + 35));
        const snippetAfter = after.slice(Math.max(0, diffIdx - 25), Math.min(after.length, diffIdx + 35));
        mojibakeExamples.push({
          field,
          before: `...${snippetBefore}...`,
          after: `...${snippetAfter}...`,
        });
      }
    };

    // Primary scalar fields
    const rawUrl = row['url'] ?? '';
    const repairedUrl = repairMojibake(rawUrl);
    if (repairedUrl !== rawUrl) handleMojibake('url', rawUrl, repairedUrl);
    const link = repairedUrl.trim();

    // Check duplicate link
    if (seenLinks.has(link)) {
      duplicateLinks.push(link);
    } else {
      seenLinks.add(link);
    }

    const rawOfferedBy = row['OFFERED BY'] ?? '';
    const repairedOfferedBy = repairMojibake(rawOfferedBy);
    if (repairedOfferedBy !== rawOfferedBy) handleMojibake('OFFERED BY', rawOfferedBy, repairedOfferedBy);
    const offeredBy = repairedOfferedBy.trim();

    const rawTitle = row['TITLE'] ?? '';
    const repairedTitle = repairMojibake(rawTitle);
    if (repairedTitle !== rawTitle) handleMojibake('TITLE', rawTitle, repairedTitle);
    const title = repairedTitle.trim();

    const rawDetails = row['DETAILS'] ?? '';
    const repairedDetails = repairMojibake(rawDetails);
    if (repairedDetails !== rawDetails) handleMojibake('DETAILS', rawDetails, repairedDetails);
    const details = repairedDetails.trim();

    const rawAppProcess = row['APPLICTION PROCESS'] ?? '';
    const repairedAppProcess = repairMojibake(rawAppProcess);
    if (repairedAppProcess !== rawAppProcess) handleMojibake('APPLICTION PROCESS', rawAppProcess, repairedAppProcess);
    const trimmedAppProcess = repairedAppProcess.trim();
    const applicationProcess = trimmedAppProcess.length > 0 ? trimmedAppProcess : null;

    // Numbered columns flattening
    const tags = extractNumberedColumns(row, 'tag_', 1, 9, false, handleMojibake);
    const benefits = extractNumberedColumns(row, 'benefit_', 1, 15, true, handleMojibake);
    const documentRequirements = extractNumberedColumns(
      row,
      'document_requirement_',
      1,
      15,
      true,
      handleMojibake
    );
    const eligibilityRawText = extractNumberedColumns(row, 'eligibility_', 1, 15, true, handleMojibake);

    // applicationMode parsing & salvage logic
    const rawMode = row['MODE FOR APPLY'] ?? '';
    const repairedMode = repairMojibake(rawMode);
    if (repairedMode !== rawMode) handleMojibake('MODE FOR APPLY', rawMode, repairedMode);

    const modeResult = parseApplicationMode(repairedMode);
    let applicationMode: string[] = [];

    if (modeResult.isSalvaged && modeResult.salvagedText) {
      salvagedRowCount++;
      applicationMode = [];
      const salvagedTextAppended = modeResult.salvagedText.trim();
      eligibilityRawText.push(salvagedTextAppended);

      if (salvageExamples.length < 2) {
        salvageExamples.push({
          link,
          originalModeText: rawMode,
          resultingApplicationMode: [],
          salvagedTextAppended,
        });
      }
    } else {
      applicationMode = modeResult.modes;
    }

    if (rowHadMojibakeChange) {
      mojibakeModifiedRowCount++;
    }

    schemes.push({
      link,
      offeredBy,
      title,
      tags,
      details,
      benefits,
      eligibilityRawText,
      applicationMode,
      applicationProcess,
      documentRequirements,
    });
  }

  return {
    schemes,
    totalRows: schemes.length,
    mojibakeModifiedRowCount,
    mojibakeExamples,
    salvagedRowCount,
    salvageExamples,
    duplicateLinks,
  };
}

/**
 * Reads a CSV file from the filesystem and runs parseCsv on its contents.
 */
export function parseCsvFile(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCsv(content);
}
