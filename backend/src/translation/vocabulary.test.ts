import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { hi } from './vocabulary/hi.js';
import { vocabularyFor } from './vocabulary.js';
import { LANGUAGES } from './languages.js';
import { translateTerms, renderVocabularyFile } from './vocabularyBuilder.js';
import { createTranslator } from './translator.js';
import { Llm } from './llm.js';
import { validateList } from './validate.js';

const hasHindi = (s: string) => /[ऀ-ॿ]/.test(s);

describe('the committed Hindi vocabulary', () => {
  it('has the expected size (88 names + General, 363 common tags)', () => {
    expect(Object.keys(hi.names).length).toBe(89);
    expect(Object.keys(hi.tags).length).toBe(363);
  });

  it('is real Hindi: every name has Devanagari, and a tag without any is a deliberate acronym', () => {
    for (const [en, out] of Object.entries(hi.names)) expect(hasHindi(out), `${en} -> ${out}`).toBe(true);
    const acronymOnly = Object.entries(hi.tags).filter(([, out]) => !hasHindi(out));
    // BPL, DBT, NGO, OBC, SC, ST, SHG, UPSC, UCOST, MSME... stay as acronyms; anything longer is a miss.
    for (const [en, out] of acronymOnly) expect(out, en).toMatch(/^[A-Z]{2,6}s?$/);
  });

  it('has no stray invisible or non-breaking characters', () => {
    const all = [...Object.values(hi.names), ...Object.values(hi.tags)].join('');
    expect(all).not.toMatch(/[‐-― ​-‍ ﻿]/);
  });

  it('keeps the terminology decisions made in review', () => {
    expect(hi.names['Goa']).toBe('गोवा');
    expect(hi.tags['Backward Class']).toBe('पिछड़ा वर्ग');
    expect(hi.tags['Disabled Person']).toBe('दिव्यांग व्यक्ति');
    expect(hi.tags['Worker']).toBe('श्रमिक');
  });
});

describe('vocabularyFor', () => {
  it('returns the tables for an enabled language', () => {
    const v = vocabularyFor(LANGUAGES.hi);
    expect(v.language).toBe('hi');
    expect(v.names['Ministry Of Finance']).toBe('वित्त मंत्रालय');
  });

  it('returns empty tables for English / not-enabled languages', () => {
    expect(vocabularyFor(null)).toEqual({ language: 'en', names: {}, tags: {} });
  });
});

describe('GET /api/vocabulary', () => {
  const buildApp = async () => {
    const { default: router } = await import('../routes/vocabulary.js');
    const app = express();
    app.use('/api/vocabulary', router);
    return app;
  };

  it('serves Hindi, and empty tables for English, Gujarati (not enabled) and junk', async () => {
    const app = await buildApp();
    const h = await request(app).get('/api/vocabulary?lang=hi');
    expect(h.status).toBe(200);
    expect(h.body.data.language).toBe('hi');
    expect(Object.keys(h.body.data.names).length).toBe(89);
    for (const q of ['', '?lang=en', '?lang=gu', '?lang=xx']) {
      const r = await request(app).get('/api/vocabulary' + q);
      expect(r.body.data.names).toEqual({});
      expect(r.body.data.tags).toEqual({});
    }
  });
});

describe('translateTerms', () => {
  const ok = (items: string[]) => ({ ok: true, value: items.map((x) => `हि-${x}`), model: 'm', attempts: 1 });

  it('translates in batches and records every term', async () => {
    const terms = Array.from({ length: 45 }, (_, i) => `term${i}`);
    const batches: number[] = [];
    const r = await translateTerms(terms, async (items) => {
      batches.push(items.length);
      return ok(items);
    });
    expect(batches).toEqual([20, 20, 5]);
    expect(Object.keys(r.translated)).toHaveLength(45);
    expect(r.translated['term7']).toBe('हि-term7');
    expect(r.failed).toEqual([]);
  });

  it('retries each term alone when a batch is rejected, and reports the ones that still fail', async () => {
    const calls: string[][] = [];
    const r = await translateTerms(['a', 'b', 'c'], async (items) => {
      calls.push(items);
      if (items.length > 1) return { ok: false, attempts: 2, error: 'batch rejected' };
      if (items[0] === 'b') return { ok: false, attempts: 2, error: 'still bad' };
      return ok(items);
    });
    expect(calls).toEqual([['a', 'b', 'c'], ['a'], ['b'], ['c']]);
    expect(r.translated).toEqual({ a: 'हि-a', c: 'हि-c' });
    expect(r.failed).toEqual([{ term: 'b', error: 'still bad' }]);
    expect(r.retried).toEqual(['a', 'c']);
  });

  it('treats a wrong-length answer as a failed batch', async () => {
    const r = await translateTerms(['a', 'b'], async (items) => (items.length === 2 ? { ok: true, value: ['x'], attempts: 1 } : ok(items)));
    expect(r.translated).toEqual({ a: 'हि-a', b: 'हि-b' });
  });
});

describe('vocabulary translation through the real translator', () => {
  it('passes the hint to the model and validates short labels like any list', async () => {
    const seen: string[] = [];
    const llm: Llm = async (req) => {
      seen.push(req.system);
      return { text: JSON.stringify({ items: ['वित्त मंत्रालय', 'दिल्ली'] }), finishReason: 'stop' };
    };
    const t = createTranslator({ llm, primaryModel: 'p', fallbackModel: 'f' });
    const r = await t.translateList(['Ministry Of Finance', 'Delhi'], LANGUAGES.hi, 'These are ministry names.');
    expect(r.ok).toBe(true);
    expect(seen[0]).toContain('These are ministry names.');
  });

  it('rejects labels the model left in English', () => {
    const v = validateList(['Scholarship', 'Women Empowerment'], ['Scholarship', 'Women Empowerment'], LANGUAGES.hi);
    expect(v.ok).toBe(false);
  });
});

describe('renderVocabularyFile', () => {
  it('writes sorted, valid TypeScript that a rerun can read back', () => {
    const text = renderVocabularyFile('hi', { B: 'बी', A: 'ए' }, { Z: 'ज़' });
    expect(text.indexOf('"A"')).toBeLessThan(text.indexOf('"B"'));
    expect(text).toContain('export const hi: VocabularyData');
    expect(text).toContain('"Z": "ज़",');
  });
});

vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
