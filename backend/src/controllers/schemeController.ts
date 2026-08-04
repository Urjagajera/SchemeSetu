import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';
import { SchemeLevel } from '@prisma/client';

export const getSchemes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const query = (req.query.query || req.query.q) as string;
    const category = req.query.category as string;
    const level = req.query.level as string;
    const sort = req.query.sort as string;
    const lang = (req.query.lang || 'en') as string;
    const authority = req.query.authority as string;

    const where: any = { AND: [] };

    // Search query matching scheme name, description, authorityName or tags
    if (query && query.trim() !== '') {
      const qClean = query.trim();
      where.AND.push({
        OR: [
          { name: { contains: qClean, mode: 'insensitive' } },
          { description: { contains: qClean, mode: 'insensitive' } },
          { authorityName: { contains: qClean, mode: 'insensitive' } },
          {
            tags: {
              some: {
                tag: {
                  name: { contains: qClean, mode: 'insensitive' }
                }
              }
            }
          }
        ]
      });
    }

    // Category filter matching related Category name
    if (category && category.trim() !== '') {
      where.AND.push({
        categories: {
          some: {
            category: {
              name: {
                equals: category.trim(),
                mode: 'insensitive'
              }
            }
          }
        }
      });
    }

    // Level filter (STATE | CENTRAL)
    if (level && level.trim() !== '') {
      const lvlUpper = level.trim().toUpperCase();
      if (lvlUpper === 'STATE' || lvlUpper === 'CENTRAL') {
        where.AND.push({ level: lvlUpper as SchemeLevel });
      }
    }

    // Authority (State/Ministry) filter
    if (authority && authority.trim() !== '') {
      where.AND.push({
        authorityName: {
          equals: authority.trim(),
          mode: 'insensitive'
        }
      });
    }

    // Tag-based criteria: caste_category, occupation, gender, etc.
    const tagFilters = [
      'gender', 'caste_category', 'income_group', 'age_group', 'sector',
      'benefit_type', 'occupation', 'disability_status', 'marital_family_status', 'tags'
    ];

    for (const filterKey of tagFilters) {
      const val = req.query[filterKey] as string;
      if (val && val.trim() !== '') {
        // Support comma-separated tags or single tag
        const values = val.split(',').map(v => v.trim()).filter(Boolean);
        if (values.length > 0) {
          where.AND.push({
            tags: {
              some: {
                tag: {
                  name: {
                    in: values,
                    mode: 'insensitive'
                  }
                }
              }
            }
          });
        }
      }
    }

    // If AND is empty, clean it up
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'Name A-Z') {
      orderBy = { name: 'asc' };
    } else if (sort === 'Name Z-A') {
      orderBy = { name: 'desc' };
    }

    // Query schemes
    const total = await prisma.scheme.count({ where });
    const schemes = await prisma.scheme.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        translations: lang !== 'en' ? { where: { languageCode: lang } } : false
      }
    });

    // Translate terms on-demand using ValueTranslation if lang is not 'en'
    let translationMap = new Map<string, string>();
    if (lang !== 'en') {
      const valTranslations = await prisma.valueTranslation.findMany({
        where: { languageCode: lang }
      });
      for (const vt of valTranslations) {
        const key = `${vt.fieldType}_${vt.originalValue.toLowerCase()}`;
        translationMap.set(key, vt.translatedValue);
      }
    }

    // Map DB schemes to frontend shape and resolve lang-aware fields
    const data = schemes.map(scheme => {
      // 1. Get raw values
      const tagsList = scheme.tags.map(t => t.tag.name);
      const categoriesList = scheme.categories.map(c => c.category.name);
      const category = categoriesList[0] || 'General';

      // 2. Resolve translations for title and description
      const translation = scheme.translations?.[0];
      const translatedTitle = translation?.translatedName || scheme.name;
      const translatedDescription = translation?.translatedDescription || scheme.description;

      // 3. Resolve translations for tags, categories, levels, and authorities
      let resolvedCategory = category;
      let resolvedCategories = categoriesList;
      let resolvedTags = tagsList;
      let resolvedAuthority = scheme.authorityName;
      let resolvedLevel = scheme.level === 'STATE' ? 'State' : 'Central';

      if (lang !== 'en') {
        resolvedCategory = translationMap.get(`main_category_${category.toLowerCase()}`) || category;
        resolvedCategories = categoriesList.map(c => translationMap.get(`main_category_${c.toLowerCase()}`) || c);
        resolvedTags = tagsList.map(t => translationMap.get(`tag_${t.toLowerCase()}`) || t);
        resolvedAuthority = translationMap.get(`authority_${scheme.authorityName.toLowerCase()}`) || scheme.authorityName;
        resolvedLevel = translationMap.get(`level_${scheme.level.toLowerCase()}`) || resolvedLevel;
      }

      return {
        id: scheme.id,
        name: translatedTitle,
        title: translatedTitle,
        description: translatedDescription,
        shortDesc: translatedDescription.substring(0, 150) + (translatedDescription.length > 150 ? '...' : ''),
        level: resolvedLevel,
        authorityName: resolvedAuthority,
        ministry: resolvedAuthority,
        sourceUrl: scheme.sourceUrl,
        applyUrl: scheme.sourceUrl,
        tags: resolvedTags,
        categories: resolvedCategories,
        category: resolvedCategory,
        categoryColor: 'zinc-100',
        categoryTextColor: 'zinc-800',
        benefit: 'Refer to official portal',
        deadline: 'Ongoing',
        featured: false,
        totalBeneficiaries: 'N/A',
        disbursed: 'N/A',
        eligibility: scheme.eligibility,
        documents: scheme.documents
      };
    });

    res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    next(err);
  }
};

export const getSchemeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang || 'en') as string;

    const scheme = await prisma.scheme.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        translations: lang !== 'en' ? { where: { languageCode: lang } } : false
      }
    });

    if (!scheme) {
      return res.status(404).json({
        error: {
          message: 'Scheme not found',
          status: 404
        }
      });
    }

    // Translate terms on-demand
    let translationMap = new Map<string, string>();
    if (lang !== 'en') {
      const valTranslations = await prisma.valueTranslation.findMany({
        where: { languageCode: lang }
      });
      for (const vt of valTranslations) {
        const key = `${vt.fieldType}_${vt.originalValue.toLowerCase()}`;
        translationMap.set(key, vt.translatedValue);
      }
    }

    const tagsList = scheme.tags.map(t => t.tag.name);
    const categoriesList = scheme.categories.map(c => c.category.name);
    const category = categoriesList[0] || 'General';

    const translation = scheme.translations?.[0];
    const translatedTitle = translation?.translatedName || scheme.name;
    const translatedDescription = translation?.translatedDescription || scheme.description;

    let resolvedCategory = category;
    let resolvedCategories = categoriesList;
    let resolvedTags = tagsList;
    let resolvedAuthority = scheme.authorityName;
    let resolvedLevel = scheme.level === 'STATE' ? 'State' : 'Central';

    if (lang !== 'en') {
      resolvedCategory = translationMap.get(`main_category_${category.toLowerCase()}`) || category;
      resolvedCategories = categoriesList.map(c => translationMap.get(`main_category_${c.toLowerCase()}`) || c);
      resolvedTags = tagsList.map(t => translationMap.get(`tag_${t.toLowerCase()}`) || t);
      resolvedAuthority = translationMap.get(`authority_${scheme.authorityName.toLowerCase()}`) || scheme.authorityName;
      resolvedLevel = translationMap.get(`level_${scheme.level.toLowerCase()}`) || resolvedLevel;
    }

    const data = {
      id: scheme.id,
      name: translatedTitle,
      title: translatedTitle,
      description: translatedDescription,
      shortDesc: translatedDescription.substring(0, 150) + (translatedDescription.length > 150 ? '...' : ''),
      level: resolvedLevel,
      authorityName: resolvedAuthority,
      ministry: resolvedAuthority,
      sourceUrl: scheme.sourceUrl,
      applyUrl: scheme.sourceUrl,
      tags: resolvedTags,
      categories: resolvedCategories,
      category: resolvedCategory,
      categoryColor: 'zinc-100',
      categoryTextColor: 'zinc-800',
      benefit: 'Refer to official portal',
      deadline: 'Ongoing',
      featured: false,
      totalBeneficiaries: 'N/A',
      disbursed: 'N/A',
      eligibility: scheme.eligibility,
      documents: scheme.documents
    };

    res.json({ data });

  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lang = (req.query.lang || 'en') as string;

    const dbCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    const categoryNames = dbCategories.map(c => c.name);

    if (lang === 'en') {
      return res.json({ data: categoryNames });
    }

    // Fetch translations
    const translations = await prisma.valueTranslation.findMany({
      where: {
        fieldType: 'main_category',
        languageCode: lang
      }
    });

    const translationMap = new Map<string, string>();
    for (const t of translations) {
      translationMap.set(t.originalValue.toLowerCase(), t.translatedValue);
    }

    const data = categoryNames.map(c => translationMap.get(c.toLowerCase()) || c);
    res.json({ data });

  } catch (err) {
    next(err);
  }
};

export const getStates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lang = (req.query.lang || 'en') as string;

    // Fetch distinct authorityName values where level is STATE
    const dbSchemes = await prisma.scheme.findMany({
      where: { level: 'STATE' },
      select: { authorityName: true },
      distinct: ['authorityName']
    });

    const stateNames = dbSchemes.map(s => s.authorityName).sort();

    if (lang === 'en') {
      return res.json({ data: stateNames });
    }

    // Fetch translations
    const translations = await prisma.valueTranslation.findMany({
      where: {
        fieldType: 'authority',
        languageCode: lang
      }
    });

    const translationMap = new Map<string, string>();
    for (const t of translations) {
      translationMap.set(t.originalValue.toLowerCase(), t.translatedValue);
    }

    const data = stateNames.map(s => translationMap.get(s.toLowerCase()) || s);
    res.json({ data });

  } catch (err) {
    next(err);
  }
};

export const getTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lang = (req.query.lang || 'en') as string;

    const dbTags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });

    const tagNames = dbTags.map(t => t.name);

    if (lang === 'en') {
      return res.json({ data: tagNames });
    }

    // Fetch translations
    const translations = await prisma.valueTranslation.findMany({
      where: {
        fieldType: 'tag',
        languageCode: lang
      }
    });

    const translationMap = new Map<string, string>();
    for (const t of translations) {
      translationMap.set(t.originalValue.toLowerCase(), t.translatedValue);
    }

    const data = tagNames.map(t => translationMap.get(t.toLowerCase()) || t);
    res.json({ data });

  } catch (err) {
    next(err);
  }
};

export const getFeaturedSchemes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lang = (req.query.lang || 'en') as string;

    // Return the first 3 schemes as featured
    const schemes = await prisma.scheme.findMany({
      take: 3,
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        translations: lang !== 'en' ? { where: { languageCode: lang } } : false
      }
    });

    // Translate terms on-demand
    let translationMap = new Map<string, string>();
    if (lang !== 'en') {
      const valTranslations = await prisma.valueTranslation.findMany({
        where: { languageCode: lang }
      });
      for (const vt of valTranslations) {
        const key = `${vt.fieldType}_${vt.originalValue.toLowerCase()}`;
        translationMap.set(key, vt.translatedValue);
      }
    }

    const data = schemes.map(scheme => {
      const tagsList = scheme.tags.map(t => t.tag.name);
      const categoriesList = scheme.categories.map(c => c.category.name);
      const category = categoriesList[0] || 'General';

      const translation = scheme.translations?.[0];
      const translatedTitle = translation?.translatedName || scheme.name;
      const translatedDescription = translation?.translatedDescription || scheme.description;

      let resolvedCategory = category;
      let resolvedCategories = categoriesList;
      let resolvedTags = tagsList;
      let resolvedAuthority = scheme.authorityName;
      let resolvedLevel = scheme.level === 'STATE' ? 'State' : 'Central';

      if (lang !== 'en') {
        resolvedCategory = translationMap.get(`main_category_${category.toLowerCase()}`) || category;
        resolvedCategories = categoriesList.map(c => translationMap.get(`main_category_${c.toLowerCase()}`) || c);
        resolvedTags = tagsList.map(t => translationMap.get(`tag_${t.toLowerCase()}`) || t);
        resolvedAuthority = translationMap.get(`authority_${scheme.authorityName.toLowerCase()}`) || scheme.authorityName;
        resolvedLevel = translationMap.get(`level_${scheme.level.toLowerCase()}`) || resolvedLevel;
      }

      return {
        id: scheme.id,
        name: translatedTitle,
        title: translatedTitle,
        description: translatedDescription,
        shortDesc: translatedDescription.substring(0, 150) + (translatedDescription.length > 150 ? '...' : ''),
        level: resolvedLevel,
        authorityName: resolvedAuthority,
        ministry: resolvedAuthority,
        sourceUrl: scheme.sourceUrl,
        applyUrl: scheme.sourceUrl,
        tags: resolvedTags,
        categories: resolvedCategories,
        category: resolvedCategory,
        categoryColor: 'zinc-100',
        categoryTextColor: 'zinc-800',
        benefit: 'Refer to official portal',
        deadline: 'Ongoing',
        featured: true,
        totalBeneficiaries: 'N/A',
        disbursed: 'N/A',
        eligibility: scheme.eligibility,
        documents: scheme.documents
      };
    });

    res.json({ data });

  } catch (err) {
    next(err);
  }
};
