import fs from 'fs';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';

/**
 * Writing new rows into backend/data/final_data_without_process_mode_.csv in the file's own style.
 *
 * The style, checked against all 4,723 lines of the file (rewriting them with these rules gives the same bytes):
 *   - a value is put in double quotes when it holds a comma, a double quote, a line break or a TAB; a quote inside
 *     is doubled;
 *   - line breaks inside a value are LF; a row ends with CRLF in the Windows working copy and with LF in the copy
 *     Git stores (and GitHub's machines check out), so the row ending is read from the file, never assumed.
 * Rows are only ever APPENDED: the existing bytes are never rewritten, and that is checked after every write.
 */

export const LIST_COLUMNS = 15; // benefit_1..15, eligibility_1..15, document_requirement_1..15
export const TAG_COLUMNS = 9;

/** Empty, unnamed columns at the end of every row (never holding data), kept so new rows have the same 91 columns. */
const TRAILING_EMPTY_COLUMNS = 30;

/** The header, exactly as in the file: 91 columns, 31 of them with an empty name. */
export const CSV_HEADER: readonly string[] = [
  'url',
  'OFFERED BY',
  'TITLE',
  ...Array.from({ length: TAG_COLUMNS }, (_, i) => `tag_${i + 1}`),
  'DETAILS',
  ...Array.from({ length: LIST_COLUMNS }, (_, i) => `benefit_${i + 1}`),
  ...Array.from({ length: LIST_COLUMNS }, (_, i) => `eligibility_${i + 1}`),
  'MODE FOR APPLY',
  'APPLICTION PROCESS',
  '',
  ...Array.from({ length: LIST_COLUMNS }, (_, i) => `document_requirement_${i + 1}`),
  ...Array<string>(TRAILING_EMPTY_COLUMNS).fill(''),
];

/** What the scraper read from one scheme page, before it becomes a CSV row. */
export interface ScrapedScheme {
  url: string;
  title: string;
  ministry: string;
  tags: string[];
  /** "Details\n" + the section's lines, as the CSV writes it. */
  details: string;
  benefits: string[];
  eligibility: string[];
  /** The ways to apply, one per line ("Online\nOffline"). */
  mode: string;
  /** "Application Process\n" + ways to apply + steps, as the CSV writes it. */
  applicationProcess: string;
  documents: string[];
}

export function encodeCsvField(value: string): string {
  return /[,"\n\r\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export type RowEnding = '\r\n' | '\n';

export const encodeCsvRow = (values: readonly string[], eol: RowEnding = '\r\n'): string => values.map(encodeCsvField).join(',') + eol;

/** The row ending the file uses, read from the end of its header line. */
export function rowEndingOf(file: Buffer): RowEnding {
  const headerLength = Buffer.byteLength(encodeCsvRow(CSV_HEADER, '\n'));
  return file.subarray(headerLength - 1, headerLength + 1).equals(Buffer.from('\r\n')) ? '\r\n' : '\n';
}

/** A list in N columns; when it is longer, the last column holds the rest joined with " | " (as the CSV does). */
export function toColumns(list: readonly string[], n = LIST_COLUMNS): string[] {
  const clean = list.map((s) => s.trim()).filter(Boolean);
  if (clean.length <= n) return [...clean, ...Array<string>(n - clean.length).fill('')];
  return [...clean.slice(0, n - 1), clean.slice(n - 1).join(' | ')];
}

/** Reads the CSV as records by column name. Throws unless its header is exactly CSV_HEADER (all 91 columns). */
export function readCsvRecords(text: string | Buffer): Record<string, string>[] {
  const rows = parse(text, { relax_column_count: false }) as string[][];
  const header = rows[0] ?? [];
  if (header.length !== CSV_HEADER.length || header.some((h, i) => h !== CSV_HEADER[i])) throw new Error('the CSV columns are not the expected ones; stopping');
  // Named columns only (the empty-named ones never hold data).
  const named = CSV_HEADER.map((name, i) => [name, i] as const).filter(([name]) => name !== '');
  return rows.slice(1).map((r) => Object.fromEntries(named.map(([name, i]) => [name, r[i]])));
}

/** The 91 values of a CSV row, in the header's order. Tags beyond the 9 columns are dropped. */
export function toCsvValues(s: ScrapedScheme): string[] {
  const tags = s.tags.slice(0, TAG_COLUMNS);
  const values = [
    s.url,
    s.ministry,
    s.title,
    ...tags,
    ...Array<string>(TAG_COLUMNS - tags.length).fill(''),
    s.details,
    ...toColumns(s.benefits),
    ...toColumns(s.eligibility),
    s.mode,
    s.applicationProcess,
    '',
    ...toColumns(s.documents),
    ...Array<string>(TRAILING_EMPTY_COLUMNS).fill(''),
  ];
  if (values.length !== CSV_HEADER.length) throw new Error(`a row must have ${CSV_HEADER.length} values, got ${values.length}`);
  return values;
}

const sha256 = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Appends rows to the CSV. Refuses when the file's header is not the expected one or it does not end with a row
 * break, and checks afterwards that every existing byte is still the same; if not, the file is restored and it throws.
 */
/** Throws when rows cannot safely be appended: an unexpected header, or a last row without its row break. */
export function checkAppendable(csvPath: string): { before: Buffer; eol: RowEnding } {
  const before = fs.readFileSync(csvPath);
  const eol = rowEndingOf(before);
  const header = encodeCsvRow(CSV_HEADER, eol);
  if (!before.subarray(0, Buffer.byteLength(header)).equals(Buffer.from(header))) throw new Error('the CSV header is not the expected one; nothing was written');
  if (!before.subarray(-eol.length).equals(Buffer.from(eol))) throw new Error('the CSV does not end with a row break; nothing was written');
  return { before, eol };
}

export function appendCsvRows(csvPath: string, rows: readonly (readonly string[])[]): void {
  if (rows.length === 0) return;
  const { before, eol } = checkAppendable(csvPath);
  const beforeHash = sha256(before);
  fs.appendFileSync(csvPath, rows.map((r) => encodeCsvRow(r, eol)).join(''), 'utf8');
  const after = fs.readFileSync(csvPath);
  if (sha256(after.subarray(0, before.length)) !== beforeHash) {
    fs.writeFileSync(csvPath, before);
    throw new Error('existing CSV bytes changed while appending; the file was restored');
  }
}
