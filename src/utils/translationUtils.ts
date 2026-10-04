const schemeTranslations: Record<string, any> = {};
const valueTranslations: Record<string, any> = {};
import { PHRASES } from '../constants/phrases';
import { Scheme, Vocabulary } from '../types';
import { stripDetailsHeading } from './descriptionText';

/**
 * Retrieves translated scheme title or description.
 * Falls back to the original value if translation is missing or language is English.
 */
export function translateSchemeField(
  schemeId: string,
  field: 'name' | 'description' | 'shortDesc',
  originalValue: string,
  language: string
): string {
  if (language === 'en') return originalValue;

  const key = `${schemeId}_${language}`;
  const trans = (schemeTranslations as any)[key];
  if (!trans) return originalValue;

  if (field === 'name') {
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
      shortDesc: stripDetailsHeading(scheme.shortDesc),
      eligibility: scheme.eligibility?.map(key => translatePhrase(key, 'en')) || [],
      documents: scheme.documents?.map(key => translatePhrase(key, 'en')) || []
    };
  }

  const translatedName = translateSchemeField(scheme.id, 'name', scheme.name, language);
  
  return {
    ...scheme,
    name: translatedName,
    description: translateSchemeField(scheme.id, 'description', scheme.description, language),
    shortDesc: stripDetailsHeading(translateSchemeField(scheme.id, 'shortDesc', scheme.description, language)),
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

/**
 * Puts the server-translated fields (title, description, benefits, eligibility, documents, application
 * process) on top of the English scheme. Only fields the server has actually translated are replaced, so a
 * scheme that is still translating, or whose translation partly failed, shows English for the rest.
 */
export function applyServerTranslation(scheme: Scheme, language: string): Scheme {
  const tr = scheme.translation;
  if (!tr || language === 'en' || tr.language !== language) return scheme;
  const f = tr.fields;
  const text = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v : undefined);
  const list = (v: string | string[] | undefined): string[] | undefined => (Array.isArray(v) && v.length > 0 ? v : undefined);
  return {
    ...scheme,
    name: text(f.title) ?? scheme.name,
    description: text(f.description) ?? scheme.description,
    benefits: list(f.benefits) ?? scheme.benefits,
    eligibilityRawText: list(f.eligibility) ?? scheme.eligibilityRawText,
    documentRequirements: list(f.documents) ?? scheme.documentRequirements,
    applicationProcess: text(f.applicationProcess) ?? scheme.applicationProcess,
  };
}

/**
 * Shows the category badge, ministry line and tag chips in the chosen language, from the server's vocabulary.
 * A name with no translation stays English. Tags work differently: in a non-English language a tag without
 * a translation is hidden (a few English chips among Hindi ones look broken), and while the vocabulary is
 * still loading all tags are held back, so English tags don't flash before they swap.
 * If the language has no vocabulary at all (English, or a language that is not enabled), nothing changes.
 */
export function applyVocabulary(scheme: Scheme, language: string, vocab: Vocabulary | null, loading: boolean): Scheme {
  if (language === 'en') return scheme;
  if (loading) return { ...scheme, tags: [] };
  if (!vocab || vocab.language !== language) return scheme;

  const name = (v: string | undefined): string | undefined => (v === undefined ? v : vocab.names[v.trim()] ?? v);
  const hasTagTable = Object.keys(vocab.tags).length > 0;
  return {
    ...scheme,
    category: name(scheme.category) ?? scheme.category,
    categories: scheme.categories?.map((c) => name(c) ?? c),
    ministry: name(scheme.ministry) ?? scheme.ministry,
    authorityName: name(scheme.authorityName) ?? scheme.authorityName,
    tags: hasTagTable ? (scheme.tags ?? []).filter((t) => vocab.tags[t]).map((t) => vocab.tags[t]) : scheme.tags,
  };
}
