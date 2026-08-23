import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();

const DEFAULT_PROFILE = {
  age: '28',
  gender: 'male',
  state: 'Uttar Pradesh',
  category: 'general',
  occupation: 'farmer',
  income: '300000',
  residence: 'rural',
  land: 'yes',
  education: 'graduate',
  minority: 'no',
  disability: 'no',
  farmer: 'yes',
  widow: 'no',
  veteran: 'no',
  interests: ['Farmer', 'Agriculture'],
  profileTags: ['Farmer', 'Agriculture']
};

const profileStore = new Map<string, typeof DEFAULT_PROFILE>();

// GET /api/profile
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId || 'demo-user-123';
  const profile = profileStore.get(userId) || DEFAULT_PROFILE;
  return res.json({ success: true, profile });
});

// PUT /api/profile
router.put('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId || 'demo-user-123';
  const current = profileStore.get(userId) || DEFAULT_PROFILE;
  const updated = { ...current, ...req.body };
  profileStore.set(userId, updated);
  return res.json({ success: true, profile: updated });
});

export default router;
