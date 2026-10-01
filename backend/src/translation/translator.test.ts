import { describe, it, expect, vi } from 'vitest';
import { createTranslator, splitText } from './translator.js';
import { Llm, LlmRequest, LlmResponse } from './llm.js';
import { LANGUAGES } from './languages.js';

const hi = LANGUAGES.hi;
const PRIMARY = 'primary-model';
const FALLBACK = 'fallback-model';

const EN = 'The applicant should belong to the Scheduled Caste community';
const HI = 'आवेदक को शेड्यूल्ड कास्ट समुदाय से होना चाहिए।';

/** A fake model: `script[model]` is a queue of answers (a string, a response, or an Error to throw). */
function fakeLlm(script: Record<string, Array<string | LlmResponse | Error | ((req: LlmRequest) => string)>>) {
  const calls: LlmRequest[] = [];
  const llm: Llm = async (req) => {
    calls.push(req);
    const next = script[req.model]?.shift();
    if (next === undefined) throw new Error(`no scripted answer left for ${req.model}`);
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return { text: next(req), finishReason: 'stop' };
    if (typeof next === 'string') return { text: next, finishReason: 'stop' };
    return next;
  };
  return { llm, calls };
}

const translator = (llm: Llm, extra: Partial<Parameters<typeof createTranslator>[0]> = {}) =>
  createTranslator({ llm, primaryModel: PRIMARY, fallbackModel: FALLBACK, ...extra });

describe('translateText: validated, with fallback', () => {
  it('accepts a good answer from the primary model with one call', async () => {
    const { llm, calls } = fakeLlm({ [PRIMARY]: [HI] });
    const r = await translator(llm).translateText(EN, hi);
    expect(r).toMatchObject({ ok: true, value: HI, model: PRIMARY, attempts: 1 });
    expect(calls).toHaveLength(1);
    // the output limit is set explicitly (an unset limit silently truncated long Gujarati in calibration)
    expect(calls[0]).toMatchObject({ model: PRIMARY, maxTokens: 8000, json: false, effort: 'low', user: EN });
  });

  it('catches the silent skip (English copied back) and retries on the fallback model', async () => {
    const { llm, calls } = fakeLlm({ [PRIMARY]: [EN], [FALLBACK]: [HI] });
    const onReject = vi.fn();
    const r = await translator(llm, { onReject }).translateText(EN, hi);
    expect(r).toMatchObject({ ok: true, value: HI, model: FALLBACK, attempts: 2 });
    expect(calls.map((c) => c.model)).toEqual([PRIMARY, FALLBACK]);
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ model: PRIMARY, reasons: expect.arrayContaining([expect.stringMatching(/unchanged/)]) }));
  });

  it('reports failure (so the caller keeps English) when both models fail validation', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: [EN], [FALLBACK]: [EN] });
    const r = await translator(llm).translateText(EN, hi);
    expect(r.ok).toBe(false);
    expect(r.value).toBeUndefined();
    expect(r.attempts).toBe(2);
    expect(r.error).toMatch(/primary-model: .*unchanged/);
    expect(r.error).toMatch(/fallback-model: .*unchanged/);
  });

  it('treats a cut-off answer (finish reason "length") as a failure and falls back', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: [{ text: HI.slice(0, 10), finishReason: 'length' }], [FALLBACK]: [HI] });
    const r = await translator(llm).translateText(EN, hi);
    expect(r).toMatchObject({ ok: true, model: FALLBACK });
  });

  it('falls back when the primary request itself fails (rate limit, timeout)', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: [Object.assign(new Error('rate limited'), { status: 429 })], [FALLBACK]: [HI] });
    const r = await translator(llm).translateText(EN, hi);
    expect(r).toMatchObject({ ok: true, model: FALLBACK, attempts: 2 });
  });

  it('fails cleanly when both models error out', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: [new Error('boom')], [FALLBACK]: [new Error('boom too')] });
    const r = await translator(llm).translateText(EN, hi);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/request failed/);
  });

  it('does not call the same model twice when primary and fallback are the same', async () => {
    const { llm, calls } = fakeLlm({ [PRIMARY]: [EN] });
    const r = await createTranslator({ llm, primaryModel: PRIMARY, fallbackModel: PRIMARY }).translateText(EN, hi);
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('puts a required glossary rendering in the prompt only when the term appears', async () => {
    const withTerm = 'The NGO registered with the National Trust logs in to the website.';
    const a = fakeLlm({ [PRIMARY]: ['नेशनल ट्रस्ट के साथ पंजीकृत NGO वेबसाइट पर लॉगिन करता है।'] });
    await translator(a.llm).translateText(withTerm, hi);
    expect(a.calls[0].system).toContain('"National Trust" -> "नेशनल ट्रस्ट"');

    const b = fakeLlm({ [PRIMARY]: [HI] });
    await translator(b.llm).translateText(EN, hi);
    expect(b.calls[0].system).not.toContain('National Trust');
  });

  it('rejects the literal "national faith" rendering and retries', async () => {
    const src = 'The NGO registered with the National Trust logs in to the website.';
    const literal = 'राष्ट्रीय विश्वास के साथ पंजीकृत NGO वेबसाइट पर लॉगिन करता है।';
    const fixed = 'नेशनल ट्रस्ट के साथ पंजीकृत NGO वेबसाइट पर लॉगिन करता है।';
    const { llm } = fakeLlm({ [PRIMARY]: [literal], [FALLBACK]: [fixed] });
    const r = await translator(llm).translateText(src, hi);
    expect(r).toMatchObject({ ok: true, value: fixed, model: FALLBACK });
  });
});

describe('translateText: long text is chunked and only the bad chunk is retried', () => {
  // 8 lines of ~600 characters: well over the 2,500-character chunk size.
  const filler = ' click the button on the official portal page and fill in the details'.repeat(8);
  const lines = Array.from({ length: 8 }, (_, i) => `Step ${i + 1}:${filler}`);
  const LONG = lines.join('\n');
  // A fake translation that keeps the line structure and the numbers.
  const fakeTranslate = (chunk: string) =>
    chunk
      .split('\n')
      .map((l) => `चरण ${l.match(/Step (\d+)/)![1]}: पोर्टल के आधिकारिक पेज पर बटन पर क्लिक करें और विवरण भरें ${'पोर्टल पर विवरण भरें '.repeat(14)}`)
      .join('\n');

  it('splits into several chunks that join back to the original', () => {
    const chunks = splitText(LONG);
    expect(chunks.length).toBeGreaterThan(1);
    let rebuilt = '';
    chunks.forEach((c, i) => (rebuilt += c.text + (i < chunks.length - 1 ? c.sepAfter : '')));
    expect(rebuilt).toBe(LONG);
    expect(Math.max(...chunks.map((c) => c.text.length))).toBeLessThanOrEqual(2500);
  });

  it('retries only the failing chunk on the fallback model', async () => {
    const chunkCount = splitText(LONG).length;
    // primary: good, then English copied back for the second chunk, then good again
    const primaryAnswers: Array<(r: LlmRequest) => string> = Array.from({ length: chunkCount }, (_, i) =>
      i === 1 ? (r) => r.user : (r) => fakeTranslate(r.user),
    );
    const { llm, calls } = fakeLlm({ [PRIMARY]: primaryAnswers, [FALLBACK]: [(r) => fakeTranslate(r.user)] });
    const r = await translator(llm).translateText(LONG, hi);
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(chunkCount + 1); // every chunk once, plus one retry
    expect(calls.filter((c) => c.model === FALLBACK)).toHaveLength(1);
    expect(r.model).toBe(`${PRIMARY}+${FALLBACK}`);
    expect((r.value as string).split('\n')).toHaveLength(8);
  });

  it('splits a single giant line at sentence boundaries', () => {
    const giant = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} explains what the applicant has to do next.`).join(' ');
    const chunks = splitText(giant, 500);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.text.length <= 500)).toBe(true);
    let rebuilt = '';
    chunks.forEach((c, i) => (rebuilt += c.text + (i < chunks.length - 1 ? c.sepAfter : '')));
    expect(rebuilt).toBe(giant);
  });
});

describe('translateList', () => {
  const ITEMS = ['Aadhaar Card', 'Caste Certificate (Valid for 3 years from date of issue)', 'Bank Passbook'];
  const GOOD = ['आधार कार्ड', 'जाति प्रमाणपत्र (जारी तिथि से 3 वर्ष वैध)', 'बैंक पासबुक'];

  it('asks for JSON and accepts {"items": [...]}', async () => {
    const { llm, calls } = fakeLlm({ [PRIMARY]: [JSON.stringify({ items: GOOD })] });
    const r = await translator(llm).translateList(ITEMS, hi);
    expect(r).toMatchObject({ ok: true, value: GOOD, model: PRIMARY, attempts: 1 });
    expect(calls[0].json).toBe(true);
    expect(calls[0].user).toBe(JSON.stringify(ITEMS));
    expect(calls[0].system).toContain('exactly 3 strings');
  });

  it('accepts a code-fenced answer', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: ['```json\n' + JSON.stringify({ items: GOOD }) + '\n```'] });
    expect((await translator(llm).translateList(ITEMS, hi)).ok).toBe(true);
  });

  it('falls back when the item count is wrong', async () => {
    const { llm } = fakeLlm({ [PRIMARY]: [JSON.stringify({ items: GOOD.slice(0, 2) })], [FALLBACK]: [JSON.stringify({ items: GOOD })] });
    const r = await translator(llm).translateList(ITEMS, hi);
    expect(r).toMatchObject({ ok: true, model: FALLBACK, attempts: 2 });
  });

  it('falls back when the answer is not JSON, and fails if the fallback is also bad', async () => {
    const a = fakeLlm({ [PRIMARY]: ['not json at all'], [FALLBACK]: [JSON.stringify({ items: GOOD })] });
    expect((await translator(a.llm).translateList(ITEMS, hi)).model).toBe(FALLBACK);

    const b = fakeLlm({ [PRIMARY]: [JSON.stringify({ items: ITEMS })], [FALLBACK]: ['still not json'] });
    const r = await translator(b.llm).translateList(ITEMS, hi);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not the requested JSON/);
  });

  it('splits a big list into several calls and keeps the order', async () => {
    const many = Array.from({ length: 60 }, (_, i) => `Document number ${i + 1}`);
    const fake = (req: LlmRequest) => JSON.stringify({ items: (JSON.parse(req.user) as string[]).map((s) => `दस्तावेज़ संख्या ${s.match(/\d+/)![0]}`) });
    const { llm, calls } = fakeLlm({ [PRIMARY]: Array.from({ length: 10 }, () => fake) });
    const r = await translator(llm).translateList(many, hi);
    expect(r.ok).toBe(true);
    expect(calls.length).toBeGreaterThan(1);
    expect((r.value as string[]).length).toBe(60);
    expect((r.value as string[])[0]).toBe('दस्तावेज़ संख्या 1');
    expect((r.value as string[])[59]).toBe('दस्तावेज़ संख्या 60');
  });
});
