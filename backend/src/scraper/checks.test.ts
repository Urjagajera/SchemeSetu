import { describe, it, expect } from 'vitest';
import { problems, sameText, selfCheckDiffs, titleKey } from './checks.js';
import { learnRelatedTags, withRelatedTags } from './relatedTags.js';
import { renderReport, RunReport } from './report.js';
import type { ScrapedScheme } from './csvRow.js';

const scheme = (over: Partial<ScrapedScheme> = {}): ScrapedScheme => ({
  url: 'https://www.myscheme.gov.in/schemes/x',
  title: 'X Scheme',
  ministry: 'Kerala',
  tags: ['Farmer'],
  details: 'Details\nAbout it.',
  benefits: ['Money'],
  eligibility: ['Resident of Kerala.'],
  mode: 'Online',
  applicationProcess: 'Application Process\nOnline\nApply online.',
  documents: ['Aadhaar'],
  ...over,
});

describe('problems: an incomplete page is never added', () => {
  it('a complete scheme has none', () => {
    expect(problems(scheme())).toEqual([]);
  });

  it('missing title, ministry, details, eligibility or application steps each stop it', () => {
    expect(problems(scheme({ title: ' ' }))).toEqual(['no title']);
    expect(problems(scheme({ ministry: '' }))).toEqual(['no ministry or state']);
    expect(problems(scheme({ details: 'Details\n' }))).toEqual(['no details']);
    expect(problems(scheme({ eligibility: [] }))).toEqual(['no eligibility']);
    expect(problems(scheme({ applicationProcess: 'Application Process' }))).toEqual(['no application process']);
  });

  it('a way to apply the import does not know stops it (it would be stored as misplaced text)', () => {
    expect(problems(scheme({ mode: 'Online\nOffline' }))).toEqual([]);
    expect(problems(scheme({ mode: 'Online - Via CSCs' }))).toEqual([]);
    expect(problems(scheme({ mode: 'Online\nVia Post' }))).toEqual(['unknown way to apply: Via Post']);
  });

  it('a scheme with no way to apply listed is fine (464 CSV rows have none)', () => {
    expect(problems(scheme({ mode: '' }))).toEqual([]);
  });
});

describe('sameText and titleKey', () => {
  it('ignores only what a reader cannot see: spacing, invisible characters, curly quotes', () => {
    expect(sameText('Chief  Minister’s﻿\nscheme')).toBe("Chief Minister's scheme");
    expect(sameText(['a', '', 'b'])).toBe('a b');
  });

  it('two links with the same title and ministry are taken for one scheme', () => {
    expect(titleKey('Stand-Up  India', 'Ministry Of Finance')).toBe(titleKey('stand-up india', 'ministry of finance'));
    expect(titleKey('Stand-Up India', 'Gujarat')).not.toBe(titleKey('Stand-Up India', 'Ministry Of Finance'));
  });
});

describe('selfCheckDiffs: a known scheme must read the same as its CSV row', () => {
  const csv = { title: 'X Scheme', ministry: 'Kerala', details: 'About it.', eligibility: ['Resident of Kerala.', ''], documents: ['Aadhaar'] };

  it('no differences when the page matches (with or without the "Details" heading)', () => {
    expect(selfCheckDiffs(scheme(), csv)).toEqual([]);
  });

  it('names each field that changed', () => {
    expect(selfCheckDiffs(scheme({ title: 'Other', documents: [] }), csv)).toEqual(['title', 'documents']);
    expect(selfCheckDiffs(scheme({ eligibility: ['Something else'] }), csv)).toEqual(['eligibility']);
  });
});

describe('related tags', () => {
  // 10 schemes tagged Farmer that also say Farming after it; 2 with Pension then Senior Citizen (too few).
  const lists = [
    ...Array.from({ length: 10 }, () => ['Farmer', 'Agriculture', 'Farming']),
    ['Farmer', 'Loan'],
    ['Pension', 'Senior Citizen'],
    ['Pension', 'Senior Citizen'],
  ];
  const rules = learnRelatedTags(lists, 5, 0.8);

  it('learns "X brings Y" when Y follows X in most schemes tagged X', () => {
    expect(rules.get('farmer')).toEqual(['Agriculture', 'Farming']);
  });

  it('a word that often follows a tag, but in too small a share of its schemes, is not learned', () => {
    // Student x10; Hostel follows it in 5 (enough schemes, but only half of them).
    const r = learnRelatedTags([...Array.from({ length: 5 }, () => ['Student', 'Hostel']), ...Array.from({ length: 5 }, () => ['Student'])], 5, 0.8);
    expect(r.has('student')).toBe(false);
  });

  it('needs enough schemes before learning a pair', () => {
    expect(rules.has('pension')).toBe(false);
  });

  it('only words that come AFTER a tag are learned for it', () => {
    expect(rules.get('farming')).toBeUndefined();
  });

  it('puts the page tags first, then the related words, each once, at most 9', () => {
    expect(withRelatedTags(['Farmer', 'farming'], rules)).toEqual(['Farmer', 'farming', 'Agriculture']);
    expect(withRelatedTags(Array.from({ length: 9 }, (_, i) => `t${i}`).concat('Farmer'), rules)).toHaveLength(9);
  });
});

const report = (over: Partial<RunReport> = {}): RunReport => ({
  date: '2026-11-08',
  dryRun: false,
  status: 'ok',
  selfCheck: [{ url: 'u1', differs: [] }],
  siteTotal: 5154,
  listed: 5150,
  newFound: 430,
  added: [{ url: 'https://www.myscheme.gov.in/schemes/a', title: 'A', ministry: 'Goa' }],
  heldBack: [{ url: 'https://www.myscheme.gov.in/schemes/b', title: 'B', reasons: ['no eligibility'] }],
  failedToRead: [],
  gone: [{ url: 'https://www.myscheme.gov.in/schemes/c', title: 'C' }],
  goneCheckSkipped: null,
  leftForNextRun: 230,
  database: 'added by the next step (--sync-db)',
  ...over,
});

describe('the report', () => {
  it('gives the counts the commit step reads, and lists what was added, held back and gone', () => {
    const text = renderReport(report());
    expect(text).toMatch(/^- Added: 1$/m);
    expect(text).toContain('New (not in SchemeSetu): 430, 230 left for the next runs');
    expect(text).toContain('[B](https://www.myscheme.gov.in/schemes/b): no eligibility');
    expect(text).toContain('Gone from myScheme (kept in SchemeSetu)');
  });

  it('a failed self-check says nothing was written and why', () => {
    const text = renderReport(report({ status: 'stopped', selfCheck: [{ url: 'u1', differs: ['title'] }] }));
    expect(text).toContain('FAILED, so nothing was written');
    expect(text).toContain('u1: title');
    expect(text).not.toContain('Added:');
  });

  it('a dry run says so', () => {
    expect(renderReport(report({ dryRun: true }))).toContain('dry run: nothing written');
  });
});
