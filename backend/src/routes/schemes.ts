import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deriveLevel, levelWhereClause } from '../utils/schemeLevel.js';
import { serializeScheme } from '../utils/serializeScheme.js';

const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FEATURED_LIMIT = 6;

function parsePagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * GET /api/schemes
 * Query params sent by the frontend (see schemeService.ts / Search.tsx):
 *   query    — free-text search across name/description/authorityName
 *   category — Category.name (join is empty until Category ingestion runs — see report)
 *   level    — "Central" | "State", derived from authorityName (see schemeLevel.ts)
 *   sort     — only "Deadline Approaching" is a known value client-side, but deadlines
 *              are a frontend-only synthetic field (schemeService.ts enrichScheme()) with
 *              no DB column to sort by, so sort is accepted but not applied server-side.
 *   page, limit — pagination (only sent by Search.tsx in non-mock mode)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, category, level } = req.query as Record<string, string | undefined>;
    const { limit, skip } = parsePagination(req);

    const where: Prisma.SchemeWhereInput = {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { authorityName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {},
        category ? { categories: { some: { name: { equals: category, mode: 'insensitive' } } } } : {},
        levelWhereClause(level) ?? {},
      ],
    };

    const [rows, total] = await Promise.all([
      prisma.scheme.findMany({
        where,
        include: { tags: true, categories: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.scheme.count({ where }),
    ]);

    res.json({ data: rows.map((s) => serializeScheme(s)), total });
  }),
);

/**
 * GET /api/schemes/featured
 * The Scheme model has no "featured" flag (mock-mode data always set featured: false
 * anyway — see schemeService.ts enrichScheme()). No such signal exists in the DB, so
 * this returns a bounded, deterministic sample rather than fabricating a ranking.
 */
router.get(
  '/featured',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await prisma.scheme.findMany({
      include: { tags: true, categories: true },
      orderBy: { name: 'asc' },
      take: FEATURED_LIMIT,
    });
    res.json({ data: rows.map((s) => serializeScheme(s)) });
  }),
);

/**
 * GET /api/schemes/states
 * Derives distinct non-central authority names from live Scheme data, same
 * heuristic as the frontend's mock-mode getLocalStates().
 */
router.get(
  '/states',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await prisma.scheme.findMany({
      select: { authorityName: true },
      distinct: ['authorityName'],
    });
    const states = Array.from(
      new Set(rows.map((r) => r.authorityName.trim()).filter((name) => deriveLevel(name) === 'State')),
    ).sort();
    res.json({ data: states });
  }),
);

/**
 * GET /api/schemes/recommended
 * Called by schemeService.getEligibleSchemes(profile) — but as written today that
 * function never actually sends `profile` to this endpoint (only `lang`); see the
 * final report. Accepts profile signal via query params for forward-compatibility
 * (tags=comma,separated, occupation, gender, farmer) so it works once the frontend
 * is fixed to send them; with none of those params (today's reality) it falls back
 * to a plain paginated list, matching the "no real match signal available" case.
 */
router.get(
  '/recommended',
  asyncHandler(async (req: Request, res: Response) => {
    const { tags: tagsParam, occupation, gender, farmer } = req.query as Record<string, string | undefined>;

    const interestTags = new Set<string>(
      (tagsParam ?? '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );
    if (occupation) interestTags.add(occupation.toLowerCase());
    if (gender?.toLowerCase() === 'female') {
      interestTags.add('woman');
      interestTags.add('women');
    }
    if (farmer?.toLowerCase() === 'yes') {
      interestTags.add('farmer');
      interestTags.add('agriculture');
    }

    if (interestTags.size === 0) {
      const rows = await prisma.scheme.findMany({
        include: { tags: true, categories: true },
        orderBy: { name: 'asc' },
        take: DEFAULT_LIMIT,
      });
      res.json({ data: rows.map((s) => serializeScheme(s)) });
      return;
    }

    const rows = await prisma.scheme.findMany({
      where: { tags: { some: { name: { in: Array.from(interestTags), mode: 'insensitive' } } } },
      include: { tags: true, categories: true },
    });

    const scored = rows
      .map((s) => {
        const matchScore = s.tags.filter((t) => interestTags.has(t.name.toLowerCase())).length;
        return { s, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ data: scored.map(({ s, matchScore }) => serializeScheme(s, matchScore)) });
  }),
);

/**
 * GET /api/schemes/:id
 * MUST be registered after the static sub-paths above (/featured, /states,
 * /recommended) or Express would match them here as an :id value instead.
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      include: { tags: true, categories: true },
    });

    if (!scheme) {
      res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
      return;
    }

    res.json({ data: serializeScheme(scheme) });
  }),
);

export default router;
