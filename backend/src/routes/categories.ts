import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/categories
 * schemeService.getCategories() maps { id, name }[] -> name[] itself, so the
 * raw Category rows are returned as-is. NOTE: the Category table is empty
 * today — ingestSchemes.ts explicitly does not populate it (see its own doc
 * comment) — so this returns [] until a category-ingestion pass runs.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: categories });
  }),
);

export default router;
