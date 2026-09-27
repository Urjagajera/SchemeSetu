import { describe, it, expect } from 'vitest';
import { parseCsv, parseApplicationMode } from './csvParser.js';

const HEADER =
  'url,OFFERED BY,TITLE,tag_1,tag_2,DETAILS,benefit_1,eligibility_1,eligibility_2,MODE FOR APPLY,APPLICTION PROCESS';

describe('parseApplicationMode', () => {
  it('accepts a single valid mode', () => {
    expect(parseApplicationMode('Online')).toEqual({ modes: ['Online'], isSalvaged: false });
  });

  it('splits and accepts multiple valid modes joined by &', () => {
    const result = parseApplicationMode('Online & Offline');
    expect(result.isSalvaged).toBe(false);
    expect(result.modes.sort()).toEqual(['Offline', 'Online']);
  });

  it('deduplicates repeated modes', () => {
    const result = parseApplicationMode('Online\nOnline');
    expect(result.modes).toEqual(['Online']);
  });

  it('salvages the entire cell when any split piece is outside the known vocabulary', () => {
    const raw = 'Not eligible if already availing a similar scheme';
    const result = parseApplicationMode(raw);
    expect(result.isSalvaged).toBe(true);
    expect(result.modes).toEqual([]);
    expect(result.salvagedText).toBe(raw);
  });

  it('returns an empty, non-salvaged result for blank input', () => {
    expect(parseApplicationMode('')).toEqual({ modes: [], isSalvaged: false });
    expect(parseApplicationMode(undefined)).toEqual({ modes: [], isSalvaged: false });
  });
});

describe('parseCsv', () => {
  it('flattens a basic row into a ParsedScheme', () => {
    const csv = [
      HEADER,
      'https://www.myscheme.gov.in/schemes/apy,Ministry Of Finance,Atal Pension Yojana,Pension,Retirement,An old age income security scheme.,Guaranteed minimum pension,Age 18 to 40,Not an income tax payee,Online,Apply via bank branch',
    ].join('\n');

    const result = parseCsv(csv);

    expect(result.totalRows).toBe(1);
    const scheme = result.schemes[0];
    expect(scheme.sourceUrl).toBe('https://www.myscheme.gov.in/schemes/apy');
    expect(scheme.authorityName).toBe('Ministry Of Finance');
    expect(scheme.name).toBe('Atal Pension Yojana');
    expect(scheme.tags).toEqual(['Pension', 'Retirement']);
    expect(scheme.eligibilityRawText).toEqual(['Age 18 to 40', 'Not an income tax payee']);
    expect(scheme.applicationMode).toEqual(['Online']);
    expect(scheme.applicationProcess).toBe('Apply via bank branch');
  });

  it('splits pipe-separated overflow within a single benefit/eligibility cell', () => {
    const csv = [
      HEADER,
      'https://example.com/s,Authority,Title,,,Details,Benefit A | Benefit B,Eligibility A | Eligibility B,,Online,',
    ].join('\n');

    const scheme = parseCsv(csv).schemes[0];
    expect(scheme.benefits).toEqual(['Benefit A', 'Benefit B']);
    expect(scheme.eligibilityRawText).toEqual(['Eligibility A', 'Eligibility B']);
  });

  it('repairs mojibake in TITLE and records it in the audit trail', () => {
    const csv = [
      HEADER,
      'https://example.com/s,Authority,Womenâ€™s Empowerment Scheme,,,Details,,,,Online,',
    ].join('\n');

    const result = parseCsv(csv);
    expect(result.schemes[0].name).toBe("Women's Empowerment Scheme");
    expect(result.mojibakeModifiedRowCount).toBe(1);
    expect(result.mojibakeExamples.length).toBeGreaterThan(0);
  });

  it('salvages an invalid MODE FOR APPLY cell into eligibilityRawText instead of dropping it', () => {
    const csv = [
      HEADER,
      'https://example.com/s,Authority,Title,,,Details,,Base eligibility line,,Not eligible for repeat applicants,',
    ].join('\n');

    const result = parseCsv(csv);
    const scheme = result.schemes[0];
    expect(scheme.applicationMode).toEqual([]);
    expect(scheme.eligibilityRawText).toEqual(['Base eligibility line', 'Not eligible for repeat applicants']);
    expect(result.salvagedRowCount).toBe(1);
  });

  it('flags duplicate source URLs without dropping either row', () => {
    const csv = [
      HEADER,
      'https://example.com/dup,Authority,Title One,,,Details,,,,Online,',
      'https://example.com/dup,Authority,Title Two,,,Details,,,,Online,',
    ].join('\n');

    const result = parseCsv(csv);
    expect(result.totalRows).toBe(2);
    expect(result.duplicateLinks).toEqual(['https://example.com/dup']);
  });
});
