import { Prisma } from '@prisma/client';
import { canonicalState } from './states.js';

/**
 * Search filters for who a scheme is FOR, applied in the database so the result
 * count and the pages are honest (they used to be guessed per page in the browser).
 *
 * Semantics are "schemes available to me": a scheme stays in the results unless its
 * stored criteria positively rule the person out. A scheme with no criteria row, or
 * with that field unset, is unrestricted and always stays. This is the same rule the
 * eligibility engine uses for a profile (see utils/criteriaMatch.ts), including
 * "unknown never excludes".
 *
 * gender, category and state are stored as comma-separated sets ("sc,st", "Kerala,Tamil Nadu"), age and
 * income as numeric bounds on EligibilityCriteria.
 */
export interface DemographicQuery {
  state?: string;
  gender?: string;
  socialCategory?: string;
  age?: string;
  income?: string;
}

const GENDERS = new Set(['male', 'female', 'other']);
const SOCIAL_CATEGORIES = new Set(['general', 'sc', 'st', 'obc']);
const MAX_AGE = 120;

const noCriteriaRow: Prisma.SchemeWhereInput = { eligibilityCriteria: { is: null } };

/** value is a member of a comma-separated set column; exact forms only, so "st" never matches inside another value. */
export function setContains(field: 'gender' | 'category' | 'state', value: string): Prisma.EligibilityCriteriaWhereInput {
  return {
    OR: [
      { [field]: { equals: value } },
      { [field]: { startsWith: `${value},` } },
      { [field]: { endsWith: `,${value}` } },
      { [field]: { contains: `,${value},` } },
    ],
  };
}

function parseWholeNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Returns the extra AND-conditions for whichever filters were supplied and valid; invalid values are ignored. */
export function buildDemographicWhere(q: DemographicQuery): Prisma.SchemeWhereInput[] {
  const clauses: Prisma.SchemeWhereInput[] = [];

  // A scheme limited to certain states (EligibilityCriteria.state) stays only when the chosen state is one of them.
  // This sits on top of the authority-level rule in the route (central schemes plus that state's own schemes).
  const state = canonicalState(q.state);
  if (state) {
    clauses.push({
      OR: [noCriteriaRow, { eligibilityCriteria: { is: { state: null } } }, { eligibilityCriteria: { is: setContains('state', state) } }],
    });
  }

  const gender = q.gender?.trim().toLowerCase();
  if (gender && GENDERS.has(gender)) {
    // The profile form records a transgender user as "other".
    const stored = gender === 'other' ? 'transgender' : gender;
    clauses.push({
      OR: [noCriteriaRow, { eligibilityCriteria: { is: { gender: null } } }, { eligibilityCriteria: { is: setContains('gender', stored) } }],
    });
  }

  const social = q.socialCategory?.trim().toLowerCase();
  if (social && SOCIAL_CATEGORIES.has(social)) {
    clauses.push({
      OR: [noCriteriaRow, { eligibilityCriteria: { is: { category: null } } }, { eligibilityCriteria: { is: setContains('category', social) } }],
    });
  }

  const age = parseWholeNumber(q.age);
  if (age !== null && age <= MAX_AGE) {
    clauses.push({
      OR: [
        noCriteriaRow,
        {
          eligibilityCriteria: {
            is: {
              AND: [{ OR: [{ ageMin: null }, { ageMin: { lte: age } }] }, { OR: [{ ageMax: null }, { ageMax: { gte: age } }] }],
            },
          },
        },
      ],
    });
  }

  const income = parseWholeNumber(q.income);
  if (income !== null) {
    clauses.push({
      OR: [
        noCriteriaRow,
        {
          eligibilityCriteria: {
            is: {
              AND: [
                { OR: [{ incomeMinAnnual: null }, { incomeMinAnnual: { lte: income } }] },
                { OR: [{ incomeMaxAnnual: null }, { incomeMaxAnnual: { gte: income } }] },
              ],
            },
          },
        },
      ],
    });
  }

  return clauses;
}
