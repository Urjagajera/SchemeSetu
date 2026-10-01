import { Router, Request, Response } from 'express';
import { Profile } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * Body shape for PUT /api/profile — matches UserProfile (src/types/index.ts),
 * minus name (updates User.name directly, not stored here — see the schema
 * comment on the Profile model) and the auth-derived fields (email, picture,
 * role, sub) that don't belong on a profile update at all.
 */
interface ProfileUpdateBody {
  name?: string;
  age?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  education?: string;
  income?: string;
  category?: string;
  state?: string;
  district?: string;
  residence?: string;
  minority?: string;
  disability?: string;
  farmer?: string;
  widow?: string;
  veteran?: string;
  land?: string;
  interests?: string[];
  profileTags?: string[];
}

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
 * Upserts the caller's profile. Only fields present in the body are written
 * (Prisma treats `undefined` as "don't touch this field" in both create and
 * update), matching AuthContext's existing updateProfile(Partial<UserProfile>)
 * signature. `name`, if present, updates User.name in the same transaction
 * instead of being stored on Profile.
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ProfileUpdateBody;
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
