import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { IncomingProfile, buildInterestTags } from '../utils/profile.js';
import { evaluateCriteria, unverifiedLabels } from '../utils/criteriaMatch.js';

const router = Router();

/**
 * POST /api/eligibility/report
 * Body: { profile: UserProfile, schemeId: string } — matches eligibilityService.ts's
 * actual call (axios.post(`${API_URL}/report`, ...)), not the literal "/check" path
 * named in the task — see final report for this and the other path corrections.
 *
 * Extends the original client-side tag-matching (eligibilityService.ts
 * evaluateLocalReport) rather than replacing it: structured EligibilityCriteria
 * comparisons (age/income/gender/category/occupation/state/landOwnership) are
 * authoritative when a scheme HAS criteria on file; tag-matching remains the
 * fallback signal used when a scheme has no EligibilityCriteria row at all.
 * Schemes with a real EligibilityCriteria row (age, income, and now gender and
 * social category, parsed at ingestion) go through the structured comparison path
 * below; the rest still fall into the tag-matching fallback. gender and category
 * are stored as comma-separated sets, so they pass on set membership
 * (utils/criteriaMatch.ts); occupation/state/landOwnership are not populated yet
 * and stay plain equality.
 */
router.post(
  '/report',
  asyncHandler(async (req: Request, res: Response) => {
    const { profile, schemeId } = req.body as { profile?: IncomingProfile; schemeId?: string };

    if (!profile || !schemeId) {
      res.status(400).json({ error: { message: 'profile and schemeId are required', status: 400 } });
      return;
    }

    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: { tags: true, eligibilityCriteria: true },
    });

    if (!scheme) {
      res.status(404).json({ error: { message: 'Scheme not found', status: 404 } });
      return;
    }

    const passedCriteria: string[] = [];
    const failedCriteria: string[] = [];
    const criteria = scheme.eligibilityCriteria;
    let structuredChecked = 0;
    // Criteria on file that the profile couldn't answer (empty field). They never count against
    // the user: the scheme stays eligible and the UI tells them what to add to their profile.
    let unverifiedCriteria: string[] = [];

    if (criteria) {
      const results = evaluateCriteria(criteria, profile);
      for (const r of results) {
        if (r.status === 'passed') passedCriteria.push(r.message);
        else if (r.status === 'failed') failedCriteria.push(r.message);
      }
      structuredChecked = passedCriteria.length + failedCriteria.length;
      unverifiedCriteria = unverifiedLabels(results);
    }

    const interests = buildInterestTags(profile);
    const tags = scheme.tags.map((t) => t.name);
    const totalTags = tags.length || 1;
    let tagPassedCount = 0;
    const tagPassed: string[] = [];
    const tagFailed: string[] = [];
    tags.forEach((tag) => {
      if (interests.has(tag.toLowerCase())) {
        tagPassedCount++;
        tagPassed.push(`Interest match: "${tag}"`);
      } else {
        tagFailed.push(`Keyword mismatch: "${tag}"`);
      }
    });

    let overallMatch: number;
    let isEligible: boolean;
    let reasons: string[];

    if (structuredChecked > 0) {
      overallMatch = Math.round((passedCriteria.length / structuredChecked) * 100);
      isEligible = failedCriteria.length === 0;
      reasons = [
        `Matched ${passedCriteria.length} of ${structuredChecked} structured eligibility criteria on file for this scheme.`,
      ];
    } else if (unverifiedCriteria.length > 0) {
      // Criteria are on file but the profile answers none of them (empty fields). We simply can't tell, so:
      // not ineligible, no match percentage, and no keyword-mismatch noise posing as "missing requirements".
      overallMatch = 0;
      isEligible = true;
      reasons = [
        `This scheme has eligibility criteria on file, but your profile doesn't say: ${unverifiedCriteria.join(', ')}. Add them to your profile to check.`,
      ];
    } else {
      overallMatch = Math.round((tagPassedCount / totalTags) * 100);
      isEligible = overallMatch >= 50;
      passedCriteria.push(...tagPassed);
      failedCriteria.push(...tagFailed);
      reasons = [
        `No structured eligibility criteria on file for this scheme yet — matched ${tagPassedCount} of ${tags.length} profile/tag signals instead.`,
      ];
    }

    res.json({
      schemeId: scheme.id,
      schemeTitle: scheme.name,
      overallMatch,
      isEligible,
      passedCriteria,
      failedCriteria,
      unverifiedCriteria,
      reasons,
      suggestions: [
        'Add more tags to your profile settings matching your specific occupation, education, or requirements.',
      ],
    });
  }),
);

export default router;
