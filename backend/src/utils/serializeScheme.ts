import { Scheme, Tag, Category } from '@prisma/client';
import { deriveLevel } from './schemeLevel.js';

type SchemeWithRelations = Scheme & {
  tags?: Tag[];
  categories?: Category[];
};

/**
 * Shapes a Prisma Scheme row into the frontend's Scheme type (types/index.ts).
 *
 * mapDbSchemeToFrontend() + enrichScheme() in schemeService.ts define that
 * contract, but — found during live verification (Playwright against the real
 * app) — are NEVER actually called on real-backend responses; getSchemes() et
 * al. just cast the raw axios payload straight to Scheme[]. So this route is
 * the only place that ever fills in the "compatibility" fields the UI reads
 * unguarded (SchemeCard.tsx: rawScheme.category.toLowerCase(),
 * s.deadline.toLowerCase(); SchemeDetail.tsx: translatedScheme.benefit.split(...)).
 * Omitting them isn't a stylistic gap, it's a live crash — reproduced directly:
 * "Cannot read properties of undefined (reading 'toLowerCase')" on /search.
 *
 * Every field below is either real ingested data or an honest derivation of
 * it (category from the join, shortDesc truncating the real description,
 * applyUrl/ministry aliasing real columns). Deliberately NOT replicated:
 * enrichScheme()'s hash-based fake deadline generator and its synthesized
 * eligibility/document *key* arrays — those exist only to make the mock-data
 * demo look populated, and fabricating them here would mean presenting made-up
 * deadlines and checklists as if they were real scheme data. 'Ongoing' /
 * 'N/A' / omitted are honest for data that plainly doesn't exist yet; every
 * reader of eligibility/documents already guards for that (`|| []` / `?.`),
 * confirmed by inspecting Compare.tsx and translationUtils.ts before deciding
 * this was safe to leave out.
 */
export function serializeScheme(scheme: SchemeWithRelations, matchScore?: number) {
  const categories = (scheme.categories ?? []).map((c) => c.name);
  const category = categories[0] || 'General';

  return {
    id: scheme.id,
    name: scheme.name,
    description: scheme.description,
    shortDesc: scheme.description.length > 150 ? `${scheme.description.slice(0, 150)}...` : scheme.description,
    authorityName: scheme.authorityName,
    ministry: scheme.authorityName,
    sourceUrl: scheme.sourceUrl,
    applyUrl: scheme.sourceUrl,
    level: deriveLevel(scheme.authorityName),
    category,
    categories,
    tags: (scheme.tags ?? []).map((t) => t.name),
    benefit: scheme.benefits[0] ?? 'Refer to official portal for benefit details',
    benefits: scheme.benefits,
    documentRequirements: scheme.documentRequirements,
    applicationMode: scheme.applicationMode,
    applicationProcess: scheme.applicationProcess,
    eligibilityRawText: scheme.eligibilityRawText,
    deadline: 'Ongoing', // no deadline data exists in the ingested dataset — this is accurate, not a placeholder for missing work
    featured: false, // Scheme has no "featured" concept — see schemes.ts's /featured route comment
    totalBeneficiaries: 'N/A',
    disbursed: 'N/A',
    ...(matchScore !== undefined ? { matchScore } : {}),
  };
}
