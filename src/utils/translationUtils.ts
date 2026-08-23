const schemeTranslations: Record<string, any> = {};
const valueTranslations: Record<string, any> = {};
import { PHRASES } from '../constants/phrases';
import { Scheme } from '../types';

/**
 * Retrieves translated scheme title or description.
 * Falls back to the original value if translation is missing or language is English.
 */
export function translateSchemeField(
  schemeId: string,
  field: 'name' | 'description' | 'title' | 'shortDesc',
  originalValue: string,
  language: string
): string {
  if (language === 'en') return originalValue;

  const key = `${schemeId}_${language}`;
  const trans = (schemeTranslations as any)[key];
  if (!trans) return originalValue;

  if (field === 'name' || field === 'title') {
    return trans.translatedName || originalValue;
  }
  if (field === 'description') {
    return trans.translatedDescription || originalValue;
  }
  if (field === 'shortDesc') {
    const desc = trans.translatedDescription || originalValue;
    return desc.substring(0, 150) + (desc.length > 150 ? '...' : '');
  }

  return originalValue;
}

/**
 * Retrieves translated category, tag, level, gender or authority name.
 * Falls back to the original value if translation is missing or language is English.
 */
export function translateValue(
  fieldType: 'main_category' | 'authority' | 'tag' | 'level' | 'gender',
  originalValue: string,
  language: string
): string {
  if (!originalValue) return originalValue;
  if (language === 'en') return originalValue;

  const key = `${fieldType}_${originalValue.toLowerCase()}_${language}`;
  return (valueTranslations as any)[key] || originalValue;
}

/**
 * Retrieves translated phrase for eligibility/document keys.
 * Falls back to English phrase, and then to key itself.
 */
export function translatePhrase(key: string, language: string): string {
  const langPhrases = (PHRASES as any)[language] || (PHRASES as any)['en'];
  return langPhrases[key] || (PHRASES as any)['en'][key] || key;
}

/**
 * Helper to return a fully translated Scheme object for the active language.
 */
export function translateScheme(scheme: Scheme, language: string): Scheme {
  if (language === 'en') {
    // If the scheme has raw keys, map them to English strings
    return {
      ...scheme,
      eligibility: scheme.eligibility?.map(key => translatePhrase(key, 'en')) || [],
      documents: scheme.documents?.map(key => translatePhrase(key, 'en')) || []
    };
  }

  const translatedName = translateSchemeField(scheme.id, 'name', scheme.name, language);
  
  return {
    ...scheme,
    name: translatedName,
    title: translatedName,
    description: translateSchemeField(scheme.id, 'description', scheme.description, language),
    shortDesc: translateSchemeField(scheme.id, 'shortDesc', scheme.description, language),
    authorityName: translateValue('authority', scheme.authorityName, language),
    ministry: translateValue('authority', scheme.ministry || scheme.authorityName, language),
    category: translateValue('main_category', scheme.category, language),
    categories: scheme.categories?.map(c => translateValue('main_category', c, language)) || [],
    tags: scheme.tags?.map(t => translateValue('tag', t, language)) || [],
    level: translateValue('level', scheme.level, language) as any,
    eligibility: scheme.eligibility?.map(key => translatePhrase(key, language)) || [],
    documents: scheme.documents?.map(key => translatePhrase(key, language)) || []
  };
}
