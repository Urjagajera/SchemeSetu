import { describe, it, expect, vi } from 'vitest';
import { createQueryTranslator, needsTranslation } from './translateQuery.js';
import type { Llm } from '../translation/llm.js';

const answering = (keywords: unknown, finishReason = 'stop') =>
  vi.fn<Llm>().mockResolvedValue({ text: JSON.stringify({ keywords }), finishReason });

describe('needsTranslation', () => {
  it('is true for Hindi or Gujarati letters, false for English', () => {
    expect(needsTranslation('विधवा पेंशन')).toBe(true);
    expect(needsTranslation('ખેડૂત')).toBe(true);
    expect(needsTranslation('PM kisan योजना')).toBe(true);
    expect(needsTranslation('widow pension')).toBe(false);
  });
});

describe('createQueryTranslator: Hindi and Gujarati searches become English words', () => {
  it('asks Groq for English search words and returns them', async () => {
    const llm = answering(['widow', 'pension']);
    const translate = createQueryTranslator(llm, 'small-model');
    expect(await translate('विधवा पेंशन')).toEqual(['widow', 'pension']);
    const req = llm.mock.calls[0][0];
    expect(req).toMatchObject({ model: 'small-model', json: true, user: 'विधवा पेंशन' });
    expect(req.system).toContain('English search words');
  });

  it('remembers an answer, so the same search does not use the Groq allowance twice', async () => {
    const llm = answering(['farmer']);
    const translate = createQueryTranslator(llm, 'm');
    await translate('ખેડૂત યોજના');
    expect(await translate('  ખેડૂત   યોજના ')).toEqual(['farmer']);
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('when Groq fails, returns null and does not remember the failure', async () => {
    const llm = vi.fn<Llm>().mockRejectedValueOnce(new Error('busy')).mockResolvedValue({ text: '{"keywords":["widow"]}', finishReason: 'stop' });
    const translate = createQueryTranslator(llm, 'm');
    expect(await translate('विधवा')).toBeNull();
    expect(await translate('विधवा')).toEqual(['widow']);
  });

  it('returns null for an answer cut off, not JSON, or with no words', async () => {
    expect(await createQueryTranslator(answering(['widow'], 'length'), 'm')('विधवा')).toBeNull();
    expect(await createQueryTranslator(vi.fn<Llm>().mockResolvedValue({ text: 'widow', finishReason: 'stop' }), 'm')('विधवा')).toBeNull();
    expect(await createQueryTranslator(answering([' ', 3]), 'm')('विधवा')).toBeNull();
  });

  it('without a Groq key, returns null', async () => {
    expect(await createQueryTranslator(null, 'm')('विधवा')).toBeNull();
  });

  it('keeps at most 8 words', async () => {
    const words = Array.from({ length: 12 }, (_, i) => `w${i}`);
    expect(await createQueryTranslator(answering(words), 'm')('विधवा')).toHaveLength(8);
  });
});
