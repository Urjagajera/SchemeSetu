import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// A person's own ticks only: the user always comes from the session, never from the request.
router.use(requireAuth);

const MAX_LINES = 200; // the longest list in the data has 154 lines

const lines = z.array(z.string()).max(MAX_LINES, `At most ${MAX_LINES} lines`).default([]);
const checklistBody = z.object({ checked: lines, unchecked: lines });

/**
 * GET /api/checklists/:schemeId
 * { checked, unchecked } for this scheme: lines ticked by hand, and lines unticked although My documents matched them.
 * Both empty when nothing was ever saved.
 */
router.get(
  '/:schemeId',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await prisma.documentChecklist.findUnique({
      where: { userId_schemeId: { userId: req.user!.userId, schemeId: req.params.schemeId } },
    });
    res.json({ checked: row?.checked ?? [], unchecked: row?.unchecked ?? [] });
  }),
);

/**
 * PUT /api/checklists/:schemeId { checked, unchecked }
 * Replaces this scheme's ticks. Only lines that are in the scheme's document list are kept (so nothing else can be
 * stored here), each line once, and a line ticked by hand is never also in `unchecked`. Saving two empty lists
 * removes the row.
 */
router.put(
  '/:schemeId',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = checklistBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid checklist', status: 400 } });
      return;
    }
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.schemeId },
      select: { id: true, documentRequirements: true },
    });
    if (!scheme) {
      res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
      return;
    }

    const known = new Set(scheme.documentRequirements);
    const checked = [...new Set(parsed.data.checked)].filter((l) => known.has(l));
    const unchecked = [...new Set(parsed.data.unchecked)].filter((l) => known.has(l) && !checked.includes(l));
    const userId = req.user!.userId;
    const where = { userId_schemeId: { userId, schemeId: scheme.id } };

    if (checked.length === 0 && unchecked.length === 0) {
      await prisma.documentChecklist.deleteMany({ where: { userId, schemeId: scheme.id } });
    } else {
      await prisma.documentChecklist.upsert({
        where,
        create: { userId, schemeId: scheme.id, checked, unchecked },
        update: { checked, unchecked },
      });
    }
    res.json({ checked, unchecked });
  }),
);

export default router;
