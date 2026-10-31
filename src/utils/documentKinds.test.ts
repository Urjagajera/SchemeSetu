import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DOCUMENT_KINDS, kindsInLine, isHeadingLine, isFillerLine } from './documentKinds';

// Every line here is copied from the scheme data, so the patterns are checked against how lists are really written.
describe('kindsInLine: recognises common documents however the list spells them', () => {
  it.each([
    ['Aadhaar Card.', ['aadhaar']],
    ['Aadhar card (Upload document both sides in a single page) (max size 150 KB, pdf file only)', ['aadhaar']],
    ["Applicant's Aadhaar Number", ['aadhaar']],
    ['5. First Page of Bank Passbook/Cancelled Cheque', ['bank']],
    ['Copy of 1st Page of Bank Pass Book.', ['bank']],
    ['Barcoded Ration Card (if applicable)', ['ration']],
    ['Income certificate (₹6 lakh or less)', ['income']],
    ["Proof of income of the bride's father from competent authority", ['income']],
    ['Caste Certificate (ST)', ['caste']],
    ['Local residence certificate of Chhattisgarh.', ['domicile']],
    ['Domicile Certificate of the recruited employees.', ['domicile']],
    ['Recent colour passport-size photograph', ['photo']],
    ['Birth Certificate (for minor applicants, if applicable)', ['age']],
    ['UDID (Unique Disability ID) Card.', ['disability']],
    ['10th and 12th mark sheet.', ['marksheet']],
    ['Marks Memo.', ['marksheet']],
    ['PAN Card of Applicant', ['pan']],
    ['Permanent Account Number', ['pan']],
    ['Identity proof (Aadhaar Card, Voter ID, or Driving Licence)', ['aadhaar', 'voter']],
  ])('"%s"', (line, kinds) => {
    expect(kindsInLine(line)).toEqual(kinds);
  });

  it.each([
    ['Jan Aadhaar Card', 'Rajasthan\'s family card is not an Aadhaar card'],
    ['8. Udyog Aadhaar.', 'a business registration is not an Aadhaar card'],
    ['17. Photo of the existing unit', 'a photo of a building is not a photo of the person'],
    ['Copy of Photo Id proof (Driving Licence/ Passport etc.).', 'a photo ID is not a photograph'],
    ['Copy of tractor registration certificate (R.C.) (mandatory for tractor-driven equipment).', 'names no common document'],
    ['Company Panel letter', '"Panel" is not PAN'],
  ])('"%s" is not mistaken (%s)', (line) => {
    expect(kindsInLine(line)).not.toContain(line.includes('Photo') ? 'photo' : line.includes('Panel') ? 'pan' : 'aadhaar');
    if (line.startsWith('Copy of tractor')) expect(kindsInLine(line)).toEqual([]);
  });

  it('a line naming both Jan Aadhaar and Aadhaar still counts as Aadhaar', () => {
    expect(kindsInLine('Aadhar Card / Jan Aadhar Card,')).toEqual(['aadhaar']);
  });
});

describe('headings and catch-all lines', () => {
  it('a line ending in a colon is a heading', () => {
    expect(isHeadingLine('For the Application of the Welfare Scheme:')).toBe(true);
    expect(isHeadingLine('Aadhaar Card')).toBe(false);
  });

  it.each(['Any other documents as required', '19.\tAny other documents as required', 'Other supporting document(s).', 'Any other document.'])(
    '"%s" is a catch-all',
    (line) => expect(isFillerLine(line)).toBe(true),
  );

  it.each(['Income certificate (if required)', 'Any other relevant certificate. (Marriage/caste/handicap/widow).', 'Aadhaar Card'])(
    '"%s" is a real document, not a catch-all',
    (line) => expect(isFillerLine(line)).toBe(false),
  );
});

describe('the list of kinds', () => {
  it('has the same keys as the server, which only accepts these', () => {
    const backend = fs.readFileSync(path.resolve(__dirname, '../../backend/src/utils/documentKinds.ts'), 'utf8');
    const serverKeys = [...backend.slice(backend.indexOf('DOCUMENT_KINDS = [')).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(DOCUMENT_KINDS.map((k) => k.key)).toEqual(serverKeys);
  });

  it('every kind has a label in English, Hindi and Gujarati', () => {
    for (const lang of ['en', 'hi', 'gu']) {
      const dict = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../locales/${lang}.json`), 'utf8'));
      for (const k of DOCUMENT_KINDS) expect(dict[k.label], `${lang} ${k.label}`).toBeTruthy();
    }
  });
});
