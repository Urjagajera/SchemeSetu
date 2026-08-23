import { Router, Request, Response } from 'express';

const DEFAULT_CATEGORIES = [
  'Agriculture',
  'Banking, Financial Services and Insurance',
  'Business & Entrepreneurship',
  'Education',
  'Employment',
  'Healthcare',
  'Housing',
  'Public Safety, Law & Justice',
  'Science, IT & Communications',
  'Skills & Employment',
  'Social welfare & Empowerment',
  'Sports & Culture',
  'Transport & Infrastructure',
  'Travel & Tourism',
  'Utility & Sanitation',
  'Women & Child'
].map((name, id) => ({ id: String(id + 1), name }));

const DEFAULT_TAGS = [
  'Agriculture',
  'Farmer',
  'Education',
  'Student',
  'Scholarship',
  'Women',
  'Health',
  'Housing',
  'Employment',
  'Skill',
  'Senior Citizen',
  'Financial Assistance',
  'Pension',
  'Disabled',
  'PwD'
].map((name, id) => ({ id: String(id + 1), name }));

export function createLookupRouter(modelName: 'category' | 'tag') {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const data = modelName === 'category' ? DEFAULT_CATEGORIES : DEFAULT_TAGS;
    return res.json({ success: true, data });
  });

  return router;
}

export default createLookupRouter;
