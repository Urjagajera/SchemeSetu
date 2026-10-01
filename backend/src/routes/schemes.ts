import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { levelWhereClause } from '../utils/schemeLevel.js';
import { INDIAN_STATES_AND_UTS, canonicalState } from '../utils/states.js';
import { serializeScheme } from '../utils/serializeScheme.js';
import { IncomingProfile, buildInterestTags } from '../utils/profile.js';
import { buildDemographicWhere } from '../utils/demographicFilters.js';
import { enabledLanguage } from '../translation/languages.js';
import { translationService } from '../translation/index.js';
import { evaluateCriteria, unverifiedLabels } from '../utils/criteriaMatch.js';

const router = Router();

/**
 * Card text (translated titles and summaries) for a list of schemes, when a non-English language was asked for.
 * Whatever is already stored comes back immediately, so the first paint of a Hindi list is already Hindi;
 * the rest is started in the background and `translation.status` is "pending" until it lands. Never waits for the model.
 */
async function cardTranslation(rows: Array<{ id: string; name: string; description: string }>, lang: unknown) {
  const language = enabledLanguage(lang);
  if (!language || rows.length === 0) return {};
  return { translation: await translationService.getCardText(rows, language) };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FEATURED_LIMIT = 6;

function parsePagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * GET /api/schemes
 * Query params sent by the frontend (see schemeService.ts / Search.tsx):
 *   query    — free-text search across name/description/authorityName
 *   category — Category.name (join is empty until Category ingestion runs — see report)
 *   level    — "Central" | "State", derived from authorityName (see schemeLevel.ts)
 *   ministry — exact authorityName match (case-insensitive); feeds the Ministry dropdown
 *   state    — keeps central schemes plus state-level schemes of that one state, same
 *              rule the frontend's mock-mode filter uses
 *   gender, socialCategory, age, income — who the scheme is for, from the stored criteria
 *              ("schemes available to me": unrestricted schemes always stay); see utils/demographicFilters.ts
 *   page, limit — pagination (only sent by Search.tsx in non-mock mode)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, category, level, ministry, state, gender, socialCategory, age, income } = req.query as Record<string, string | undefined>;
    const { limit, skip } = parsePagination(req);

    const where: Prisma.SchemeWhereInput = {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { authorityName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {},
        category ? { categories: { some: { name: { equals: category, mode: 'insensitive' } } } } : {},
        levelWhereClause(level) ?? {},
        ministry ? { authorityName: { equals: ministry, mode: 'insensitive' } } : {},
        state
          ? {
              OR: [
                levelWhereClause('central') ?? {},
                { authorityName: { equals: canonicalState(state) ?? state, mode: 'insensitive' } },
              ],
            }
          : {},
        ...buildDemographicWhere({ gender, socialCategory, age, income }),
      ],
    };

    const [rows, total] = await Promise.all([
      prisma.scheme.findMany({
        where,
        include: { tags: true, categories: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.scheme.count({ where }),
    ]);

    res.json({ data: rows.map((s) => serializeScheme(s)), total, ...(await cardTranslation(rows, req.query.lang)) });
  }),
);

/**
 * GET /api/schemes/featured
 * The Scheme model has no "featured" flag (mock-mode data always set featured: false
 * anyway — see schemeService.ts enrichScheme()). No such signal exists in the DB, so
 * this returns a bounded, deterministic sample rather than fabricating a ranking.
 */
router.get(
  '/featured',
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await prisma.scheme.findMany({
      include: { tags: true, categories: true },
      orderBy: { name: 'asc' },
      take: FEATURED_LIMIT,
    });
    res.json({ data: rows.map((s) => serializeScheme(s)), ...(await cardTranslation(rows, req.query.lang)) });
  }),
);

/**
 * GET /api/schemes/states
 * The 28 states and 8 union territories (utils/states.ts), spelled as the scheme data spells them, so the
 * Search filter, the profile form and the guest wizard all offer the same fixed list. A state's own schemes
 * carry its name as their authority, so a value from this list is exactly what the state filters match on.
 */
router.get(
  '/states',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: [...INDIAN_STATES_AND_UTS].sort((a, b) => a.localeCompare(b, 'en')) });
  }),
);

/**
 * GET /api/schemes/ministries
 * Every distinct authorityName across the whole table, for the Search page's
 * Ministry dropdown. The dropdown used to be built client-side from the first
 * page of GET /api/schemes, so it only ever listed the authorities of the first
 * 20 schemes.
 */
router.get(
  '/ministries',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await prisma.scheme.findMany({
      select: { authorityName: true },
      distinct: ['authorityName'],
    });
    const ministries = Array.from(new Set(rows.map((r) => r.authorityName.trim()).filter(Boolean))).sort();
    res.json({ data: ministries });
  }),
);

/**
 * POST /api/schemes/recommended
 * Body: { profile: UserProfile } — was GET with only `lang` as a query param, which
 * meant schemeService.getEligibleSchemes(profile) never actually sent the profile it
 * was given (fixed in the same commit as this route change — see schemeService.ts).
 * POST+body matches how POST /api/eligibility/report already takes a profile, per
 * the fix instructions.
 *
 * Scoring, per scheme, in priority order:
 *   1. Has an EligibilityCriteria row? That's authoritative — must pass every
 *      applicable check (age/income/gender/category/occupation/state/landOwnership)
 *      or it's excluded. Same comparison logic as /api/eligibility/report.
 *   2. No criteria row, but the scheme has tags AND the profile has interest
 *      signals? Included only on tag overlap, scored by overlap count.
 *   3. Neither (no criteria row and no tag overlap) — included by default
 *      (nothing to disqualify it on) with score 0. Since the Phase B ingestion
 *      run, 1,341 of 4,722 schemes have a real EligibilityCriteria row and go
 *      through path 1; the rest fall into path 2 or 3 depending on tags.
 * A real, always-available signal doesn't wait on structured criteria being
 * present: State-level schemes are pre-filtered to the profile's own state
 * (Central schemes always pass through), so two profiles with different
 * `state` values get different result sets regardless of path 1/2/3 above.
 */
router.post(
  '/recommended',
  asyncHandler(async (req: Request, res: Response) => {
    const { profile } = req.body as { profile?: IncomingProfile };

    if (!profile) {
      res.status(400).json({ error: { message: 'profile is required', status: 400 } });
      return;
    }

    const interestTags = buildInterestTags(profile);
    const age = parseInt(profile.age ?? '', 10);
    const income = parseInt(profile.income ?? '', 10);

    // The profile's state is only trusted when it names a real state/UT (any spelling of it). Anything else is
    // treated as not provided: unknown never excludes, so an unrecognised value must not hide every state scheme.
    const state = canonicalState(profile.state);
    const scoringProfile = { ...profile, state: state ?? undefined };
    const where: Prisma.SchemeWhereInput = state
      ? { OR: [levelWhereClause('Central') ?? {}, { authorityName: { equals: state, mode: 'insensitive' } }] }
      : {};

    const rows = await prisma.scheme.findMany({
      where,
      include: { tags: true, categories: true, eligibilityCriteria: true },
    });

    const scored = rows
      .map((s) => {
        const criteria = s.eligibilityCriteria;
        let structuredChecked = 0;
        let structuredPassed = 0;
        let unverified: string[] = [];

        if (criteria) {
          const results = evaluateCriteria(criteria, scoringProfile);
          const answered = results.filter((r) => r.status !== 'unknown');
          structuredChecked = answered.length;
          structuredPassed = answered.filter((r) => r.status === 'passed').length;
          unverified = unverifiedLabels(results);
        }

        const tagNames = s.tags.map((t) => t.name.toLowerCase());
        const tagMatchCount = tagNames.filter((t) => interestTags.has(t)).length;

        let include: boolean;
        let matchScore: number;
        if (structuredChecked > 0) {
          include = structuredPassed === structuredChecked;
          matchScore = structuredPassed;
        } else if (unverified.length > 0) {
          // Criteria are on file but the profile can't answer any of them (empty fields): we can't tell
          // whether they apply, so keep the scheme and let the note say what to add.
          include = true;
          matchScore = 0;
        } else if (tagNames.length > 0 && interestTags.size > 0) {
          include = tagMatchCount > 0;
          matchScore = tagMatchCount;
        } else {
          include = true;
          matchScore = 0;
        }

        return { s, matchScore, include, unverified };
      })
      .filter((r) => r.include)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, DEFAULT_LIMIT);

    res.json({
      data: scored.map(({ s, matchScore, unverified }) => serializeScheme(s, matchScore, unverified)),
      ...(await cardTranslation(scored.map(({ s }) => s), req.query.lang)),
    });
  }),
);

/**
 * GET /api/schemes/titles?lang=hi&ids=a,b,c
 * Translated titles and short summaries for a page of cards (search results, related schemes...), up to
 * MAX_TITLE_IDS ids. Returns `{ data: { language, status, titles, summaries, pending, failed } }` (each map is
 * { [schemeId]: text }) and never waits for the model: what isn't ready yet is simply missing (the card keeps the
 * English text) and `status` is "pending" so the caller asks again. English or a language that isn't enabled gets an empty `titles`.
 */
const MAX_TITLE_IDS = 100;
router.get(
  '/titles',
  asyncHandler(async (req: Request, res: Response) => {
    const language = enabledLanguage(req.query.lang);
    if (!language) {
      res.json({ data: { language: 'en', status: 'ready', titles: {}, summaries: {}, pending: 0, failed: 0 } });
      return;
    }
    const ids = [...new Set(String(req.query.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_TITLE_IDS);
    const schemes = ids.length === 0 ? [] : await prisma.scheme.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, description: true } });
    res.json({ data: await translationService.getCardText(schemes, language) });
  }),
);

/**
 * GET /api/schemes/:id
 * MUST be registered after the static sub-paths above (/featured, /states,
 * /recommended) or Express would match them here as an :id value instead.
 */
/**
 * GET /api/schemes/:id
 * Optional ?lang=hi (Hindi is enabled; others are ignored) adds `translation: { status, fields, pendingFields,
 * failedFields }` next to the English `data`. Fields not in `translation.fields` are still English.
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const scheme = await prisma.scheme.findUnique({
      where: { id: req.params.id },
      include: { tags: true, categories: true },
    });

    if (!scheme) {
      res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
      return;
    }

    const data = serializeScheme(scheme);

    // ?lang=hi: also report the translation state. The response never waits for the model: it returns the
    // English scheme plus whatever is already translated, starts translating the rest in the background on
    // first view, and the client asks again a few seconds later (see translation/service.ts).
    const language = enabledLanguage(req.query.lang);
    if (!language) {
      res.json({ data });
      return;
    }
    res.json({ data, translation: await translationService.getForView(scheme, language) });
  }),
);

export default router;
