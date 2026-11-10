import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { FamilyMember } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { profileUpdateSchema, profileFieldErrors } from '../utils/profileSchema.js';
import { ageFromDob } from '../utils/ageFromDob.js';

/**
 * "Family profiles": eligibility answers for someone else (a parent, a child), so a signed-in person can check
 * schemes for them without changing their own profile. Only the answers the eligibility check uses are kept, the
 * same validation as the profile, all optional. A person only ever sees and changes their own family members.
 */
const router = Router();
router.use(requireAuth);

export const MAX_FAMILY_MEMBERS = 6;

const answers = profileUpdateSchema.pick({
  dob: true,
  gender: true,
  occupation: true,
  income: true,
  category: true,
  state: true,
  residence: true,
  land: true,
  govtJob: true,
  incomeTax: true,
  bpl: true,
  pension: true,
});
const createSchema = answers.extend({ label: z.string().trim().min(1, 'Name or relation is required').max(40, 'Name or relation must be 40 characters or fewer') });
const updateSchema = answers.extend({ label: createSchema.shape.label.optional() });

/** The member as the app uses it: a UserProfile-shaped object, with the age worked out from the birth date. */
function serialize(m: FamilyMember) {
  const age = m.dob ? ageFromDob(m.dob) : null;
  return {
    id: m.id,
    label: m.label,
    age: age === null ? undefined : String(age),
    dob: m.dob ?? undefined,
    gender: m.gender ?? undefined,
    occupation: m.occupation ?? undefined,
    income: m.income ?? undefined,
    category: m.category ?? undefined,
    state: m.state ?? undefined,
    residence: m.residence ?? undefined,
    land: m.land ?? undefined,
    govtJob: m.govtJob ?? undefined,
    incomeTax: m.incomeTax ?? undefined,
    bpl: m.bpl ?? undefined,
    pension: m.pension ?? undefined,
  };
}

const badRequest = (res: Response, error: z.ZodError) =>
  res.status(400).json({ error: { message: 'Some answers are not valid', status: 400, fields: profileFieldErrors(error) } });

/** GET /api/family: the caller's family members, oldest first. */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await prisma.familyMember.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'asc' } });
    res.json({ members: rows.map(serialize), max: MAX_FAMILY_MEMBERS });
  }),
);

/** POST /api/family: adds one (at most 6 per account). */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return void badRequest(res, parsed.error);
    const userId = req.user!.userId;
    const count = await prisma.familyMember.count({ where: { userId } });
    if (count >= MAX_FAMILY_MEMBERS) {
      res.status(409).json({ error: { message: `At most ${MAX_FAMILY_MEMBERS} family members`, status: 409 } });
      return;
    }
    const row = await prisma.familyMember.create({ data: { userId, ...parsed.data } as never });
    res.status(201).json(serialize(row));
  }),
);

/** PUT /api/family/:id: changes the answers sent (blank clears one), only for the caller's own member. */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return void badRequest(res, parsed.error);
    const where = { id: req.params.id, userId: req.user!.userId };
    const updated = await prisma.familyMember.updateMany({ where, data: parsed.data as never });
    if (updated.count === 0) {
      res.status(404).json({ error: { message: 'Family member not found', status: 404 } });
      return;
    }
    res.json(serialize((await prisma.familyMember.findFirst({ where }))!));
  }),
);

/** DELETE /api/family/:id: only the caller's own member. */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await prisma.familyMember.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    if (deleted.count === 0) {
      res.status(404).json({ error: { message: 'Family member not found', status: 404 } });
      return;
    }
    res.json({ success: true });
  }),
);

export default router;
