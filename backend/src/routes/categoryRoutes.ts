// src/routes/categoryRoutes.ts
import { Router, Request, Response } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

// GET /api/categories — returns all categories ordered by name
router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data });
  } catch (e) {
    console.error('[GET /categories] error:', e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
