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
    expect(glossaryHits([src], 'hi')).toEqual([expect.objectContaining({ en: 'National Trust', target: 'नेशनल ट्रस्ट' })]);
    expect(glossaryHits(['Aadhaar Card'], 'hi')).toEqual([]);
  });

  it('rejects the literal "national faith" mistranslation found in calibration', () => {
    const req = glossaryHits([src], 'hi');
    const literal = 'राष्ट्रीय विश्वास के साथ पंजीकृत NGO राष्ट्रीय विश्वास की वेबसाइट पर लॉगिन करता है।';
    const r = validateText(src, literal, hi, req);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/National Trust/);
  });

  it('accepts the natural Hindi rendering both models chose in the first live run ("राष्ट्रीय ट्रस्ट अधिनियम")', () => {
    const description = 'The scheme provides therapies to persons with disability covered under the National Trust Act, through trainings and support.';
    const req = glossaryHits([description], 'hi');
    const natural = 'यह योजना राष्ट्रीय ट्रस्ट अधिनियम के अंतर्गत आने वाले दिव्यांग व्यक्तियों को प्रशिक्षण और सहायता के माध्यम से थेरेपी प्रदान करती है।';
    expect(validateText(description, natural, hi, req).ok).toBe(true);
    // "faith" is still wrong, in either wording
    const faith = 'यह योजना राष्ट्रीय विश्वास अधिनियम के अंतर्गत आने वाले दिव्यांग व्यक्तियों को प्रशिक्षण और सहायता के माध्यम से थेरेपी प्रदान करती है।';
    const bad = validateText(description, faith, hi, req);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/mistranslated/);
  });

  it('accepts the fixed rendering, and also the English name kept as-is', () => {
    const req = glossaryHits([src], 'hi');
    expect(validateText(src, 'नेशनल ट्रस्ट के साथ पंजीकृत NGO नेशनल ट्रस्ट की वेबसाइट पर लॉगिन करता है।', hi, req).ok).toBe(true);
    expect(validateText(src, 'National Trust के साथ पंजीकृत NGO, National Trust की वेबसाइट पर लॉगिन करता है।', hi, req).ok).toBe(true);
  });
});

describe('glossary: disability terms (अपाहिज is forbidden, दिव्यांग is asked for)', () => {
  // Real sentence from the Hindi audit; the Qwen fallback wrote "अपाहिज".
  const src = 'The applicant should be a disabled Defence Forces Personnel (Army, Navy, or Air Force) who became permanently disabled due to war.';
  const goodHi = 'आवेदक एक दिव्यांग रक्षा बल कर्मी (सेना, नौसेना या वायु सेना) होना चाहिए, जो युद्ध के कारण स्थायी रूप से दिव्यांग हो गया हो।';
  const badHi = 'आवेदक एक अपाहिज रक्षा बलों का कर्मी (सेना, नौसेना या वायु सेना) होना चाहिए, जो युद्ध के कारण स्थायी रूप से अपाहिज हो गया हो।';

  it('puts the preferred word in the prompt for each English term that appears, and only those', () => {
    expect(glossaryHits([src], 'hi')).toEqual([expect.objectContaining({ en: 'disabled', target: 'दिव्यांग', forbidOnly: true })]);
    expect(glossaryHits(['75% disability'], 'hi')).toEqual([expect.objectContaining({ en: 'disability', target: 'दिव्यांगता' })]);
    expect(glossaryHits(['artisans with disabilities'], 'hi')).toEqual([expect.objectContaining({ en: 'disabilities', target: 'दिव्यांगता' })]);
    for (const term of ['Differently Abled Trainees', 'physically challenged', 'handicapped', 'specially abled', 'Divyang']) {
      expect(glossaryHits([term], 'hi')).toEqual([expect.objectContaining({ target: 'दिव्यांग' })]);
    }
    expect(glossaryHits(['Aadhaar Card'], 'hi')).toEqual([]);
  });

  it('rejects अपाहिज and its forms, and accepts दिव्यांग', () => {
    const req = glossaryHits([src], 'hi');
    expect(validateText(src, goodHi, hi, req).ok).toBe(true);
    const bad = validateText(src, badHi, hi, req);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/"disabled" was mistranslated as "अपाहिज"/);
    // the abstract noun and plural forms are caught too (substring test)
    const pct = 'Disability 75% and above: ₹35,00,000/-';
    expect(validateText(pct, '75% या उससे अधिक अपाहिजता: ₹35,00,000/-', hi, glossaryHits([pct], 'hi')).ok).toBe(false);
    expect(validateText(pct, '75% या उससे अधिक दिव्यांगता: ₹35,00,000/-', hi, glossaryHits([pct], 'hi')).ok).toBe(true);
  });

  it('only enforces the forbidden word: another acceptable rendering is not rejected', () => {
    const differently = 'The applicant\'s annual income should not exceed ₹72,000/- (not applicable for differently abled).';
    const req = glossaryHits([differently], 'hi');
    // Qwen's own wording, and the older official विकलांग, both pass
    expect(validateText(differently, 'आवेदक की वार्षिक आय ₹72,000/- से अधिक नहीं होनी चाहिए (विशेष आवश्यकताओं वाले व्यक्तियों के लिए लागू नहीं)।', hi, req).ok).toBe(true);
    expect(validateText(differently, 'आवेदक की वार्षिक आय ₹72,000/- से अधिक नहीं होनी चाहिए (विकलांगों के लिए लागू नहीं)।', hi, req).ok).toBe(true);
  });

  it('does not touch text whose English has no disability term', () => {
    const plain = 'The applicant should be a farmer.';
    expect(glossaryHits([plain], 'hi')).toEqual([]);
  });
});

describe('numbers written as ordinal words (the "2nd or 3rd trimester" false rejection)', () => {
  // Real source line that was rejected with "numbers missing from the translation: 2, 3".
  const src = 'The applicant must be a pregnant woman in her 2nd or 3rd trimester of pregnancy.';

  it('accepts the English ordinals written as Hindi words', () => {
    const r = validateText(src, 'आवेदक गर्भावस्था की दूसरी या तीसरी तिमाही में एक गर्भवती महिला होनी चाहिए।', hi);
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('still accepts the digits, as before', () => {
    expect(validateText(src, 'आवेदक गर्भावस्था की 2 या 3 तिमाही में एक गर्भवती महिला होनी चाहिए।', hi).ok).toBe(true);
    expect(validateText('Students of Class 6th to 10th', 'कक्षा 6वीं से 10वीं के छात्र', hi).ok).toBe(true);
  });

  it('still rejects when one of the ordinals is dropped', () => {
    const r = validateText(src, 'आवेदक गर्भावस्था की दूसरी तिमाही में एक गर्भवती महिला होनी चाहिए।', hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/numbers missing from the translation: 3/);
  });

  it('accepts either spelling of the nasal sign (पाँचवीं / पांचवीं)', () => {
    expect(validateText('Students of the 5th standard', 'पाँचवीं कक्षा के छात्र', hi).ok).toBe(true);
    expect(validateText('Students of the 5th standard', 'पांचवीं कक्षा के छात्र', hi).ok).toBe(true);
  });

  it('does not excuse a number that also appears as a plain number', () => {
    // "2" here is a quantity; writing only "दूसरे" (second) does not carry it
    const s = 'The first 2 children and the 2nd child of each family are eligible.';
    expect(validateText(s, 'प्रत्येक परिवार के पहले बच्चे और दूसरे बच्चे पात्र हैं।', hi).ok).toBe(false);
  });

  it('only allows words for 1st to 10th; larger ordinals must keep their digits', () => {
    expect(validateText('Students of the 12th standard', 'बारहवीं कक्षा के छात्र', hi).ok).toBe(false);
    expect(validateText('Students of the 12th standard', '12वीं कक्षा के छात्र', hi).ok).toBe(true);
  });

  it('keeps the strict rule for a language with no ordinal table', () => {
    const noTable = { ...gu, code: 'xx' as unknown as typeof gu.code };
    expect(validateText('Applicants in the 2nd year', 'બીજા વર્ષમાં અરજદારો', noTable).ok).toBe(false);
    expect(validateText('Applicants in the 2nd year', '2જા વર્ષમાં અરજદારો', noTable).ok).toBe(true);
  });
});

describe('Gujarati ordinal words (the "10th Standard" false rejection)', () => {
  // Real source line from the Gujarati audit (scheme 34, Kanya Dhan Scheme): gpt-oss-120b was rejected with
  // "numbers missing from the translation: 10". The rejected output was not kept; this is the idiomatic wording.
  const src = 'The applicant should have passed the 10th Standard of examination.';

  it('accepts the ordinal written as a Gujarati word', () => {
    const r = validateText(src, 'અરજદારે દસમા ધોરણની પરીક્ષા પાસ કરેલી હોવી જોઈએ.', gu);
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('still accepts the digits (the Qwen wording from the same audit)', () => {
    expect(validateText(src, 'અરજીદારે 10મી ધોરણની પરીક્ષામાં સફળતા મેળવી હોવી જોઈએ.', gu).ok).toBe(true);
  });

  it('accepts a range of ordinals, each as a word (2nd or 3rd trimester)', () => {
    const t = 'The applicant must be a pregnant woman in her 2nd or 3rd trimester of pregnancy.';
    expect(validateText(t, 'અરજદાર ગર્ભાવસ્થાના બીજા અથવા ત્રીજા ત્રિમાસિકમાં હોય તેવી ગર્ભવતી મહિલા હોવી જોઈએ.', gu).ok).toBe(true);
  });

  it('still rejects when one of the ordinals is dropped', () => {
    const t = 'The applicant must be a pregnant woman in her 2nd or 3rd trimester of pregnancy.';
    const r = validateText(t, 'અરજદાર ગર્ભાવસ્થાના બીજા ત્રિમાસિકમાં હોય તેવી ગર્ભવતી મહિલા હોવી જોઈએ.', gu);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/numbers missing from the translation: 3/);
  });

  it('does not excuse a number that also appears as a plain number', () => {
    const s = 'The first 2 children and the 2nd child of each family are eligible.';
    expect(validateText(s, 'દરેક પરિવારના પહેલા બાળક અને બીજા બાળક પાત્ર છે.', gu).ok).toBe(false);
  });

  it('only allows words for 1st to 10th; larger ordinals must keep their digits', () => {
    expect(validateText('Students of the 12th standard', 'બારમા ધોરણના વિદ્યાર્થીઓ', gu).ok).toBe(false);
    expect(validateText('Students of the 12th standard', '12મા ધોરણના વિદ્યાર્થીઓ', gu).ok).toBe(true);
  });

  it('a plain list number that is simply dropped is still rejected (scheme 48, "1." "2." "3.")', () => {
    // Scheme 48's rejection was list numbering, not an ordinal: the words must not excuse it.
    const list = ['1.\tThe applicant should be a permanent resident of Arunachal Pradesh.', '2.\tPreference would be given to women.', '3.\tFarmers must be poor.'].join('\n');
    const dropped = ['અરજદાર અરુણાચલ પ્રદેશનો કાયમી રહેવાસી હોવો જોઈએ.', 'મહિલાઓને પ્રાથમિકતા આપવામાં આવશે.', 'ખેડૂતો ગરીબ હોવા જોઈએ.'].join('\n');
    const r = validateText(list, dropped, gu);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/numbers missing from the translation: 1, 2, 3/);
  });
});

describe('letters from another script inside a translation', () => {
  // Real lines from the Gujarati audit (Qwen and gpt-oss-120b) that carried a stray-script word.
  const cases: Array<[string, string, string, string]> = [
    ['Devanagari "sport" in Gujarati (Qwen)', 'The Status of the Award will be the same as the Arjuna Awards conferred in the field of Sports by the Ministry of Youth Affairs and Sports.',
      'યુવા વ્યવહાર અને खेल મંત્રાલય દ્વારા खेल ક્ષેત્રમાં અર્જુન પુરસ્કારોને સમાન સ્થિતિ આ પુરસ્કારને મળશે.', 'Devanagari'],
    ['Telugu "Telangana" in a title (gpt-oss)', 'Disability Aids and Appliances - Telangana', 'દિવ્યાંગતા સહાય અને ઉપકરણો - తెలంగాణ', 'Telugu'],
    ['Devanagari "Mumbai" glued to Gujarati letters (gpt-oss)', 'The applicant must be from the particular village/urban area/parish (in case of Mumbai, Sindhudurg and other parts of the country).',
      'અરજદારને નિર્દિષ્ટ ગામ/શહેર વિસ્તાર/પેરીશ (મુंबई, સિંધુદુર્ગ અને દેશના અન્ય ભાગો માટે)માંથી હોવો જોઈએ.', 'Devanagari'],
    ['Devanagari "Chief Minister" in a title (gpt-oss)', 'Mukhyamantri Aarthik Kalyan Yojana', 'મુખ्यमंत्री આર્થિક કલ્યાણ યોજના', 'Devanagari'],
    ['Arabic phrase inside a sentence (gpt-oss)', 'The Awardees will be reimbursed airfare (economy class) subject to production of the original boarding passes along with a duly filled in proforma.',
      'પુરસ્કાર પ્રાપ્તકર્તાઓને એરફેર (ઇકોનોમી ક્લાસ) ની રીફંડ આપવામાં આવશે, بشرط اصل બોર્ડિંગ પાસ સાથે પ્રોફોર્મા ભરેલ હોય.', 'Arabic'],
  ];

  it.each(cases)('rejects: %s', (_name, source, out, script) => {
    const r = validateText(source, out, gu);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('another script');
    expect(r.reasons.join(' ')).toContain(script);
  });

  it('rejects it inside a list too', () => {
    const r = validateList(['Mukhyamantri Aarthik Kalyan Yojana'], ['મુખ्यमंत्री આર્થિક કલ્યાણ યોજના'], gu);
    expect(r.ok).toBe(false);
  });

  it('also catches Gujarati letters inside Hindi text', () => {
    const r = validateText('Mukhyamantri Aarthik Kalyan Yojana', 'मुख्यमंत्री आर्थिक કલ્યાણ योजना', hi);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('Gujarati');
  });

  it('accepts clean Gujarati, English words and acronyms, numbers and the danda', () => {
    const r = validateText('Disability Aids and Appliances - Telangana (PAN card, Rs. 5,000)', 'દિવ્યાંગતા સહાય અને ઉપકરણો - Telangana (PAN કાર્ડ, Rs. 5,000)', gu);
    expect(r.reasons).toEqual([]);
    expect(validateText('Apply online', 'ઓનલાઈન અરજી કરો। અહીં ક્લિક કરો', gu).ok).toBe(true);
  });

  it('does not count a letter that the English source itself contained', () => {
    expect(validateText('Scheme नाम of the Ministry', 'યોજના नाम મંત્રાલયની', gu).reasons.join(' ')).not.toContain('another script');
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
