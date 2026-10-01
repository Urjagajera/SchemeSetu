import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTranslationService, StoredRow, TranslationDb, FieldTranslator } from './service.js';
import { LANGUAGES } from './languages.js';
import { SchemeSource } from './fields.js';

const hi = LANGUAGES.hi;

function scheme(over: Partial<SchemeSource> = {}): SchemeSource {
  return {
    id: 's1',
    name: 'Stand-Up India',
    description: 'A scheme for entrepreneurs.',
    benefits: ['Loan between 10 lakh and 1 crore'],
    eligibilityRawText: ['The applicant should be at least 18 years old'],
    documentRequirements: ['Aadhaar Card'],
    applicationProcess: 'Step 1: Apply online',
    ...over,
  };
}

/** An in-memory stand-in for the SchemeTranslation table. */
function fakeDb(clock: { t: number }) {
  const rows = new Map<string, StoredRow & { schemeId: string; languageCode: string; model: string | null; attempts: number; error: string | null }>();
  const db: TranslationDb = {
    schemeTranslation: {
      findMany: async ({ where }) => [...rows.values()].filter((r) => r.schemeId === where.schemeId && r.languageCode === where.languageCode),
      upsert: async ({ where, create, update }) => {
        const k = `${where.schemeId_languageCode_field.schemeId}:${where.schemeId_languageCode_field.languageCode}:${where.schemeId_languageCode_field.field}`;
        const existing = rows.get(k);
        const next = { ...(existing ?? (create as never)), ...(existing ? update : create), updatedAt: new Date(clock.t) } as never;
        rows.set(k, next);
        return next;
      },
    },
  };
  return { db, rows };
}

function fakeTranslator(failFields: string[] = []) {
  const calls: string[] = [];
  const t: FieldTranslator = {
    translateText: vi.fn(async (source: string) => {
      calls.push(`text:${source.slice(0, 12)}`);
      if (failFields.some((f) => source.includes(f))) return { ok: false, attempts: 2, error: 'both models returned English' };
      return { ok: true, value: `HI(${source})`, model: 'primary', attempts: 1 };
    }),
    translateList: vi.fn(async (source: string[]) => {
      calls.push(`list:${source[0].slice(0, 12)}`);
      return { ok: true, value: source.map((s) => `HI(${s})`), model: 'primary', attempts: 1 };
    }),
  };
  return { t, calls };
}

describe('createTranslationService', () => {
  const clock = { t: 1_000_000 };
  beforeEach(() => {
    clock.t = 1_000_000;
  });

  it('first view returns pending immediately, the job fills the cache, the second view is served from it', async () => {
    const { db, rows } = fakeDb(clock);
    const { t } = fakeTranslator();
    const svc = createTranslationService({ db, translator: t, now: () => clock.t });
    const s = scheme();

    const first = await svc.getForView(s, hi);
    expect(first.status).toBe('pending');
    expect(first.fields).toEqual({}); // nothing yet: the client keeps showing English
    expect(first.pendingFields.sort()).toEqual(['applicationProcess', 'benefits', 'description', 'documents', 'eligibility', 'title']);

    await svc.idle(s.id, 'hi');
    expect(rows.size).toBe(6);

    const second = await svc.getForView(s, hi);
    expect(second.status).toBe('ready');
    expect(second.fields.title).toBe('HI(Stand-Up India)');
    expect(second.fields.benefits).toEqual(['HI(Loan between 10 lakh and 1 crore)']);
    expect(second.pendingFields).toEqual([]);
    // served from the table: the model was not called again
    expect(t.translateText).toHaveBeenCalledTimes(3);
    expect(t.translateList).toHaveBeenCalledTimes(3);
  });

  it('does not translate the same scheme twice when it is viewed again while the job is still running', async () => {
    const { db } = fakeDb(clock);
    const { t } = fakeTranslator();
    const svc = createTranslationService({ db, translator: t, now: () => clock.t });
    const s = scheme();
    const [a, b] = await Promise.all([svc.getForView(s, hi), svc.getForView(s, hi)]);
    const c = await svc.getForView(s, hi);
    expect([a.status, b.status, c.status]).toEqual(['pending', 'pending', 'pending']);
    await svc.idle(s.id, 'hi');
    expect(t.translateText).toHaveBeenCalledTimes(3); // not 6 or 9
  });

  it('stores fields as they finish, so a later view shows the finished ones while others are still pending', async () => {
    const { db } = fakeDb(clock);
    let releaseDescription!: () => void;
    const gate = new Promise<void>((resolve) => (releaseDescription = resolve));
    const t: FieldTranslator = {
      translateText: async (source) => {
        if (source.startsWith('A scheme')) await gate;
        return { ok: true, value: `HI(${source})`, model: 'm', attempts: 1 };
      },
      translateList: async (source) => ({ ok: true, value: source.map((x) => `HI(${x})`), model: 'm', attempts: 1 }),
    };
    const svc = createTranslationService({ db, translator: t, now: () => clock.t });
    const s = scheme();
    await svc.getForView(s, hi);
    await new Promise((r) => setTimeout(r, 20)); // let the fast fields finish
    const mid = await svc.getForView(s, hi);
    expect(mid.status).toBe('pending');
    expect(mid.fields.title).toBe('HI(Stand-Up India)');
    expect(mid.pendingFields).toEqual(['description']);
    releaseDescription();
    await svc.idle(s.id, 'hi');
    expect((await svc.getForView(s, hi)).status).toBe('ready');
  });

  it('keeps a field in English when both models failed, and does not retry it on every page load', async () => {
    const { db } = fakeDb(clock);
    const { t } = fakeTranslator(['Step 1']);
    const svc = createTranslationService({ db, translator: t, now: () => clock.t, failedRetryAfterMs: 600_000 });
    const s = scheme();
    await svc.getForView(s, hi);
    await svc.idle(s.id, 'hi');

    const view = await svc.getForView(s, hi);
    expect(view.status).toBe('partial');
    expect(view.failedFields).toEqual(['applicationProcess']);
    expect(view.fields.applicationProcess).toBeUndefined(); // stays English
    expect(view.fields.title).toBeDefined();

    clock.t += 60_000; // one minute later: still inside the cool-down
    await svc.getForView(s, hi);
    await svc.idle(s.id, 'hi');
    expect(t.translateText).toHaveBeenCalledTimes(3); // title, description, process: no second try

    clock.t += 600_000; // cool-down over
    const retry = await svc.getForView(s, hi);
    expect(retry.status).toBe('pending');
    expect(retry.pendingFields).toEqual(['applicationProcess']);
    await svc.idle(s.id, 'hi');
    expect(t.translateText).toHaveBeenCalledTimes(4); // only the failed field was retried
  });

  it('re-translates only the field whose English text changed', async () => {
    const { db } = fakeDb(clock);
    const { t } = fakeTranslator();
    const svc = createTranslationService({ db, translator: t, now: () => clock.t });
    await svc.getForView(scheme(), hi);
    await svc.idle('s1', 'hi');
    (t.translateText as ReturnType<typeof vi.fn>).mockClear();
    (t.translateList as ReturnType<typeof vi.fn>).mockClear();

    const edited = scheme({ description: 'A scheme for women entrepreneurs.' });
    const view = await svc.getForView(edited, hi);
    expect(view.status).toBe('pending');
    expect(view.pendingFields).toEqual(['description']);
    await svc.idle('s1', 'hi');
    expect(t.translateText).toHaveBeenCalledTimes(1);
    expect(t.translateList).not.toHaveBeenCalled();
    expect((await svc.getForView(edited, hi)).fields.description).toBe('HI(A scheme for women entrepreneurs.)');
  });

  it('skips fields that have no text instead of treating them as missing', async () => {
    const { db, rows } = fakeDb(clock);
    const { t } = fakeTranslator();
    const svc = createTranslationService({ db, translator: t, now: () => clock.t });
    const s = scheme({ applicationProcess: null, documentRequirements: [], benefits: [] });
    const first = await svc.getForView(s, hi);
    expect(first.pendingFields.sort()).toEqual(['description', 'eligibility', 'title']);
    await svc.idle(s.id, 'hi');
    expect(rows.size).toBe(3);
    expect((await svc.getForView(s, hi)).status).toBe('ready');
  });

  it('reports "unavailable" without a translator, but still serves what is already stored', async () => {
    const { db } = fakeDb(clock);
    const warm = createTranslationService({ db, translator: fakeTranslator().t, now: () => clock.t });
    await warm.getForView(scheme(), hi);
    await warm.idle('s1', 'hi');

    const cold = createTranslationService({ db, translator: null, now: () => clock.t });
    const cached = await cold.getForView(scheme(), hi);
    expect(cached.status).toBe('ready');
    expect(cached.fields.title).toBe('HI(Stand-Up India)');

    const fresh = await cold.getForView(scheme({ id: 'other' }), hi);
    expect(fresh.status).toBe('unavailable');
    expect(fresh.pendingFields).toEqual([]);
    expect(fresh.fields).toEqual({});
  });

  it('survives a translator that throws and a database that refuses the write', async () => {
    const { db } = fakeDb(clock);
    const boom: FieldTranslator = {
      translateText: async () => {
        throw new Error('network down');
      },
      translateList: async () => ({ ok: true, value: ['x'], model: 'm', attempts: 1 }),
    };
    const log = vi.fn();
    const svc = createTranslationService({ db, translator: boom, now: () => clock.t, log });
    await svc.getForView(scheme(), hi);
    await svc.idle('s1', 'hi');
    const view = await svc.getForView(scheme(), hi);
    expect(view.failedFields).toEqual(expect.arrayContaining(['title', 'description', 'applicationProcess']));

    const brokenDb: TranslationDb = {
      schemeTranslation: { findMany: async () => [], upsert: async () => Promise.reject(new Error('db write failed')) },
    };
    const svc2 = createTranslationService({ db: brokenDb, translator: fakeTranslator().t, log });
    await svc2.getForView(scheme(), hi);
    await expect(svc2.idle('s1', 'hi')).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/could not store/), expect.anything());
  });
});
