import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { IncomingProfile, buildInterestTags } from '../utils/profile.js';

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
 * Today EligibilityCriteria is unpopulated for every scheme (ingestSchemes.ts
 * doesn't touch it), so every scheme currently falls into the tag-matching
 * fallback path — this is expected, not a bug in this route.
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

    if (criteria) {
      const age = parseInt(profile.age ?? '', 10);
      if (criteria.ageMin !== null && !isNaN(age)) {
        structuredChecked++;
        if (age >= criteria.ageMin) passedCriteria.push(`Age ≥ ${criteria.ageMin}`);
        else failedCriteria.push(`Age must be at least ${criteria.ageMin}`);
      }
      if (criteria.ageMax !== null && !isNaN(age)) {
        structuredChecked++;
        if (age <= criteria.ageMax) passedCriteria.push(`Age ≤ ${criteria.ageMax}`);
        else failedCriteria.push(`Age must be at most ${criteria.ageMax}`);
      }

      const income = parseInt(profile.income ?? '', 10);
      if (criteria.incomeMinAnnual !== null && !isNaN(income)) {
        structuredChecked++;
        if (income >= criteria.incomeMinAnnual) passedCriteria.push('Income meets minimum');
        else failedCriteria.push(`Annual income must be at least ₹${criteria.incomeMinAnnual}`);
      }
      if (criteria.incomeMaxAnnual !== null && !isNaN(income)) {
        structuredChecked++;
        if (income <= criteria.incomeMaxAnnual) passedCriteria.push('Income within limit');
        else failedCriteria.push(`Annual income must not exceed ₹${criteria.incomeMaxAnnual}`);
      }

      const stringChecks: Array<[keyof typeof criteria, string | undefined, string]> = [
        ['gender', profile.gender, 'Gender'],
        ['category', profile.category, 'Social category'],
        ['occupation', profile.occupation, 'Occupation'],
        ['state', profile.state, 'State residency'],
        ['landOwnership', profile.land, 'Land ownership'],
      ];
      for (const [field, profileValue, label] of stringChecks) {
        const criteriaValue = criteria[field] as string | null;
        if (criteriaValue !== null && profileValue) {
          structuredChecked++;
          if (criteriaValue.toLowerCase() === profileValue.toLowerCase()) {
            passedCriteria.push(`${label} matches (${criteriaValue})`);
          } else {
            failedCriteria.push(`${label} must be "${criteriaValue}"`);
          }
        }
      }
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
      reasons,
      suggestions: [
        'Add more tags to your profile settings matching your specific occupation, education, or requirements.',
      ],
    });
  }),
);

export default router;
