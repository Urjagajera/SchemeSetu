import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

export function createLookupRouter(modelName: 'category' | 'tag') {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = modelName === 'category'
        ? await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
        : await prisma.tag.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
      
      return res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
