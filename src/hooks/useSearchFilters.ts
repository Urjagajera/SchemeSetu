import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TOPIC_IDS, toTopicId } from '../constants/searchFilters';

/**
 * The Search page's filters, kept in ONE place: the URL. A reload, the back button or a shared link
 * shows exactly the same filtered list, and "clear" really clears everything (it used to leave Ministry set).
 *
 * Empty string / empty list / null means "not filtering on this".
 */
export interface SearchFilters {
  query: string;
  topics: string[];
  level: string;
  ministry: string;
  state: string;
  occupation: string;
  gender: string;
  socialCategory: string;
  age: string;
  /** Annual family income in rupees, as typed. */
  income: string;
}

export const EMPTY_FILTERS: SearchFilters = {
  query: '', topics: [], level: '', ministry: '', state: '', occupation: '', gender: '', socialCategory: '', age: '', income: '',
};

/** URL key for each filter; topics are one comma-separated `topic` value. */
const KEYS: Record<Exclude<keyof SearchFilters, 'topics'>, string> = {
  query: 'q', level: 'level', ministry: 'ministry', state: 'state', occupation: 'occupation',
  gender: 'gender', socialCategory: 'socialCategory', age: 'age', income: 'income',
};

export function filtersFromParams(params: URLSearchParams): SearchFilters {
  const f = { ...EMPTY_FILTERS };
  for (const [field, key] of Object.entries(KEYS) as Array<[keyof typeof KEYS, string]>) f[field] = params.get(key) ?? '';
  // `category` is the old name (Home-page links): read it as a topic.
  const picked = new Set(
    [...(params.get('topic') ?? '').split(','), ...(params.get('category') ?? '').split(',')]
      .map((v) => toTopicId(v))
      .filter(Boolean),
  );
  f.topics = TOPIC_IDS.filter((id) => picked.has(id));
  return f;
}

export function paramsFromFilters(f: SearchFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS) as Array<[keyof typeof KEYS, string]>) {
    const value = f[field].trim();
    if (value) params.set(key, value);
  }
  if (f.topics.length) params.set('topic', TOPIC_IDS.filter((id) => f.topics.includes(id)).join(','));
  if (page > 1) params.set('page', String(page));
  return params;
}

/** How many filters are on (each topic counts once; the search text is not a filter). */
export function countActiveFilters(f: SearchFilters): number {
  return (Object.keys(KEYS) as Array<keyof typeof KEYS>).filter((k) => k !== 'query' && f[k].trim() !== '').length + f.topics.length;
}

export function useSearchFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  /** Change some filters; any change goes back to page 1. Typing replaces the history entry instead of adding one. */
  const update = useCallback(
    (changes: Partial<SearchFilters>) => {
      setParams((prev) => paramsFromFilters({ ...filtersFromParams(prev), ...changes }), { replace: true });
    },
    [setParams],
  );

  const toggleTopic = useCallback(
    (id: string) => {
      setParams((prev) => {
        const current = filtersFromParams(prev);
        const topics = current.topics.includes(id) ? current.topics.filter((t) => t !== id) : [...current.topics, id];
        return paramsFromFilters({ ...current, topics });
      }, { replace: true });
    },
    [setParams],
  );

  /** Clear every filter but keep the search text. */
  const clear = useCallback(() => {
    setParams((prev) => paramsFromFilters({ ...EMPTY_FILTERS, query: filtersFromParams(prev).query }));
  }, [setParams]);

  const setPage = useCallback(
    (next: number) => {
      setParams((prev) => paramsFromFilters(filtersFromParams(prev), next));
    },
    [setParams],
  );

  return { filters, page, update, toggleTopic, clear, setPage, activeCount: countActiveFilters(filters) };
}
