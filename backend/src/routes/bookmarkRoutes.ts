// src/routes/bookmarkRoutes.ts
// Saved Schemes API — mounted at /api/bookmarks to match the existing frontend
// bookmarkService.ts contract. Internally backed by the SavedScheme model (B1).
import { Router, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

// All bookmark routes require an authenticated user.
router.use(requireAuth);

// ---- POST /api/bookmarks — save a scheme ----
// Body: { schemeId: string }
// Returns: updated string[] of saved scheme IDs
const postSchema = z.object({
  schemeId: z.string().min(1, 'schemeId is required'),
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const parse = postSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, errors: parse.error.format() });
  }
  const { schemeId } = parse.data;
  const userId = req.user!.userId;

  try {
    // 404 if scheme doesn't exist
    const scheme = await prisma.scheme.findUnique({ where: { id: schemeId }, select: { id: true } });
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }

    // Attempt to create — if @@unique([userId, schemeId]) already exists, no-op cleanly
    try {
      await prisma.savedScheme.create({ data: { userId, schemeId } });
    } catch (e: any) {
      // P2002 = unique constraint violation — already saved, treat as no-op
      if (e.code === 'P2002') {
        const ids = await getSavedIds(userId);
        return res.json({ success: true, alreadySaved: true, data: ids });
      }
      throw e;
    }

    const ids = await getSavedIds(userId);
    return res.json({ success: true, data: ids });
  } catch (e) {
    return next(e);
  }
});

// ---- DELETE /api/bookmarks/:schemeId — unsave a scheme ----
// Returns: updated string[] of saved scheme IDs
router.delete('/:schemeId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { schemeId } = req.params;
  const userId = req.user!.userId;

  try {
    const existing = await prisma.savedScheme.findUnique({
      where: { userId_schemeId: { userId, schemeId } },
      select: { id: true },
    });

    if (!existing) {
      // Not saved — no-op, return current list
      const ids = await getSavedIds(userId);
      return res.json({ success: true, notFound: true, data: ids });
    }

    await prisma.savedScheme.delete({ where: { userId_schemeId: { userId, schemeId } } });

    const ids = await getSavedIds(userId);
    return res.json({ success: true, data: ids });
  } catch (e) {
    return next(e);
  }
});

// ---- GET /api/bookmarks — list saved scheme IDs ----
// Returns: string[] of schemeIds (the frontend fetches full scheme objects separately)
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;
  try {
    const ids = await getSavedIds(userId);
    return res.json(ids);
  } catch (e) {
    return next(e);
  }
});

// ---- Helper ----
async function getSavedIds(userId: string): Promise<string[]> {
  const rows = await prisma.savedScheme.findMany({
    where: { userId },
    select: { schemeId: true },
    orderBy: { savedAt: 'desc' },
  });
  return rows.map(r => r.schemeId);
}

export default router;
