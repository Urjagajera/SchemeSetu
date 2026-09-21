import { Prisma } from '@prisma/client';

/**
 * "Central" vs "State" is not a stored column — Category.level exists for this
 * but is not populated by ingestion yet (see schema.prisma comment). Until that
 * lands, level is derived from authorityName text using the same heuristic the
 * frontend's mock-mode getLocalStates() already uses, so behavior matches what
 * the app showed before a real backend existed.
 */
const CENTRAL_PREFIXES = ['ministry', 'department'];
const CENTRAL_EXACT = ['central government', 'central'];

export function deriveLevel(authorityName: string): 'Central' | 'State' {
  const name = authorityName.trim().toLowerCase();
  const isCentral =
    CENTRAL_PREFIXES.some((prefix) => name.startsWith(prefix)) || CENTRAL_EXACT.includes(name);
  return isCentral ? 'Central' : 'State';
}

/** Prisma where-clause equivalent of deriveLevel(), for filtering at the DB level. */
export function levelWhereClause(level?: string): Prisma.SchemeWhereInput | undefined {
  if (!level) return undefined;

  const centralConditions: Prisma.SchemeWhereInput[] = [
    { authorityName: { startsWith: 'Ministry', mode: 'insensitive' } },
    { authorityName: { startsWith: 'Department', mode: 'insensitive' } },
    { authorityName: { equals: 'Central Government', mode: 'insensitive' } },
    { authorityName: { equals: 'Central', mode: 'insensitive' } },
  ];

  const normalized = level.trim().toLowerCase();
  if (normalized === 'central') return { OR: centralConditions };
  if (normalized === 'state') return { NOT: { OR: centralConditions } };
  return undefined;
}
