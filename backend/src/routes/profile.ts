import { Router, Request, Response } from 'express';
import { Profile } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { profileUpdateSchema, profileFieldErrors } from '../utils/profileSchema.js';

const router = Router();

router.use(requireAuth);

/**
 * Serializes a Profile row into the wire shape UserProfile expects.
 * interests and profileTags both mirror the same profileTags column — the
 * current frontend form always writes the identical array to both, so there's
 * one column backing both response keys (see schema comment).
 */
function serializeProfile(row: Profile) {
  return {
    age: row.age ?? undefined,
    dob: row.dob ?? undefined,
    gender: row.gender ?? undefined,
    occupation: row.occupation ?? undefined,
    education: row.education ?? undefined,
    income: row.income ?? undefined,
    category: row.category ?? undefined,
    state: row.state ?? undefined,
    district: row.district ?? undefined,
    residence: row.residence ?? undefined,
    minority: row.minority ?? undefined,
    disability: row.disability ?? undefined,
    farmer: row.farmer ?? undefined,
    widow: row.widow ?? undefined,
    veteran: row.veteran ?? undefined,
    land: row.land ?? undefined,
    interests: row.profileTags,
    profileTags: row.profileTags,
  };
}

/**
 * GET /api/profile
 * Returns { profile: UserProfile | null } — null means this user has never
 * saved a profile yet (a brand new account, or one that predates this route
 * and hasn't been migrated from localStorage yet — see AuthContext.tsx).
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
    res.json({ profile: row ? serializeProfile(row) : null });
  }),
);

/**
 * PUT /api/profile
 * Upserts the caller's profile. The body is validated first (utils/profileSchema.ts): a malformed value
 * rejects the whole request with 400 and a message per field. A profile can be saved partially:
 *   - a field left out of the body is not touched (Prisma treats `undefined` as "leave it"),
 *   - a field sent blank ("" or null) is cleared back to unknown (stored as null),
 *   - a field sent with a value is saved.
 * `name`, if present, updates User.name in the same transaction instead of being stored on Profile.
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = profileUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Some profile fields are not valid', status: 400, fields: profileFieldErrors(parsed.error) } });
      return;
    }
    const body = parsed.data;
    const userId = req.user!.userId;
    const tags = body.profileTags ?? body.interests;

    const data = {
      age: body.age,
      dob: body.dob,
      gender: body.gender,
      occupation: body.occupation,
      education: body.education,
      income: body.income,
      category: body.category,
      state: body.state,
      district: body.district,
      residence: body.residence,
      minority: body.minority,
      disability: body.disability,
      farmer: body.farmer,
      widow: body.widow,
      veteran: body.veteran,
      land: body.land,
      ...(tags !== undefined ? { profileTags: tags } : {}),
    };

    const [row] = await prisma.$transaction([
      prisma.profile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
      ...(body.name !== undefined ? [prisma.user.update({ where: { id: userId }, data: { name: body.name } })] : []),
    ]);

    res.json({ profile: serializeProfile(row) });
  }),
);

export default router;
