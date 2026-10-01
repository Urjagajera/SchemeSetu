import { Router, Request, Response } from 'express';
import { enabledLanguage } from '../translation/languages.js';
import { vocabularyFor } from '../translation/vocabulary.js';

const router = Router();

/**
 * GET /api/vocabulary?lang=hi
 * The translated ministry/state names and common tags for one language, as plain lookup tables
 * (English as stored -> translation). For English, an unknown language or one that is not enabled yet, the
 * tables are empty, which the frontend treats as "show English".
 */
router.get('/', (req: Request, res: Response) => {
  res.json({ data: vocabularyFor(enabledLanguage(req.query.lang)) });
});

export default router;
