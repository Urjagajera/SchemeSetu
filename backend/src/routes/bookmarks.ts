import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

async function listBookmarkIds(userId: string): Promise<string[]> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: { schemeId: true },
  });
  return bookmarks.map((b) => b.schemeId);
}

/** GET /api/bookmarks — matches bookmarkService.getBookmarks(): returns string[] of scheme ids. */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await listBookmarkIds(req.user!.userId));
  }),
);

/** POST /api/bookmarks { schemeId } — matches bookmarkService.addBookmark(); idempotent. */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { schemeId } = req.body as { schemeId?: string };
    if (!schemeId) {
      res.status(400).json({ error: { message: 'schemeId is required', status: 400 } });
      return;
    }

    try {
      await prisma.bookmark.create({ data: { userId: req.user!.userId, schemeId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          // Already bookmarked — addBookmark() is idempotent client-side too.
        } else if (err.code === 'P2003') {
          res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
          return;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    res.json(await listBookmarkIds(req.user!.userId));
  }),
);

/** DELETE /api/bookmarks/:schemeId — matches bookmarkService.removeBookmark(). */
router.delete(
  '/:schemeId',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.bookmark.deleteMany({
      where: { userId: req.user!.userId, schemeId: req.params.schemeId },
    });
    res.json(await listBookmarkIds(req.user!.userId));
  }),
);

export default router;
