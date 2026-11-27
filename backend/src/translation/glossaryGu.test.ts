import { describe, it, expect } from 'vitest';
import { GLOSSARY, glossaryHits, mentions } from './glossary.js';
import { validateText } from './validate.js';
import { LANGUAGES } from './languages.js';

const gu = LANGUAGES.gu;
const hi = LANGUAGES.hi;

// [English source, a wrong rendering produced in the Gujarati audit, a correct one]. The wrong ones are the
// audit's real outputs; the correct ones are written for these tests and are UNVERIFIED by a native speaker.
const AUDIT: Array<[string, string, string, string]> = [
  ['Scheduled Tribe', 'Scheme for Scheduled Tribe students', 'પ્રમાણિત જાતિના વિદ્યાર્થીઓ માટેની યોજના', 'અનુસૂચિત જનજાતિના વિદ્યાર્થીઓ માટેની યોજના'],
  ['Scheduled Caste', 'Post Matric Scholarship (Scheduled Caste Category)', 'પોસ્ટ મેટ્રિક શિષ્યવૃત્તિ (નિર્ધારિત જાતિ શ્રેણી)', 'પોસ્ટ મેટ્રિક શિષ્યવૃત્તિ (અનુસૂચિત જાતિ શ્રેણી)'],
  ['Backward Classes', 'Welfare of Backward Classes', 'પાછળ પડેલા વર્ગોનું કલ્યાણ', 'પછાત વર્ગોનું કલ્યાણ'],
  ['Nomadic', 'Scheme for Nomadic communities', 'નામદાર સમુદાયો માટેની યોજના', 'વિચરતા સમુદાયો માટેની યોજના'],
  ['Denotified', 'Scheme for Denotified communities', 'આદિવાસી સમુદાયો માટેની યોજના', 'વિમુક્ત સમુદાયો માટેની યોજના'],
  ['Interest Subvention Scheme', 'Interest Subvention Scheme', 'રસોઈ સબ્વેન્શન યોજના', 'વ્યાજ સહાય યોજના'],
  ['Buffalo Development Scheme', 'Buffalo Development Scheme', 'મોઢાની વિકાસ યોજના', 'ભેંસ વિકાસ યોજના'],
  ['Pig Development Scheme', 'Arun Pig Development Scheme', 'અરુણ સૂરિયા વિકાસ યોજના', 'અરુણ ડુક્કર વિકાસ યોજના'],
  ['Piglets', 'The sty should accommodate 5 piglets', 'સ્ટાઈમાં 5 ઘરેણીઓ માટે જગ્યા હોવી જોઈએ', 'ડુક્કરના 5 બચ્ચા માટે જગ્યા હોવી જોઈએ'],
  ['Pulses', 'Farmers growing pulses crops', 'ડાળિયા પાક ઉગાડતા ખેડૂતો', 'કઠોળ પાક ઉગાડતા ખેડૂતો'],
  ['Sewing Machine', 'Free Sewing Machine Scheme', 'ટાંકી મશીન યોજના', 'સિલાઈ મશીન યોજના'],
  ['Partnership Firm', 'Eligible: Partnership Firm.', 'સાહોદરિક સંસ્થા', 'ભાગીદારી પેઢી'],
  ['Partnership Concerns', 'Eligible: Partnership Concerns.', 'ભાગીદારી ચિંતાઓ', 'ભાગીદારી પેઢીઓ'],
  ['Age relaxation', 'Age relaxation of up to 10 years is allowed.', 'ખાસ મુલતવી 10 વર્ષ સુધી આપવામાં આવે છે.', 'ઉંમરમાં 10 વર્ષ સુધીની છૂટછાટ આપવામાં આવે છે.'],
  ['Trimester', 'The applicant must be in her 2nd or 3rd trimester of pregnancy.', 'અરજદાર ગર્ભાવસ્થાના 2 અથવા 3 મહિનામાં હોવી જોઈએ.', 'અરજદાર ગર્ભાવસ્થાના બીજા અથવા ત્રીજા ત્રિમાસિકમાં હોવી જોઈએ.'],
  ['Free of charge', 'Medicines are provided free of charge.', 'દવાઓ મુક્ત રીતે આપવામાં આવે છે.', 'દવાઓ મફત આપવામાં આવે છે.'],
  // From the 2026-11-27 card trial and vocabulary run (real outputs as the wrong ones).
  ['Scholarship', 'Swanath Scholarship Scheme', 'સ્વનાથ વિત્તીય સહાય યોજના', 'સ્વનાથ શિષ્યવૃત્તિ યોજના'],
  ['Mukhyamantri', 'Mukhyamantri Saur Swarojgar Yojana', 'મુખમંત્રી સૌર સ્વરોજગાર યોજના', 'મુખ્યમંત્રી સૌર સ્વરોજગાર યોજના'],
  ['Janjati', 'Janjati Swarojgar Yojna', 'જંજનાતિ સ્વરોજગાર યોજના', 'જનજાતિ સ્વરોજગાર યોજના'],
  ['Accident', 'Assistance in case of accident', 'અપઘાતના કિસ્સામાં સહાય', 'અકસ્માતના કિસ્સામાં સહાય'],
  ['Treatment', 'Free treatment in hospitals', 'હોસ્પિટલોમાં મફત સાવકાર', 'હોસ્પિટલોમાં મફત સારવાર'],
  ['Paddy', 'Back Ended Investment Subsidy to Paddy Growers', 'પાંદડાના ખેડૂતો માટે રોકાણ સબસિડી', 'ડાંગર ઉગાડતા ખેડૂતો માટે રોકાણ સબસિડી'],
  ['Karaikal', '5% Additional Subsidy to Karaikal Region', 'કરાઓકે પ્રદેશ માટે 5% વધારાની સબસિડી', 'કરાઈકલ પ્રદેશ માટે 5% વધારાની સબસિડી'],
  ['Intellectual Property', 'Assistance for Intellectual Property Protection', 'મનસિક સંપત્તિ સુરક્ષા માટે સહાય', 'બૌદ્ધિક સંપદા સુરક્ષા માટે સહાય'],
  ['Entrepreneur', 'Training for every entrepreneur', 'દરેક ઉદ્યોગપતિ માટે તાલીમ', 'દરેક ઉદ્યોગસાહસિક માટે તાલીમ'],
];

describe('Gujarati audit glossary: the audit\'s wrong renderings are rejected, the right ones accepted', () => {
  it.each(AUDIT)('%s', (_term, source, wrong, right) => {
    const bad = validateText(source, wrong, gu, glossaryHits([source], 'gu'));
    expect(bad.ok, `should reject: ${wrong}`).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/must be rendered as|mistranslated as/);
    const good = validateText(source, right, gu, glossaryHits([source], 'gu'));
    expect(good.reasons).toEqual([]);
  });

  it('every term in the list really is in the glossary for Gujarati', () => {
    for (const [, source] of AUDIT) expect(glossaryHits([source], 'gu').length, source).toBeGreaterThan(0);
  });
});

describe('Gujarati audit glossary: care with short or ambiguous words', () => {
  it('"free of charge" demands મફત but does not forbid મુક્ત, which is inside વિમુક્ત (denotified)', () => {
    const src = 'Free of charge coaching for Denotified Tribes';
    const hits = glossaryHits([src], 'gu');
    expect(hits.map((h) => h.en).sort()).toEqual(['Denotified', 'free of charge']);
    expect(validateText(src, 'વિમુક્ત જાતિઓ માટે મફત કોચિંગ', gu, hits).reasons).toEqual([]);
    expect(validateText(src, 'વિમુક્ત જાતિઓ માટે મુક્ત કોચિંગ', gu, hits).ok).toBe(false);
  });

  it('"pig" is matched as a whole word only: not pigeon, piggery or pigment', () => {
    for (const t of ['Pigeon breeding', 'Piggery subsidy', 'Pigment industry']) expect(mentions(t, 'pig', true)).toBe(false);
    for (const t of ['Pig farming', 'Pigs and goats', 'a pig.', 'PIG-rearing']) expect(mentions(t, 'pig', true)).toBe(true);
    expect(glossaryHits(['Pigeon breeding'], 'gu')).toEqual([]);
  });

  it('"piglets" does not also demand the word for "pig"', () => {
    expect(glossaryHits(['5 piglets'], 'gu').map((h) => h.en)).toEqual(['piglet']);
  });

  it('keeping the English term is still accepted', () => {
    const src = 'Welfare of Backward Classes';
    expect(validateText(src, 'Backward Classes નું કલ્યાણ', gu, glossaryHits([src], 'gu')).reasons).toEqual([]);
  });
});

describe('Gujarati audit glossary: bookkeeping', () => {
  it('marks every Gujarati rendering from the audit as unverified, and none are used for Hindi', () => {
    const auditEntries = GLOSSARY.filter((g) => g.gu && !g.hi && g.gu.unverified !== undefined);
    expect(auditEntries.length).toBeGreaterThanOrEqual(17);
    for (const g of GLOSSARY) if (g.gu && !g.hi) expect(g.gu.unverified, g.en).toBe(true);
    for (const t of ['Scheduled Caste', 'buffalo', 'free of charge', 'sewing machine']) expect(glossaryHits([t], 'hi'), t).toEqual([]);
  });

  it('Hindi text is not held to the Gujarati terms', () => {
    const src = 'Free Sewing Machine Scheme for Scheduled Caste women';
    expect(validateText(src, 'अनुसूचित जाति की महिलाओं के लिए निःशुल्क सिलाई मशीन योजना', hi, glossaryHits([src], 'hi')).reasons).toEqual([]);
  });
});

describe('Gujarati audit glossary: a forbidden word is rejected even beside the right one', () => {
  it.each([
    ['Eligible: Partnership Firm.', 'ભાગીદારી પેઢી, સાહોદરિક સંસ્થા', 'સાહોદરિક'],
    ['Free Sewing Machine Scheme', 'સિલાઈ મશીન અને ટાંકી મશીન યોજના', 'ટાંકી'],
    ['Scheme for Denotified communities', 'વિમુક્ત અને આદિવાસી સમુદાયો માટેની યોજના', 'આદિવાસી'],
    ['Scheme for Nomadic communities', 'વિચરતા અને નામદાર સમુદાયો માટેની યોજના', 'નામદાર'],
    ['Arun Pig Development Scheme', 'ડુક્કર અને સૂરિયા વિકાસ યોજના', 'સૂરિયા'],
  ])('%s', (source, out, word) => {
    const r = validateText(source, out, gu, glossaryHits([source], 'gu'));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain(`mistranslated as "${word}"`);
  });
});
