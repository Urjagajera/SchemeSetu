import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GENDER_IDS, MAX_FILTER_AGE, OCCUPATION_IDS, SOCIAL_CATEGORY_IDS, TOPIC_IDS, toTopicId } from '../constants/searchFilters';
import type { UserProfile } from '../types';

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

/** The "About you" filters: the ones a saved profile can answer. */
export const ABOUT_YOU_FIELDS = ['state', 'age', 'gender', 'socialCategory', 'occupation', 'income'] as const;

export function hasAboutYou(f: SearchFilters): boolean {
  return ABOUT_YOU_FIELDS.some((k) => f[k].trim() !== '');
}

/**
 * The "About you" filters a saved profile fills in. Only values the filters accept are taken: an occupation of
 * "other" or an age the filter can't use is left blank instead of being guessed at.
 */
export function aboutYouFromProfile(profile: Partial<UserProfile> | null | undefined): Partial<SearchFilters> {
  if (!profile) return {};
  const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const out: Partial<SearchFilters> = {};
  const state = clean(profile.state);
  if (state) out.state = state;
  const age = clean(profile.age);
  if (/^\d{1,3}$/.test(age) && Number(age) <= MAX_FILTER_AGE) out.age = age;
  const gender = clean(profile.gender).toLowerCase();
  if ((GENDER_IDS as readonly string[]).includes(gender)) out.gender = gender;
  const category = clean(profile.category).toLowerCase();
  if ((SOCIAL_CATEGORY_IDS as readonly string[]).includes(category)) out.socialCategory = category;
  const occupation = clean(profile.occupation).toLowerCase();
  if ((OCCUPATION_IDS as readonly string[]).includes(occupation)) out.occupation = occupation;
  const income = clean(profile.income);
  if (/^\d{1,12}$/.test(income)) out.income = income;
  return out;
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
