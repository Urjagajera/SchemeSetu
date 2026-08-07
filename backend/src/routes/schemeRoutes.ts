import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';
import { buildProfileKeywords, scoreScheme } from '../services/eligibilityEngine.js';

const router = Router();

// ---------- Shared include option ----------
const schemeIncludes = {
  categories: { select: { category: { select: { id: true, name: true } } } },
  tags: { select: { tag: { select: { id: true, name: true } } } }
};

// ---------- Query validation schemas ----------
const paginationSchema = z.object({
  page: z.string().optional().transform((val) => (val ? Number(val) : 1)).refine((v) => v > 0, { message: 'page must be a positive integer' }),
  limit: z.string().optional().transform((val) => (val ? Number(val) : 20)).refine((v) => v > 0 && v <= 100, { message: 'limit must be between 1 and 100' }),
});

const querySchema = paginationSchema.merge(z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum([
    'Most Relevant',
    'Deadline Approaching',
    'newest',
    'oldest',
    'name_asc',
    'name_desc'
  ]).optional().default('Most Relevant')
}));

const recommendedQuerySchema = paginationSchema;

// ---------- GET /api/schemes/count (lightweight) ----------
router.get('/count', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const total = await prisma.scheme.count();
    return res.json({ total });
  } catch (e) {
    next(e);
  }
});

// ---------- GET /api/schemes (listing) ----------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    const errors = parseResult.error.format();
    return res.status(400).json({ success: false, errors });
  }
  const { page, limit, category, tag, search, sort } = parseResult.data;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  // Filter by category name (case-insensitive). Category.name is @unique so no ambiguity.
  if (category) {
    where.categories = {
      some: { category: { name: { equals: category, mode: 'insensitive' } } }
    };
  }
  // Filter by tag name (case-insensitive). Tag.name is @unique so no ambiguity.
  if (tag) {
    where.tags = {
      some: { tag: { name: { equals: tag, mode: 'insensitive' } } }
    };
  }

  // Resolve sort order mapping
  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (sort === 'name_asc') {
    orderBy = { name: 'asc' };
  } else if (sort === 'name_desc') {
    orderBy = { name: 'desc' };
  } else if (sort === 'Deadline Approaching') {
    // Since deadline is not stored in DB, fallback to oldest (asc) to distinguish from Most Relevant (desc)
    orderBy = { createdAt: 'asc' };
  }

  try {
    const total = await prisma.scheme.count({ where });
    const data = await prisma.scheme.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: schemeIncludes,
      orderBy
    });

    const totalPages = Math.ceil(total / limit);
    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages }
    });
  } catch (e) {
    next(e);
  }
});

// ---------- GET /api/schemes/recommended (protected — personalized to authenticated user) ----------
router.get('/recommended', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;

  const parseResult = recommendedQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.format() });
  }
  const { page, limit } = parseResult.data;

  try {
    // Must have a completed profile
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No profile found. Complete your profile to get personalized recommendations.',
      });
    }

    // Build keyword set from profile
    const profileKeywords = buildProfileKeywords({
      gender:     profile.gender,
      state:      profile.state,
      category:   profile.category,
      occupation: profile.occupation,
      education:  profile.education,
      interests:  profile.interests,
      minority:   profile.minority,
      disability: profile.disability,
      farmer:     profile.farmer,
      widow:      profile.widow,
      veteran:    profile.veteran,
    });

    // Fetch all schemes with categories + tags (no pagination yet — filter in memory, then paginate)
    // For large datasets this should move to DB-side filtering; fine at current scale.
    const allSchemes = await prisma.scheme.findMany({
      include: schemeIncludes,
    });

    // Score and filter
    const scored: Array<typeof allSchemes[0] & { matchScore: number; matchedOn: string[] }> = [];
    for (const scheme of allSchemes) {
      const result = scoreScheme(scheme, profileKeywords, profile.state);
      if (result) {
        scored.push({ ...scheme, matchScore: result.matchScore, matchedOn: result.matchedOn });
      }
    }

    // Sort by matchScore descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    const total      = scored.length;
    const totalPages = Math.ceil(total / limit);
    const data       = scored.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages },
    });
  } catch (e) {
    next(e);
  }
});

// ---------- GET /api/schemes/:id (detail) ----------
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id },
      include: schemeIncludes
    });
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }
    return res.json({ success: true, scheme });
  } catch (e) {
    next(e);
  }
});

export default router;
