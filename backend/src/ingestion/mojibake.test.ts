import { describe, it, expect } from 'vitest';
import { repairMojibake } from './mojibake.js';

// Mojibake artifacts are specific corrupted byte sequences (UTF-8 read as
// Latin-1/Windows-1252), not just "any dash-ish character" — so every input
// below is built from explicit code points rather than hand-typed punctuation,
// to avoid silently testing the wrong (merely lookalike) character.
const RUPEE_MOJIBAKE = 'â‚¹'; // â‚¹
const RIGHT_SINGLE_QUOTE_MOJIBAKE = 'â€™'; // â€™
const LEFT_SINGLE_QUOTE_MOJIBAKE = 'â€˜'; // â€˜
const LEFT_DOUBLE_QUOTE_MOJIBAKE = 'â€œ'; // â€œ
const RIGHT_DOUBLE_QUOTE_MOJIBAKE = 'â€\u009d'; // â€\u009d
const EM_DASH_MOJIBAKE = 'â€”'; // â€”
const EN_DASH_MOJIBAKE = 'â€“'; // â€“
const ELLIPSIS_MOJIBAKE = 'â€¦'; // â€¦
const BOM_AS_LATIN1_MOJIBAKE = 'ï»¿'; // ï»¿

describe('repairMojibake', () => {
  it('repairs the rupee symbol corruption', () => {
    expect(repairMojibake(`${RUPEE_MOJIBAKE}50,000`)).toBe('₹50,000');
  });

  it('repairs single-quote corruption', () => {
    expect(repairMojibake(`applicant${RIGHT_SINGLE_QUOTE_MOJIBAKE}s income`)).toBe("applicant's income");
    expect(repairMojibake(`${LEFT_SINGLE_QUOTE_MOJIBAKE}quoted${RIGHT_SINGLE_QUOTE_MOJIBAKE}`)).toBe("'quoted'");
  });

  it('repairs double-quote corruption', () => {
    expect(repairMojibake(`${LEFT_DOUBLE_QUOTE_MOJIBAKE}quoted${RIGHT_DOUBLE_QUOTE_MOJIBAKE}`)).toBe('“quoted”');
  });

  it('repairs em-dash, en-dash, and ellipsis corruption', () => {
    expect(repairMojibake(`one ${EM_DASH_MOJIBAKE} two`)).toBe('one — two');
    expect(repairMojibake(`one ${EN_DASH_MOJIBAKE} two`)).toBe('one – two');
    expect(repairMojibake(`wait${ELLIPSIS_MOJIBAKE}`)).toBe('wait…');
  });

  it('strips a stray UTF-8 BOM read as Latin-1', () => {
    expect(repairMojibake(`${BOM_AS_LATIN1_MOJIBAKE}Scheme Title`)).toBe('Scheme Title');
  });

  it('strips a mid-text zero-width BOM', () => {
    expect(repairMojibake('Scheme﻿Title')).toBe('SchemeTitle');
  });

  it('leaves clean text untouched', () => {
    const clean = 'Atal Pension Yojana - for citizens aged 18-40.';
    expect(repairMojibake(clean)).toBe(clean);
  });

  it('handles empty and non-string input without throwing', () => {
    expect(repairMojibake('')).toBe('');
    expect(repairMojibake(null as unknown as string)).toBe('');
    expect(repairMojibake(undefined as unknown as string)).toBe('');
  });
});
