import axios from 'axios';
import { useEffect, useReducer } from 'react';
import { isMockMode } from '../config/mockMode';

/**
 * Translated scheme titles and short summaries for cards (search results, related schemes, bookmarks...).
 *
 * Every card asks for its own text, but the asking is pooled: all the ids requested in the same moment go
 * out as ONE request (GET /api/schemes/titles?lang=hi&ids=...), the server translates the missing ones in
 * batches in the background, and anything still pending is asked about again every few seconds. A card
 * shows the English text until the translated one arrives, then swaps. Results are kept for the session.
 */
const FLUSH_DELAY_MS = 30;
const POLL_EVERY_MS = 3000;
const MAX_POLLS = 30; // about 90 seconds, then the title simply stays English
const MAX_IDS_PER_REQUEST = 100;

const titles = new Map<string, Map<string, string>>(); // language -> scheme id -> translated title
const summaries = new Map<string, Map<string, string>>(); // language -> scheme id -> translated summary
const queued = new Map<string, Set<string>>(); // language -> ids waiting to be sent
const busy = new Set<string>(); // "lang:id" being fetched or waiting for a poll: don't ask twice
const polls = new Map<string, number>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const notify = () => listeners.forEach((l) => l());

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  if (flushTimer !== undefined) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flush();
  }, delay);
}

function queue(language: string, id: string) {
  let set = queued.get(language);
  if (!set) queued.set(language, (set = new Set()));
  set.add(id);
}

function storeText(language: string, newTitles: unknown, newSummaries: unknown) {
  const put = (all: Map<string, Map<string, string>>, from: unknown) => {
    let map = all.get(language);
    if (!map) all.set(language, (map = new Map()));
    for (const [id, text] of Object.entries((from ?? {}) as Record<string, string>)) map.set(id, text);
  };
  put(titles, newTitles);
  put(summaries, newSummaries);
}

/**
 * List responses (search, featured, recommended) carry the card text the server already has, so the cards
 * render in the right language on the very first paint instead of English for a moment. Call this before
 * returning the list to the page. If the server is still translating some of it, polling picks up from here.
 */
export function ingestCardText(language: string, translation: unknown, ids: string[]) {
  const tr = translation as { language?: string; status?: string; titles?: unknown; summaries?: unknown } | null | undefined;
  if (language === 'en' || isMockMode || !tr || tr.language !== language) return;
  storeText(language, tr.titles, tr.summaries);
  if (tr.status === 'pending') requestTitles(language, ids);
}

async function flush() {
  const work = [...queued.entries()];
  queued.clear();
  for (const [language, set] of work) {
    const ids = [...set];
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
      const chunk = ids.slice(i, i + MAX_IDS_PER_REQUEST);
      try {
        const res = await axios.get('/api/schemes/titles', { params: { lang: language, ids: chunk.join(',') } });
        const data = res.data?.data;
        if (!data || typeof data.titles !== 'object') throw new Error('unexpected response');
        storeText(language, data.titles, data.summaries);

        // Titles and summaries arrive separately, so keep asking about the whole chunk while the server says pending.
        for (const id of chunk) {
          const key = `${language}:${id}`;
          const n = (polls.get(key) ?? 0) + 1;
          if (data.status !== 'pending' || n >= MAX_POLLS) {
            busy.delete(key);
            polls.delete(key);
          } else {
            polls.set(key, n);
            queue(language, id); // still being translated: ask again shortly
          }
        }
      } catch (err) {
        console.warn('[titleTranslations] could not load translated titles, showing English', err);
        for (const id of chunk) {
          busy.delete(`${language}:${id}`);
          polls.delete(`${language}:${id}`);
        }
      }
    }
  }
  notify();
  if ([...queued.values()].some((s) => s.size > 0)) scheduleFlush(POLL_EVERY_MS);
}

/** Ask for the translated titles and summaries of these schemes (a no-op for English or mock data). */
export function requestTitles(language: string, ids: string[]) {
  if (language === 'en' || isMockMode) return;
  const known = titles.get(language);
  let added = false;
  for (const id of ids) {
    const key = `${language}:${id}`;
    if ((known?.has(id) && summaries.get(language)?.has(id)) || busy.has(key)) continue;
    busy.add(key);
    queue(language, id);
    added = true;
  }
  if (added) {
    // A new request shouldn't wait for a slow poll timer that is already ticking.
    if (flushTimer !== undefined) {
      clearTimeout(flushTimer);
      flushTimer = undefined;
    }
    scheduleFlush();
  }
}

/** The translated titles and summaries that have arrived so far, as { schemeId: text }. Schemes without one are absent. */
export function useCardText(ids: string[], language: string): { titles: Record<string, string>; summaries: Record<string, string> } {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const key = ids.join(',');
  useEffect(() => {
    if (ids.length > 0) requestTitles(language, ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, language]);

  const pick = (all: Map<string, Map<string, string>>): Record<string, string> => {
    const known = language === 'en' ? undefined : all.get(language);
    const out: Record<string, string> = {};
    if (known) for (const id of ids) if (known.has(id)) out[id] = known.get(id)!;
    return out;
  };
  return { titles: pick(titles), summaries: pick(summaries) };
}
