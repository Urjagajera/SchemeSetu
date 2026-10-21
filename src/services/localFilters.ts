import { Scheme } from '../types';
import { OCCUPATION_IDS, TOPIC_IDS, toTopicId } from '../constants/searchFilters';
import { matchesEntrepreneur } from '../utils/occupationKeywords';

/**
 * Search filters for mock mode (VITE_USE_MOCK_DATA) and for when the backend cannot be reached. The real filters
 * run in the database (backend/src/filters); the bundled demo schemes have no stored criteria, so these are
 * keyword guesses over the text, the same rules the Search page used to run in the browser.
 */
export interface LocalFilterInput {
  query?: string;
  topic?: string;
  level?: string;
  ministry?: string;
  state?: string;
  occupation?: string;
  gender?: string;
  age?: number;
  income?: number;
}

export function schemeTopics(s: Scheme): Set<string> {
  const values = [s.category, ...(s.categories ?? []), ...s.tags];
  const topics = new Set<string>();
  for (const v of values) {
    const id = v ? toTopicId(v) : null;
    if (id) topics.add(id);
  }
  return topics;
}

function matchesOccupation(s: Scheme, occ: string): boolean {
  const titleLower = s.name.toLowerCase();
  const descLower = s.description.toLowerCase();
  const tagsLower = s.tags.map((t) => t.toLowerCase());
  const inCategory = (name: string) => s.category?.toLowerCase() === name || !!s.categories?.some((c) => c.toLowerCase() === name);

  switch (occ) {
    case 'student': {
      const kw = ['student', 'students', 'scholarship', 'education', 'fellowship', 'fellow', 'research', 'higher education',
        'phd', 'internship', 'stipend', 'school', 'skill development', 'science', 'scientist'];
      return inCategory('student') || tagsLower.some((t) => kw.includes(t)) || kw.some((k) => titleLower.includes(k));
    }
    case 'farmer': {
      const kw = ['agriculture', 'farmer', 'farming', 'animal husbandry', 'fishermen', 'fish farming', 'fish production',
        'fish sellers', 'fish', 'poultry farming', 'biofloc', 'recirculating aquaculture system'];
      return inCategory('farmer') || tagsLower.some((t) => kw.includes(t)) || kw.some((k) => titleLower.includes(k));
    }
    case 'entrepreneur':
      return matchesEntrepreneur(tagsLower, titleLower, descLower);
    case 'senior citizen': {
      const kw = ['senior citizen', 'pension', 'old age', 'elderly'];
      return inCategory('senior citizen') || tagsLower.some((t) => kw.includes(t)) || kw.some((k) => titleLower.includes(k) || descLower.includes(k));
    }
    case 'unemployed': {
      const kw = ['unemployed', 'job seeker', 'unemployment', 'youth employment'];
      return tagsLower.some((t) => kw.includes(t)) || kw.some((k) => titleLower.includes(k) || descLower.includes(k));
    }
    case 'employee': {
      const kw = ['employee', 'worker', 'workers', 'labour', 'labourer'];
      return tagsLower.some((t) => kw.includes(t)) || kw.some((k) => titleLower.includes(k));
    }
    default:
      return true;
  }
}

function isFemaleOnly(s: Scheme): boolean {
  const titleLower = s.name.toLowerCase();
  const descLower = s.description.toLowerCase();
  const tagsLower = s.tags.map((t) => t.toLowerCase());
  return s.category?.toLowerCase() === 'woman' ||
    !!s.categories?.some((c) => c.toLowerCase() === 'woman') ||
    tagsLower.some((t) => ['woman', 'women', 'female', 'girl', 'girls', 'widow'].includes(t)) ||
    titleLower.includes('mahila') || titleLower.includes('kanya') || titleLower.includes('widow') ||
    descLower.includes('only female') || descLower.includes('only women');
}

function fitsAge(s: Scheme, age: number): boolean {
  const descLower = s.description.toLowerCase();
  const titleLower = s.name.toLowerCase();
  const seniorKeywords = ['senior citizen', 'old age', 'above 60', '60 years or above', '60 years of age or above'];
  if (seniorKeywords.some((kw) => titleLower.includes(kw) || descLower.includes(kw)) && age < 60) return false;

  const min = descLower.match(/above\s+(\d+)\s+years/) ?? descLower.match(/(\d+)\s+years\s+of\s+age\s+or\s+above/);
  if (min && age < parseInt(min[1], 10)) return false;
  const max = descLower.match(/below\s+(\d+)\s+years/) ?? descLower.match(/up\s+to\s+(\d+)\s+years/);
  if (max && age > parseInt(max[1], 10)) return false;
  const between = descLower.match(/between\s+(\d+)\s+(?:to|and)\s+(\d+)\s+years/);
  if (between && (age < parseInt(between[1], 10) || age > parseInt(between[2], 10))) return false;
  return true;
}

function incomeLimit(text: string): number | null {
  if (!text.includes('income')) return null;
  const lakhs = text.match(/(?:income|family income|annual income|limit of)\s+(?:less than|below|not exceed|up to|maximum of|within)?\s*(?:rs\.?|rupees|₹)?\s*([0-9.]+)\s*(?:lakh|lakhs|l)/i);
  if (lakhs) {
    const val = parseFloat(lakhs[1]);
    if (!isNaN(val)) return val * 100000;
  }
  const raw = text.match(/(?:income|family income|annual income|limit of)\s+(?:less than|below|not exceed|up to|maximum of|within)?\s*(?:rs\.?|rupees|₹)?\s*([0-9,]+)/i);
  if (raw) {
    const val = parseInt(raw[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 1000) return val;
  }
  return null;
}

export function applyLocalFilters(schemes: Scheme[], f: LocalFilterInput = {}): Scheme[] {
  const topics = (f.topic ?? '').split(',').map((t) => toTopicId(t)).filter((t): t is NonNullable<typeof t> => t !== null);
  return schemes.filter((s) => {
    if (f.query) {
      const q = f.query.toLowerCase();
      const hit = s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) ||
        s.authorityName.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (topics.length) {
      const own = schemeTopics(s);
      if (!topics.some((t) => own.has(t))) return false;
    }
    if (f.level && s.level.toLowerCase() !== f.level.toLowerCase()) return false;
    if (f.ministry && s.authorityName.toLowerCase() !== f.ministry.toLowerCase()) return false;
    if (f.state && s.level === 'State' && s.authorityName.toLowerCase() !== f.state.toLowerCase()) return false;
    if (f.occupation && !matchesOccupation(s, f.occupation.toLowerCase())) return false;
    if (f.gender?.toLowerCase() === 'male' && isFemaleOnly(s)) return false;
    if (f.age !== undefined && !fitsAge(s, f.age)) return false;
    if (f.income !== undefined) {
      const limit = incomeLimit(s.description.toLowerCase());
      if (limit !== null && f.income > limit) return false;
    }
    return true;
  });
}

/** Option counts over the local schemes, shaped like GET /api/schemes/filters. */
export function localFilterCounts(schemes: Scheme[]) {
  return {
    topics: TOPIC_IDS.map((id) => ({ id, count: applyLocalFilters(schemes, { topic: id }).length })),
    occupations: OCCUPATION_IDS.map((id) => ({ id, count: applyLocalFilters(schemes, { occupation: id }).length })),
    levels: (['Central', 'State'] as const).map((id) => ({ id, count: schemes.filter((s) => s.level === id).length })),
  };
}
