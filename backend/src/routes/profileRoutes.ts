import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';
import { z } from 'zod';
import { ZodError } from 'zod';

const router = Router();

// Zod schema for profile creation / update (all fields optional for PATCH)
const baseProfileSchema = z.object({
  age: z.string().min(1),
  gender: z.string().min(1),
  state: z.string().min(1),
  category: z.string().min(1),
  occupation: z.string().min(1),
  income: z.string().min(1),
  residence: z.string().min(1),
  land: z.string().min(1),
  education: z.string().min(1),
  interests: z.array(z.string()).optional(),
  dob: z.preprocess((arg) => (typeof arg === 'string' && arg ? new Date(arg) : undefined), z.date().optional()),
  district: z.string().optional(),
  // UI sends "yes"/"no" strings – convert to booleans
  minority: z.preprocess((arg) => (arg === 'yes' ? true : arg === 'no' ? false : undefined), z.boolean().optional()),
  disability: z.preprocess((arg) => (arg === 'yes' ? true : arg === 'no' ? false : undefined), z.boolean().optional()),
  farmer: z.preprocess((arg) => (arg === 'yes' ? true : arg === 'no' ? false : undefined), z.boolean().optional()),
  widow: z.preprocess((arg) => (arg === 'yes' ? true : arg === 'no' ? false : undefined), z.boolean().optional()),
  veteran: z.preprocess((arg) => (arg === 'yes' ? true : arg === 'no' ? false : undefined), z.boolean().optional()),
  // name belongs to User, not Profile – handled separately in PATCH
  name: z.string().optional()
});

// CREATE profile – one‑time only
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;

  // Validate payload
  const parseResult = baseProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    const message = parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
    return res.status(400).json({ success: false, message: `Validation failed: ${message}` });
  }
  const data = parseResult.data;

  // Ensure no profile exists yet
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Profile already exists for this user' });
  }

  // Create profile (User name is not part of this endpoint)
  try {
    const profile = await prisma.profile.create({
      data: {
        userId,
        age: data.age,
        gender: data.gender,
        state: data.state,
        category: data.category,
        occupation: data.occupation,
        income: data.income,
        residence: data.residence,
        land: data.land,
        education: data.education,
        interests: data.interests ?? [],
        dob: data.dob,
        district: data.district,
        minority: data.minority ?? false,
        disability: data.disability ?? false,
        farmer: data.farmer ?? false,
        widow: data.widow ?? false,
        veteran: data.veteran ?? false
      }
    });
    res.status(201).json({ success: true, profile });
  } catch (e) {
    next(e);
  }
});

// GET own profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    return res.json({ success: true, profile });
  } catch (e) {
    return next(e);
  }
});

// PATCH own profile – also allows updating User.name
router.patch('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user!.userId;

  const parseResult = baseProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    const message = parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
    return res.status(400).json({ success: false, message: `Validation failed: ${message}` });
  }
  const data = parseResult.data;

  // Build update objects conditionally (exclude undefined)
  const profileUpdates: any = {};
  const userUpdates: any = {};

  // Profile fields
  const profileFields = [
    'age', 'gender', 'state', 'category', 'occupation', 'income', 'residence',
    'land', 'education', 'interests', 'dob', 'district',
    'minority', 'disability', 'farmer', 'widow', 'veteran'
  ];
  for (const field of profileFields) {
    if (data[field as keyof typeof data] !== undefined) {
      // @ts-ignore – dynamic assignment
      profileUpdates[field] = data[field as keyof typeof data];
    }
  }

  // User name (optional)
  if (data.name !== undefined) {
    userUpdates.name = data.name;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length) {
        await tx.user.update({ where: { id: userId }, data: userUpdates });
      }
      if (Object.keys(profileUpdates).length) {
        await tx.profile.update({ where: { userId }, data: profileUpdates });
      }
      // Return fresh profile after updates
      return tx.profile.findUnique({ where: { userId } });
    });
    res.json({ success: true, profile: result });
  } catch (e) {
    next(e);
  }
});

export default router;
