import { describe, it, expect } from 'vitest';
import { validateText, validateList } from './validate.js';
import { LANGUAGES } from './languages.js';
import { glossaryHits } from './glossary.js';

const hi = LANGUAGES.hi;
const gu = LANGUAGES.gu;

// Real strings from the calibration run (backend/reports/translation-calibration.md).
const ELIGIBILITY_EN = 'The applicant should belong to the Scheduled Caste community';
const ELIGIBILITY_HI = 'आवेदक को शेड्यूल्ड कास्ट समुदाय से होना चाहिए।';

describe('validateText', () => {
  it('accepts a real Hindi translation', () => {
    const r = validateText(ELIGIBILITY_EN, ELIGIBILITY_HI, hi);
    expect(r.ok).toBe(true);
    expect(r.nativePct).toBeGreaterThanOrEqual(90);
  });

  it('rejects the silent skip: the English copied back unchanged', () => {
    const r = validateText(ELIGIBILITY_EN, ELIGIBILITY_EN, hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/unchanged/);
  });

  it('rejects text that is mostly still English (a half-done translation)', () => {
    const src = 'Step 1: Visit the Official Website of the Chief Minister Scholarship Portal, Government of Goa. Step 2: Click on Register at the top right corner of the landing page.';
    const out = 'Step 1: Visit the Official Website of the Chief Minister Scholarship Portal, गोवा सरकार. Step 2: Click on Register at the top right corner of the पेज.';
    const r = validateText(src, out, hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/script/);
  });

  it('applies the same checks to Gujarati', () => {
    expect(validateText('The applicant should be a Student.', 'અરજદાર વિદ્યાર્થી હોવો જોઈએ.', gu).ok).toBe(true);
    expect(validateText('The applicant should be a Student.', 'The applicant should be a Student.', gu).ok).toBe(false);
    // Hindi text is not an acceptable Gujarati translation
    expect(validateText('The applicant should be a Student.', 'आवेदक को छात्र होना चाहिए।', gu).ok).toBe(false);
  });

  it('requires every number and amount to survive, in ASCII or native digits', () => {
    const src = 'For Day Scholars: ₹750 per month and ₹10,000 per year';
    expect(validateText(src, 'डेज़ स्कॉलर्स के लिए: ₹750 प्रति माह और ₹10,000 प्रति वर्ष', hi).ok).toBe(true);
    expect(validateText(src, 'डेज़ स्कॉलर्स के लिए: ₹७५० प्रति माह और ₹१०,००० प्रति वर्ष', hi).ok).toBe(true);
    const bad = validateText(src, 'डेज़ स्कॉलर्स के लिए: ₹750 प्रति माह और ₹5,000 प्रति वर्ष', hi);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/numbers missing/);
  });

  it('requires URLs and emails to be kept verbatim', () => {
    const src = 'Apply at https://www.standupmitra.in/Login/Register or write to help@example.gov.in for support.';
    const good = 'आवेदन https://www.standupmitra.in/Login/Register पर करें या सहायता के लिए help@example.gov.in पर लिखें।';
    expect(validateText(src, good, hi).ok).toBe(true);
    const bad = validateText(src, 'आवेदन वेबसाइट पर करें या सहायता के लिए ईमेल करें।', hi);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/URLs/);
  });

  it('catches merged or dropped lines in multi-line text', () => {
    const src = Array.from({ length: 10 }, (_, i) => `Step ${i + 1}: Click the button on the portal page`).join('\n');
    const merged = 'चरण 1 से 10: पोर्टल पेज पर बटन पर क्लिक करें, सभी चरणों के लिए एक ही प्रक्रिया है।';
    const r = validateText(src, merged, hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/line count/);
    const kept = Array.from({ length: 10 }, (_, i) => `चरण ${i + 1}: पोर्टल पेज पर बटन पर क्लिक करें`).join('\n');
    expect(validateText(src, kept, hi).ok).toBe(true);
  });

  it('flags output that is far shorter than the source (cut off)', () => {
    const src = 'The scheme provides financial assistance to eligible students for higher education across the state, including tuition and hostel costs for the full duration of the course.';
    const r = validateText(src, 'योजना सहायता', hi);
    expect(r.ok).toBe(false);
  });

  it('does not demand translation of text that has nothing to translate (acronyms, codes)', () => {
    expect(validateText('PAN', 'PAN', hi).ok).toBe(true);
    expect(validateText('SC/ST', 'SC/ST', hi).ok).toBe(true);
  });

  it('rejects non-string and empty output', () => {
    expect(validateText('Aadhaar Card', undefined, hi).ok).toBe(false);
    expect(validateText('Aadhaar Card', '   ', hi).ok).toBe(false);
  });
});

describe('glossary', () => {
  const src = 'The NGO registered with the National Trust logs in to the National Trust website.';

  it('only asks for the entries that appear in the text', () => {
    expect(glossaryHits([src], 'hi')).toEqual([{ en: 'National Trust', target: 'नेशनल ट्रस्ट' }]);
    expect(glossaryHits(['Aadhaar Card'], 'hi')).toEqual([]);
  });

  it('rejects the literal "national faith" mistranslation found in calibration', () => {
    const req = glossaryHits([src], 'hi');
    const literal = 'राष्ट्रीय विश्वास के साथ पंजीकृत NGO राष्ट्रीय विश्वास की वेबसाइट पर लॉगिन करता है।';
    const r = validateText(src, literal, hi, req);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/National Trust/);
  });

  it('accepts the fixed rendering, and also the English name kept as-is', () => {
    const req = glossaryHits([src], 'hi');
    expect(validateText(src, 'नेशनल ट्रस्ट के साथ पंजीकृत NGO नेशनल ट्रस्ट की वेबसाइट पर लॉगिन करता है।', hi, req).ok).toBe(true);
    expect(validateText(src, 'National Trust के साथ पंजीकृत NGO, National Trust की वेबसाइट पर लॉगिन करता है।', hi, req).ok).toBe(true);
  });
});

describe('validateList', () => {
  const docsEn = ['Aadhaar Card', 'Caste Certificate (Valid for 3 years from date of issue)', 'Bank Passbook'];
  const docsHi = ['आधार कार्ड', 'जाति प्रमाणपत्र (जारी तिथि से 3 वर्ष वैध)', 'बैंक पासबुक'];

  it('accepts a faithful list translation', () => {
    expect(validateList(docsEn, docsHi, hi).ok).toBe(true);
  });

  it('requires exactly the same number of items', () => {
    const r = validateList(docsEn, docsHi.slice(0, 2), hi);
    expect(r.ok).toBe(false);
    expect(r.reasons[0]).toMatch(/item count 3 became 2/);
  });

  it('rejects a list returned in English', () => {
    expect(validateList(docsEn, docsEn, hi).ok).toBe(false);
  });

  it('rejects when many individual items were skipped even if the rest is translated', () => {
    const en = ['Caste Certificate issued by the competent authority', 'Income Certificate issued by the Tehsildar', 'Birth Certificate or Date of Birth proof', 'Residence Certificate of the state'];
    const out = [en[0], en[1], 'जन्म प्रमाणपत्र या जन्म तिथि का प्रमाण', 'राज्य का निवास प्रमाणपत्र'];
    const r = validateList(en, out, hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/unchanged/);
  });

  it('rejects non-arrays and non-string items', () => {
    expect(validateList(docsEn, 'आधार कार्ड', hi).ok).toBe(false);
    expect(validateList(docsEn, [1, 2, 3], hi).ok).toBe(false);
  });

  it('keeps numbers inside list items', () => {
    const r = validateList(['Valid for 3 years from the date of issue'], ['जारी होने की तारीख से 5 वर्ष तक मान्य'], hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/numbers missing/);
  });
});
