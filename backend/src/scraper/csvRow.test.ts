import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { CSV_HEADER, encodeCsvField, encodeCsvRow, rowEndingOf, toColumns, toCsvValues, appendCsvRows, readCsvRecords, ScrapedScheme } from './csvRow.js';
import { schemeSlug, canonicalSchemeUrl } from './schemeUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_CSV = path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv');

const scheme = (over: Partial<ScrapedScheme> = {}): ScrapedScheme => ({
  url: 'https://www.myscheme.gov.in/schemes/new-one',
  title: 'New Scheme',
  ministry: 'Gujarat',
  tags: ['Farmer', 'Farming'],
  details: 'Details\nHelps farmers, with "quotes", commas.',
  benefits: ['₹6,000 a year'],
  eligibility: ['Must be a farmer.', 'Age\t18 or more'],
  mode: 'Online\nOffline',
  applicationProcess: 'Application Process\nOnline\nOffline\nOnline:\nApply on the portal.\nOffline:\nVisit the office.',
  documents: ['Aadhaar'],
  ...over,
});

describe('the CSV file style', () => {
  it('writing every existing row with these rules gives the same bytes as the file', () => {
    const original = fs.readFileSync(REAL_CSV);
    const rows = parse(original, { relax_column_count: false }) as string[][];
    expect(rows[0]).toEqual(CSV_HEADER);
    // CRLF rows on a Windows PC, LF rows as Git stores it and GitHub checks it out: either way, the same bytes back.
    const eol = rowEndingOf(original);
    expect(Buffer.from(rows.map((r) => encodeCsvRow(r, eol)).join(''), 'utf8').equals(original)).toBe(true);
  });

  it('reads the row ending from the file, so rows are added the same way on a PC and on GitHub', () => {
    expect(rowEndingOf(Buffer.from(encodeCsvRow(CSV_HEADER, '\r\n') + 'x\r\n'))).toBe('\r\n');
    expect(rowEndingOf(Buffer.from(encodeCsvRow(CSV_HEADER, '\n') + 'x\n'))).toBe('\n');
  });

  it('quotes a value with a comma, quote, line break or tab, and doubles quotes inside', () => {
    expect(encodeCsvField('plain text')).toBe('plain text');
    expect(encodeCsvField('a, b')).toBe('"a, b"');
    expect(encodeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(encodeCsvField('two\nlines')).toBe('"two\nlines"');
    expect(encodeCsvField('cell\tcell')).toBe('"cell\tcell"');
  });

  it('a row ends with CRLF', () => {
    expect(encodeCsvRow(['a', 'b'])).toBe('a,b\r\n');
  });
});

describe('readCsvRecords: the CSV must have exactly the expected 91 columns', () => {
  it('reads the real CSV by column name', () => {
    const records = readCsvRecords(fs.readFileSync(REAL_CSV));
    expect(records).toHaveLength(4722);
    expect(records[0]).toMatchObject({ url: 'https://www.myscheme.gov.in/schemes/sui', TITLE: 'Stand-Up India', 'OFFERED BY': 'Ministry Of Finance' });
  });

  it('refuses a file with a column missing, added or renamed', () => {
    const header = [...CSV_HEADER];
    expect(() => readCsvRecords(encodeCsvRow(header.slice(0, -1)))).toThrow(/columns/);
    expect(() => readCsvRecords(encodeCsvRow([...header, 'extra']))).toThrow(/columns/);
    header[2] = 'NAME';
    expect(() => readCsvRecords(encodeCsvRow(header))).toThrow(/columns/);
  });
});

describe('toColumns: lists in 15 columns', () => {
  it('pads a short list with empty columns and drops empty lines', () => {
    expect(toColumns(['a', '  ', 'b'], 4)).toEqual(['a', 'b', '', '']);
  });

  it('puts the rest of a long list in the last column, joined with " | ", as the CSV does', () => {
    expect(toColumns(['1', '2', '3', '4', '5'], 3)).toEqual(['1', '2', '3 | 4 | 5']);
  });
});

describe('toCsvValues: one scraped scheme as a CSV row', () => {
  it('fills the 91 columns in the header\'s order', () => {
    const v = toCsvValues(scheme());
    const at = (name: string) => v[CSV_HEADER.indexOf(name)];
    expect(v).toHaveLength(CSV_HEADER.length);
    expect(at('url')).toBe('https://www.myscheme.gov.in/schemes/new-one');
    expect(at('OFFERED BY')).toBe('Gujarat');
    expect(at('TITLE')).toBe('New Scheme');
    expect([at('tag_1'), at('tag_2'), at('tag_3')]).toEqual(['Farmer', 'Farming', '']);
    expect(at('benefit_1')).toBe('₹6,000 a year');
    expect(at('eligibility_2')).toBe('Age\t18 or more');
    expect(at('MODE FOR APPLY')).toBe('Online\nOffline');
    expect(at('')).toBe('');
    expect(at('document_requirement_1')).toBe('Aadhaar');
  });

  it('keeps at most 9 tags (the CSV has 9 tag columns)', () => {
    const v = toCsvValues(scheme({ tags: Array.from({ length: 12 }, (_, i) => `t${i}`) }));
    expect(v[CSV_HEADER.indexOf('tag_9')]).toBe('t8');
    expect(v).toHaveLength(CSV_HEADER.length);
  });

  it('reads back as the same values', () => {
    const v = toCsvValues(scheme());
    expect(parse(encodeCsvRow(CSV_HEADER) + encodeCsvRow(v))[1]).toEqual(v);
  });
});

describe('appendCsvRows: only ever adds at the end', () => {
  const tmp = path.join(os.tmpdir(), `schemesetu-append-${process.pid}.csv`);
  afterEach(() => fs.rmSync(tmp, { force: true }));

  it('adds the rows after the existing bytes, which stay exactly the same', () => {
    const existing = encodeCsvRow(CSV_HEADER) + encodeCsvRow(toCsvValues(scheme({ url: 'https://www.myscheme.gov.in/schemes/old' })));
    fs.writeFileSync(tmp, existing);
    appendCsvRows(tmp, [toCsvValues(scheme())]);
    const after = fs.readFileSync(tmp, 'utf8');
    expect(after.startsWith(existing)).toBe(true);
    const rows = parse(after, { columns: true }) as Record<string, string>[];
    expect(rows.map((r) => r.url)).toEqual(['https://www.myscheme.gov.in/schemes/old', 'https://www.myscheme.gov.in/schemes/new-one']);
  });

  it('if the existing bytes ever change while appending, the file is put back and it fails', () => {
    const existing = encodeCsvRow(CSV_HEADER) + encodeCsvRow(toCsvValues(scheme({ url: 'https://www.myscheme.gov.in/schemes/old' })));
    fs.writeFileSync(tmp, existing);
    const spy = vi.spyOn(fs, 'appendFileSync').mockImplementation((p) => fs.writeFileSync(p as string, 'damaged'));
    try {
      expect(() => appendCsvRows(tmp, [toCsvValues(scheme())])).toThrow(/restored/);
    } finally {
      spy.mockRestore();
    }
    expect(fs.readFileSync(tmp, 'utf8')).toBe(existing);
  });

  it('adds LF rows to a file with LF rows (the copy GitHub checks out)', () => {
    const existing = encodeCsvRow(CSV_HEADER, '\n') + encodeCsvRow(toCsvValues(scheme({ url: 'https://www.myscheme.gov.in/schemes/old' })), '\n');
    fs.writeFileSync(tmp, existing);
    appendCsvRows(tmp, [toCsvValues(scheme())]);
    const after = fs.readFileSync(tmp, 'utf8');
    expect(after).toBe(existing + encodeCsvRow(toCsvValues(scheme()), '\n'));
    expect(after).not.toContain('\r');
  });

  it('refuses a file with another header, and writes nothing', () => {
    fs.writeFileSync(tmp, 'url,TITLE\r\nx,y\r\n');
    expect(() => appendCsvRows(tmp, [toCsvValues(scheme())])).toThrow(/header/);
    expect(fs.readFileSync(tmp, 'utf8')).toBe('url,TITLE\r\nx,y\r\n');
  });

  it('refuses a file whose last row has no row break, and writes nothing', () => {
    const cut = encodeCsvRow(CSV_HEADER) + 'half a row';
    fs.writeFileSync(tmp, cut);
    expect(() => appendCsvRows(tmp, [toCsvValues(scheme())])).toThrow(/row break/);
    expect(fs.readFileSync(tmp, 'utf8')).toBe(cut);
  });
});

describe('scheme links: one spelling per scheme', () => {
  it('http/https, www, trailing slash, case, ?query and #part all give the same link', () => {
    for (const u of [
      'https://www.myscheme.gov.in/schemes/sui',
      'http://myscheme.gov.in/schemes/SUI/',
      'https://www.myscheme.gov.in/schemes/sui?lang=hi#details',
      '/schemes/sui',
    ]) expect(canonicalSchemeUrl(u), u).toBe('https://www.myscheme.gov.in/schemes/sui');
  });

  it('is null for anything that is not a myScheme scheme page', () => {
    expect(schemeSlug('https://www.myscheme.gov.in/search')).toBeNull();
    expect(schemeSlug('https://example.com/schemes/sui')).toBeNull();
    expect(schemeSlug('https://www.myscheme.gov.in/schemes/sui/extra')).toBeNull();
    expect(schemeSlug('not a url at all ::')).toBeNull();
  });

  it('every link in the CSV is a scheme page, and no two are the same scheme', () => {
    const rows = parse(fs.readFileSync(REAL_CSV), { columns: true }) as Record<string, string>[];
    const urls = rows.map((r) => canonicalSchemeUrl(r.url));
    expect(urls.every(Boolean)).toBe(true);
    expect(new Set(urls).size).toBe(rows.length);
  });
});
