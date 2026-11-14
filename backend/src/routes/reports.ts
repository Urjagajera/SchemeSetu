import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/reports { schemeId, reason, message? }
 * "Report a wrong scheme": anyone (signed in or not) can say something on a scheme's page looks wrong. Stored
 * anonymously: the scheme, the kind of problem, the optional note and the date. No user, no IP address.
 * Read by the project owner in the weekly job's report (scraper/run.ts).
 */
export const REPORT_REASONS = ['eligibility', 'benefits', 'documents', 'apply', 'closed', 'translation', 'other'] as const;
export const MAX_REPORT_MESSAGE = 1000;

const body = z.object({
  schemeId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  message: z
    .string()
    .trim()
    .max(MAX_REPORT_MESSAGE)
    .optional()
    .transform((m) => (m ? m : undefined)),
});

const router = Router();

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = body.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid report', status: 400 } });
      return;
    }
    const { schemeId, reason, message } = parsed.data;
    const scheme = await prisma.scheme.findUnique({ where: { id: schemeId }, select: { id: true } });
    if (!scheme) {
      res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
      return;
    }
    await prisma.schemeReport.create({ data: { schemeId, reason, message: message ?? null } });
    res.status(201).json({ ok: true });
  }),
);

export default router;
