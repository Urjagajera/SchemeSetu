import { Prisma } from '@prisma/client';
import { canonicalState } from '../utils/states.js';
import { levelWhereClause } from '../utils/schemeLevel.js';
import { GENDERS, MAX_AGE, SOCIAL_CATEGORIES, buildDemographicWhere, parseWholeNumber, setContains } from './demographics.js';
import { findOccupation } from './occupations.js';
import { TOPICS, findTopic } from './topics.js';

/**
 * Every Search filter, read and checked in ONE place. GET /api/schemes calls parseSchemeFilters() on the query
 * string and buildSchemeWhere() on the result; the response echoes the parsed filters back as `appliedFilters`,
 * so the page can show exactly what was applied (an invalid value is dropped, never guessed at).
 *
 *   q / query      free text: name, description, authority or a tag
 *   topic          one or more topic ids (filters/topics.ts), comma-separated or repeated; a scheme in ANY of them
 *   category       old name for a topic ("Education", "Healthcare"...); a value that is no topic is ignored
 *   level          "Central" | "State" (derived from the authority, utils/schemeLevel.ts)
 *   ministry       exact authority name (case-insensitive)
 *   state          a real state/UT: central schemes plus that state's own, minus schemes limited to other states
 *   occupation     schemes meant for this occupation (filters/occupations.ts)
 *   gender, socialCategory, age, income   who the scheme is open to (filters/demographics.ts)
 */
export interface SchemeFilters {
  query?: string;
  topics?: string[];
  level?: 'Central' | 'State';
  ministry?: string;
  state?: string;
  occupation?: string;
  gender?: string;
  socialCategory?: string;
  age?: number;
  income?: number;
}

type RawQuery = Record<string, unknown>;

const MAX_QUERY_LENGTH = 200;

/** One string from a query value (Express gives an array for a repeated key; the first one wins). */
function single(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** All values of a key that may be repeated and/or comma-separated. */
function list(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((v) => (typeof v === 'string' ? v.split(',') : [])).map((v) => v.trim()).filter(Boolean);
}

export function parseSchemeFilters(raw: RawQuery): SchemeFilters {
  const f: SchemeFilters = {};

  const query = single(raw.q) ?? single(raw.query);
  if (query) f.query = query.slice(0, MAX_QUERY_LENGTH);

  // Topic ids, then the old `category` values; kept in the fixed TOPICS order so the same choice gives the same URL.
  const picked = new Set([...list(raw.topic), ...list(raw.category)].map((v) => findTopic(v)?.id).filter(Boolean));
  const topics = TOPICS.map((t) => t.id).filter((id) => picked.has(id));
  if (topics.length > 0) f.topics = topics;

  const level = single(raw.level)?.toLowerCase();
  if (level === 'central') f.level = 'Central';
  if (level === 'state') f.level = 'State';

  const ministry = single(raw.ministry);
  if (ministry) f.ministry = ministry;

  const state = canonicalState(single(raw.state));
  if (state) f.state = state;

  const occupation = findOccupation(single(raw.occupation));
  if (occupation) f.occupation = occupation.id;

  const gender = single(raw.gender)?.toLowerCase();
  if (gender && GENDERS.has(gender)) f.gender = gender;

  const social = single(raw.socialCategory)?.toLowerCase();
  if (social && SOCIAL_CATEGORIES.has(social)) f.socialCategory = social;

  const age = parseWholeNumber(single(raw.age));
  if (age !== null && age <= MAX_AGE) f.age = age;

  const income = parseWholeNumber(single(raw.income));
  if (income !== null) f.income = income;

  return f;
}

const tagIn = (tags: readonly string[]): Prisma.SchemeWhereInput => ({
  tags: { some: { name: { in: [...tags], mode: 'insensitive' } } },
});

/** Schemes in at least one of the topics. */
export function topicWhere(ids: readonly string[]): Prisma.SchemeWhereInput {
  const tags = TOPICS.filter((t) => ids.includes(t.id)).flatMap((t) => t.tags);
  return tagIn(tags);
}

/** Schemes meant for an occupation: named in the parsed criteria, or tagged with it. */
export function occupationWhere(id: string): Prisma.SchemeWhereInput {
  const occupation = findOccupation(id);
  if (!occupation) return {};
  const or: Prisma.SchemeWhereInput[] = [tagIn(occupation.tags)];
  if (occupation.criteriaValue) or.push({ eligibilityCriteria: { is: setContains('occupation', occupation.criteriaValue) } });
  return { OR: or };
}

/** The Prisma condition for a parsed set of filters. Every filter narrows (AND); no filters means every scheme. */
export function buildSchemeWhere(f: SchemeFilters): Prisma.SchemeWhereInput {
  const and: Prisma.SchemeWhereInput[] = [];

  if (f.query) {
    and.push({
      OR: [
        { name: { contains: f.query, mode: 'insensitive' } },
        { description: { contains: f.query, mode: 'insensitive' } },
        { authorityName: { contains: f.query, mode: 'insensitive' } },
        { tags: { some: { name: { contains: f.query, mode: 'insensitive' } } } },
      ],
    });
  }
  if (f.topics?.length) and.push(topicWhere(f.topics));
  if (f.level) and.push(levelWhereClause(f.level) ?? {});
  if (f.ministry) and.push({ authorityName: { equals: f.ministry, mode: 'insensitive' } });
  if (f.state) {
    // Central schemes plus this state's own; buildDemographicWhere below then drops schemes limited to other states.
    and.push({ OR: [levelWhereClause('Central') ?? {}, { authorityName: { equals: f.state, mode: 'insensitive' } }] });
  }
  if (f.occupation) and.push(occupationWhere(f.occupation));

  and.push(
    ...buildDemographicWhere({
      state: f.state,
      gender: f.gender,
      socialCategory: f.socialCategory,
      age: f.age === undefined ? undefined : String(f.age),
      income: f.income === undefined ? undefined : String(f.income),
    }),
  );

  return and.length === 0 ? {} : { AND: and };
}
