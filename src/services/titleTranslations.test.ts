import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const get = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { get } }));
vi.mock('../config/mockMode', () => ({ isMockMode: false }));

// The store keeps its state at module level (pooled ids, poll counters), so every test gets a fresh copy.
async function load() {
  vi.resetModules();
  return await import('./titleTranslations');
}

const reply = (status: 'ready' | 'pending' | 'partial', titles: Record<string, string> = {}, summaries: Record<string, string> = {}) => ({
  data: { data: { language: 'hi', status, titles, summaries } },
});

/** Lets the 30 ms "pool the ids" timer fire and the request settle. */
const flushPool = () => act(async () => { await vi.advanceTimersByTimeAsync(30); });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  get.mockReset();
  get.mockResolvedValue(reply('ready'));
});

describe('requestTitles', () => {
  it('sends every id asked for in the same moment as ONE request', async () => {
    const { requestTitles } = await load();
    requestTitles('hi', ['a', 'b']);
    requestTitles('hi', ['c']);
    expect(get).not.toHaveBeenCalled();
    await flushPool();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/api/schemes/titles', { params: { lang: 'hi', ids: 'a,b,c' } });
  });

  it('splits a long list into requests of at most 100 ids', async () => {
    const { requestTitles } = await load();
    requestTitles('hi', Array.from({ length: 230 }, (_, i) => `id${i}`));
    await flushPool();
    const sizes = get.mock.calls.map((c) => (c[1].params.ids as string).split(',').length);
    expect(sizes).toEqual([100, 100, 30]);
  });

  it('does nothing for English', async () => {
    const { requestTitles } = await load();
    requestTitles('en', ['a']);
    await flushPool();
    expect(get).not.toHaveBeenCalled();
  });

  it('does nothing in mock-data mode (the demo catalogue has no server translations)', async () => {
    vi.resetModules();
    vi.doMock('../config/mockMode', () => ({ isMockMode: true }));
    const { requestTitles } = await import('./titleTranslations');
    requestTitles('hi', ['a']);
    await flushPool();
    expect(get).not.toHaveBeenCalled();
    vi.doMock('../config/mockMode', () => ({ isMockMode: false }));
  });

  it('does not ask again for a scheme it already has both a title and a summary for', async () => {
    get.mockResolvedValue(reply('ready', { a: 'शीर्षक' }, { a: 'सारांश' }));
    const { requestTitles } = await load();
    requestTitles('hi', ['a']);
    await flushPool();
    requestTitles('hi', ['a']);
    await flushPool();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('asks again if only the title has arrived so far', async () => {
    get.mockResolvedValue(reply('ready', { a: 'शीर्षक' }, {}));
    const { requestTitles } = await load();
    requestTitles('hi', ['a']);
    await flushPool();
    requestTitles('hi', ['a']);
    await flushPool();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe('polling while the server is still translating', () => {
  it('asks again every 3 seconds until the answer is ready, then stops', async () => {
    get.mockResolvedValueOnce(reply('pending', { a: 'शीर्षक' })).mockResolvedValueOnce(reply('ready', { a: 'शीर्षक' }, { a: 'सारांश' }));
    const { requestTitles } = await load();
    requestTitles('hi', ['a']);
    await flushPool();
    expect(get).toHaveBeenCalledTimes(1);
    await tick(2900);
    expect(get).toHaveBeenCalledTimes(1);
    await tick(200);
    expect(get).toHaveBeenCalledTimes(2);
    await tick(30_000);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('gives up after 30 requests so a stuck translation does not poll forever, and can be asked about again later', async () => {
    get.mockResolvedValue(reply('pending'));
    const { requestTitles } = await load();
    requestTitles('hi', ['a']);
    await flushPool();
    await tick(200_000);
    expect(get).toHaveBeenCalledTimes(30);
    await tick(60_000);
    expect(get).toHaveBeenCalledTimes(30);

    requestTitles('hi', ['a']); // e.g. the user comes back to the page
    await flushPool();
    expect(get).toHaveBeenCalledTimes(31);
  });
});

describe('useCardText', () => {
  it('returns the titles and summaries that have arrived, only for the ids asked about', async () => {
    get.mockResolvedValue(reply('ready', { a: 'शीर्षक ए', z: 'शीर्षक जेड' }, { a: 'सारांश ए' }));
    const { useCardText } = await load();
    const { result } = renderHook(() => useCardText(['a', 'b'], 'hi'));
    expect(result.current).toEqual({ titles: {}, summaries: {} }); // English shows until the text arrives
    await flushPool();
    expect(result.current.titles).toEqual({ a: 'शीर्षक ए' }); // "z" was not asked about; "b" has none
    expect(result.current.summaries).toEqual({ a: 'सारांश ए' });
  });

  it('returns nothing in English even if Hindi text is stored', async () => {
    get.mockResolvedValue(reply('ready', { a: 'शीर्षक' }, { a: 'सारांश' }));
    const { useCardText, requestTitles } = await load();
    requestTitles('hi', ['a']);
    await flushPool();
    const { result } = renderHook(() => useCardText(['a'], 'en'));
    expect(result.current).toEqual({ titles: {}, summaries: {} });
  });

  it('keeps showing English when the request fails, and tries again on the next ask', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    get.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(reply('ready', { a: 'शीर्षक' }, { a: 'सारांश' }));
    const { useCardText, requestTitles } = await load();
    const { result } = renderHook(() => useCardText(['a'], 'hi'));
    await flushPool();
    expect(result.current.titles).toEqual({});
    expect(warn).toHaveBeenCalled();

    requestTitles('hi', ['a']); // not stuck as "already asking"
    await flushPool();
    expect(result.current.titles).toEqual({ a: 'शीर्षक' });
  });

  it('treats an odd response shape as a failure rather than crashing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    get.mockResolvedValue({ data: { nope: true } });
    const { useCardText } = await load();
    const { result } = renderHook(() => useCardText(['a'], 'hi'));
    await flushPool();
    expect(result.current).toEqual({ titles: {}, summaries: {} });
  });
});

describe('ingestCardText (card text that came with a list response)', () => {
  it('stores it so cards render translated on the first paint, with no extra request', async () => {
    const { ingestCardText, useCardText } = await load();
    ingestCardText('hi', { language: 'hi', status: 'ready', titles: { a: 'शीर्षक' }, summaries: { a: 'सारांश' } }, ['a']);
    const { result } = renderHook(() => useCardText(['a'], 'hi'));
    expect(result.current).toEqual({ titles: { a: 'शीर्षक' }, summaries: { a: 'सारांश' } });
    await flushPool();
    expect(get).not.toHaveBeenCalled();
  });

  it('starts asking for the rest when the server says it is still translating', async () => {
    const { ingestCardText } = await load();
    ingestCardText('hi', { language: 'hi', status: 'pending', titles: { a: 'शीर्षक' }, summaries: {} }, ['a', 'b']);
    await flushPool();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('ignores English, a missing block, and an answer for a different language', async () => {
    const { ingestCardText, useCardText } = await load();
    ingestCardText('en', { language: 'en', status: 'ready', titles: { a: 'x' } }, ['a']);
    ingestCardText('hi', null, ['a']);
    ingestCardText('hi', { language: 'gu', status: 'ready', titles: { a: 'ગુજરાતી' } }, ['a']);
    const { result } = renderHook(() => useCardText(['a'], 'hi'));
    expect(result.current.titles).toEqual({});
  });
});
