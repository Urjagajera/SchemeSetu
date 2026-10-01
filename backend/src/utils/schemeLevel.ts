import { Prisma } from '@prisma/client';
import { INDIAN_STATES_AND_UTS, canonicalState } from './states.js';

/**
 * "Central" vs "State" is not a stored column on Scheme, so it is derived from the authority name:
 * a scheme is a State scheme when its authority IS one of the 28 states / 8 union territories
 * (utils/states.ts), and a Central scheme otherwise (ministries, departments, NITI Aayog, the Lokpal,
 * the CAG...). The old rule guessed "central" from a name starting with "Ministry"/"Department", which
 * mislabelled NITI Aayog, the Lokpal and the CAG as State bodies.
 */
export function deriveLevel(authorityName: string): 'Central' | 'State' {
  return canonicalState(authorityName) !== null ? 'State' : 'Central';
}

/** Prisma where-clause equivalent of deriveLevel(), for filtering at the DB level. */
export function levelWhereClause(level?: string): Prisma.SchemeWhereInput | undefined {
  if (!level) return undefined;

  // Matched case-insensitively, like canonicalState(), so a differently-cased authority name is still its state.
  const stateConditions: Prisma.SchemeWhereInput[] = INDIAN_STATES_AND_UTS.map((name) => ({
    authorityName: { equals: name, mode: 'insensitive' },
  }));

  const normalized = level.trim().toLowerCase();
  if (normalized === 'state') return { OR: stateConditions };
  if (normalized === 'central') return { NOT: { OR: stateConditions } };
  return undefined;
}
