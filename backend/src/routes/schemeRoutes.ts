import { Router, Request, Response } from 'express';

const router = Router();

const DEFAULT_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

// GET /api/schemes/states
router.get('/states', (_req: Request, res: Response) => {
  return res.json({ success: true, data: DEFAULT_STATES });
});

// GET /api/schemes/featured
router.get('/featured', (_req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
});

// GET /api/schemes/recommended
router.get('/recommended', (_req: Request, res: Response) => {
  return res.json({ success: true, data: [] });
});

// GET /api/schemes/count
router.get('/count', (_req: Request, res: Response) => {
  return res.json({ total: 0 });
});

// GET /api/schemes
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [],
    pagination: { page: 1, limit: 15, total: 0, totalPages: 0 }
  });
});

// GET /api/schemes/:id
router.get('/:id', (_req: Request, res: Response) => {
  return res.status(404).json({ success: false, message: 'Scheme not found in backend API' });
});

export default router;
