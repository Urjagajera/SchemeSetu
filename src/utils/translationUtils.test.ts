import { describe, it, expect } from 'vitest';
import { applyServerTranslation, applyVocabulary, translatePhrase, translateScheme, translateValue } from './translationUtils';
import { PHRASES } from '../constants/phrases';
import { makeScheme, makeTranslation, makeVocabulary } from '../test/factories';

describe('applyServerTranslation', () => {
  const english = makeScheme({
    name: 'Post Matric Scholarship',
    description: 'English description',
    benefits: ['English benefit'],
    eligibilityRawText: ['English rule'],
    documentRequirements: ['English document'],
    applicationProcess: 'English steps',
  });

  it('returns the scheme untouched for English, with no translation, or for a different language', () => {
    const tr = makeTranslation({ fields: { title: 'हिंदी शीर्षक' } });
    expect(applyServerTranslation({ ...english, translation: tr }, 'en')).toEqual({ ...english, translation: tr });
    expect(applyServerTranslation(english, 'hi')).toBe(english);
    // the page switched to Gujarati while a Hindi answer was still on the scheme
    expect(applyServerTranslation({ ...english, translation: tr }, 'gu').name).toBe('Post Matric Scholarship');
  });

  it('puts each translated field on the matching scheme field', () => {
    const tr = makeTranslation({
      fields: {
        title: 'छात्रवृत्ति',
        description: 'हिंदी विवरण',
        benefits: ['हिंदी लाभ'],
        eligibility: ['हिंदी नियम'],
        documents: ['हिंदी दस्तावेज़'],
        applicationProcess: 'हिंदी चरण',
      },
    });
    const out = applyServerTranslation({ ...english, translation: tr }, 'hi');
    expect(out).toMatchObject({
      name: 'छात्रवृत्ति',
      description: 'हिंदी विवरण',
      benefits: ['हिंदी लाभ'],
      eligibilityRawText: ['हिंदी नियम'],
      documentRequirements: ['हिंदी दस्तावेज़'],
      applicationProcess: 'हिंदी चरण',
    });
  });

  it('keeps English for any field that has not arrived or came back blank (partly translated page)', () => {
    const tr = makeTranslation({ status: 'partial', fields: { title: 'छात्रवृत्ति', description: '   ', benefits: [] } });
    const out = applyServerTranslation({ ...english, translation: tr }, 'hi');
    expect(out.name).toBe('छात्रवृत्ति');
    expect(out.description).toBe('English description');
    expect(out.benefits).toEqual(['English benefit']);
    expect(out.eligibilityRawText).toEqual(['English rule']);
    expect(out.applicationProcess).toBe('English steps');
  });
});

describe('applyVocabulary', () => {
  const scheme = makeScheme({
    category: 'Education',
    categories: ['Education', 'Welfare'],
    ministry: 'Ministry of Education',
    authorityName: 'Ministry of Education',
    tags: ['Student', 'Scholarship', 'Rare Tag'],
  });
  const vocab = makeVocabulary({
    names: { Education: 'शिक्षा', 'Ministry of Education': 'शिक्षा मंत्रालय' },
    tags: { Student: 'छात्र', Scholarship: 'छात्रवृत्ति' },
  });

  it('does nothing in English', () => {
    expect(applyVocabulary(scheme, 'en', vocab, false)).toBe(scheme);
  });

  it('holds all tags back while the vocabulary loads, so English chips never flash', () => {
    const out = applyVocabulary(scheme, 'hi', null, true);
    expect(out.tags).toEqual([]);
    expect(out.category).toBe('Education');
  });

  it('does nothing when there is no vocabulary, or it is for another language', () => {
    expect(applyVocabulary(scheme, 'hi', null, false)).toBe(scheme);
    expect(applyVocabulary(scheme, 'hi', makeVocabulary({ language: 'gu', names: { Education: 'શિક્ષણ' } }), false)).toBe(scheme);
  });

  it('translates category, categories, ministry and authority, leaving unknown names in English', () => {
    const out = applyVocabulary(scheme, 'hi', vocab, false);
    expect(out.category).toBe('शिक्षा');
    expect(out.categories).toEqual(['शिक्षा', 'Welfare']);
    expect(out.ministry).toBe('शिक्षा मंत्रालय');
    expect(out.authorityName).toBe('शिक्षा मंत्रालय');
  });

  it('shows only the tags that have a translation (English chips among Hindi ones look broken)', () => {
    expect(applyVocabulary(scheme, 'hi', vocab, false).tags).toEqual(['छात्र', 'छात्रवृत्ति']);
  });

  it('keeps the English tags when the language has no tag table at all', () => {
    const noTags = makeVocabulary({ names: { Education: 'शिक्षा' }, tags: {} });
    expect(applyVocabulary(scheme, 'hi', noTags, false).tags).toEqual(['Student', 'Scholarship', 'Rare Tag']);
  });
});

describe('phrase and value lookups', () => {
  it('translatePhrase falls back to English, then to the key itself', () => {
    const phrases = PHRASES as unknown as Record<string, Record<string, string>>;
    expect(translatePhrase('citizenOfIndia', 'en')).toBe(phrases.en.citizenOfIndia);
    expect(translatePhrase('citizenOfIndia', 'xx')).toBe(phrases.en.citizenOfIndia);
    expect(translatePhrase('someKeyNobodyDefined', 'hi')).toBe('someKeyNobodyDefined');
  });

  it('translateValue returns the original for English, empty input, and anything it cannot translate', () => {
    expect(translateValue('tag', 'Student', 'en')).toBe('Student');
    expect(translateValue('tag', '', 'hi')).toBe('');
    expect(translateValue('tag', 'Student', 'hi')).toBe('Student');
  });

  it('translateScheme turns the stored phrase keys into English sentences', () => {
    const out = translateScheme(makeScheme({ eligibility: ['citizenOfIndia'], documents: ['aadhaarCard'] }), 'en');
    expect(out.eligibility).toEqual([translatePhrase('citizenOfIndia', 'en')]);
    expect(out.documents).toEqual(['Aadhaar Card']);
  });
});
