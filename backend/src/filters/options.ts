import prisma from '../db/prisma.js';
import { INDIAN_STATES_AND_UTS } from '../utils/states.js';
import { deriveLevel, levelWhereClause } from '../utils/schemeLevel.js';
import { OCCUPATIONS } from './occupations.js';
import { TOPICS } from './topics.js';
import { occupationWhere, topicWhere } from './schemeFilters.js';

/**
 * Everything the Search sidebar offers, in one response (GET /api/schemes/filters), with how many schemes each
 * choice has on its own so an option that would show nothing can be seen as such. Labels are NOT sent: the app
 * translates ids through its locale files (topic_<id>, occ_<id>...), and ministry/state names through the vocabulary.
 *
 * The scheme data only changes when an ingestion script runs, so the counts are kept for CACHE_MS.
 */
export interface FilterOptions {
  topics: Array<{ id: string; count: number }>;
  occupations: Array<{ id: string; count: number }>;
  levels: Array<{ id: 'Central' | 'State'; count: number }>;
  states: string[];
  /** Central authorities only: a state's schemes are reached through the State filter. */
  ministries: Array<{ name: string; count: number }>;
  genders: string[];
  socialCategories: string[];
}

const CACHE_MS = 10 * 60 * 1000;
let cached: { at: number; value: Promise<FilterOptions> } | null = null;

async function load(): Promise<FilterOptions> {
  const [topicCounts, occupationCounts, central, state, authorities] = await Promise.all([
    Promise.all(TOPICS.map((t) => prisma.scheme.count({ where: topicWhere([t.id]) }))),
    Promise.all(OCCUPATIONS.map((o) => prisma.scheme.count({ where: occupationWhere(o.id) }))),
    prisma.scheme.count({ where: levelWhereClause('Central') }),
    prisma.scheme.count({ where: levelWhereClause('State') }),
    prisma.scheme.groupBy({ by: ['authorityName'], _count: { _all: true } }),
  ]);

  const ministries = new Map<string, number>();
  for (const row of authorities) {
    const name = row.authorityName.trim();
    if (!name || deriveLevel(name) !== 'Central') continue;
    ministries.set(name, (ministries.get(name) ?? 0) + row._count._all);
  }

  return {
    topics: TOPICS.map((t, i) => ({ id: t.id, count: topicCounts[i] })),
    occupations: OCCUPATIONS.map((o, i) => ({ id: o.id, count: occupationCounts[i] })),
    levels: [
      { id: 'Central', count: central },
      { id: 'State', count: state },
    ],
    states: [...INDIAN_STATES_AND_UTS].sort((a, b) => a.localeCompare(b, 'en')),
    ministries: [...ministries]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    genders: ['male', 'female', 'other'],
    socialCategories: ['general', 'sc', 'st', 'obc'],
  };
}

export function getFilterOptions(now = Date.now()): Promise<FilterOptions> {
  if (!cached || now - cached.at > CACHE_MS) {
    const value = load();
    cached = { at: now, value };
    // A failed load must not be kept: the next request tries again.
    value.catch(() => {
      if (cached?.value === value) cached = null;
    });
  }
  return cached.value;
}

/** Tests only. */
export function clearFilterOptionsCache(): void {
  cached = null;
}
