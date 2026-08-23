import { Router, Request, Response } from 'express';

const router = Router();

const bookmarkStore = new Set<string>();

// GET /api/bookmarks
router.get('/', (_req: Request, res: Response) => {
  return res.json(Array.from(bookmarkStore));
});

// POST /api/bookmarks
router.post('/', (req: Request, res: Response) => {
  const { schemeId } = req.body;
  if (schemeId && typeof schemeId === 'string') {
    bookmarkStore.add(schemeId);
  }
  return res.json(Array.from(bookmarkStore));
});

// DELETE /api/bookmarks/:schemeId
router.delete('/:schemeId', (req: Request, res: Response) => {
  const { schemeId } = req.params;
  if (schemeId) {
    bookmarkStore.delete(schemeId);
  }
  return res.json(Array.from(bookmarkStore));
});

export default router;
