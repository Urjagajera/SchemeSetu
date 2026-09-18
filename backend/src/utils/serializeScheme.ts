import { Scheme, Tag, Category } from '@prisma/client';
import { deriveLevel } from './schemeLevel.js';

type SchemeWithRelations = Scheme & {
  tags?: Tag[];
  categories?: Category[];
};

/**
 * Shapes a Prisma Scheme row into the JSON the frontend's schemeService
 * expects (name/description/authorityName/sourceUrl/level + flat string
 * arrays for tags/categories — mapDbSchemeToFrontend() in schemeService.ts
 * already tolerates this exact shape).
 */
export function serializeScheme(scheme: SchemeWithRelations, matchScore?: number) {
  return {
    id: scheme.id,
    name: scheme.name,
    description: scheme.description,
    authorityName: scheme.authorityName,
    sourceUrl: scheme.sourceUrl,
    level: deriveLevel(scheme.authorityName),
    benefits: scheme.benefits,
    documentRequirements: scheme.documentRequirements,
    applicationMode: scheme.applicationMode,
    applicationProcess: scheme.applicationProcess,
    eligibilityRawText: scheme.eligibilityRawText,
    tags: (scheme.tags ?? []).map((t) => t.name),
    categories: (scheme.categories ?? []).map((c) => c.name),
    ...(matchScore !== undefined ? { matchScore } : {}),
  };
}
