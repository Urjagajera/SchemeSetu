/**
 * parseDemographics.ts
 * Pure, testable extraction of gender and social-category restrictions from
 * Scheme.eligibilityRawText. Sibling of parseEligibility.ts (age/income).
 *
 * Locked design rules (agreed before writing this):
 * 1. PRECISION OVER RECALL. The eligibility engine treats a mismatch as
 *    authoritative and drops the scheme, so a wrongly-invented restriction hides
 *    a scheme from someone who is eligible. When a sentence is ambiguous the
 *    field stays null (same spirit as the dual-ceiling income exclusion).
 * 2. A sentence only counts if it reads as a gate on the applicant themselves
 *    ("The applicant must be a woman", "Only women are eligible", "The applicant
 *    must belong to the Scheduled Caste category"). Gender uses a whitelist of
 *    explicit gate phrasings; anything else that merely mentions a gender is
 *    ignored. Relaxations ("65% for SC/ST"), priorities, quotas, benefit tiers,
 *    certificates and dependents ("widow of a serviceman") do not count.
 * 3. Girl-child / daughter schemes -> gender null (the beneficiary is the child,
 *    but the profile describes the applicant, who is usually the parent).
 * 4. Option lists that include groups we can't model (DNT, landless labourer,
 *    artisan, minority, EWS, PwD...) or that span every category -> null.
 * 5. Values are lowercase, comma-separated sets in the existing String? columns:
 *    gender in { female, male, transgender }, category in { sc, st, obc, general }.
 *    Separate sentences are separate requirements, so they are INTERSECTED; an
 *    empty intersection is a conflict -> null.
 * 6. Out of scope for now: EWS, minority, DNT, PVTG (handled as "unmodelled").
 */

export type Gender = 'female' | 'male' | 'transgender';
export type SocialCategory = 'sc' | 'st' | 'obc' | 'general';

export interface RejectedMention {
  sentence: string;
  reason: string;
}

export interface DemographicExtractionResult<T extends string> {
  /** Lowercase comma-separated set, or null when there is no (safe) restriction. */
  value: string | null;
  values: T[];
  matchedSentences: string[];
  rejected: RejectedMention[];
  /** Why the field is null even though something was mentioned (if applicable). */
  nullReason: string | null;
}

function emptyResult<T extends string>(): DemographicExtractionResult<T> {
  return { value: null, values: [], matchedSentences: [], rejected: [], nullReason: null };
}

function cleanSentences(sentences: string[]): string[] {
  return sentences.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Mentions that are relaxations / priorities / quotas / benefit tiers rather than eligibility gates. */
const NOT_A_GATE =
  /(relax|priorit|prefer|reserv|cut-?off|concession|quota|earmark|at par|\d+(\.\d+)?\s*%\s*(for|is|of|assistance|subsidy|grant|of the unit cost)|assistance of \d+|\bfor (SC|ST|OBC|women|general|the general|boys|girls|men)\b|in the case of|in case of|per cent|exempt|additional|extra |more than|age limit|years for|years of age for|will be given|shall be given|represent|along with|each (block|district|region|state)|top[- ]performing|highest[- ]scoring)/i;

/** Sentences that let several kinds of people apply, so they aren't one restriction. */
const OPEN_OR_LIST =
  /\b(man or woman|men or women|men and women|women and men|male or female|male and female|female or male|both|irrespective|regardless|any gender|all genders|all castes?|any caste|boy or girl|girls? (and|or) boys?|boys? (and|or) girls?)\b/i;

// ─────────────────────────────────────────────────────────────
// Gender
// ─────────────────────────────────────────────────────────────

/** Beneficiary is a child, applicant is (usually) the parent -> gender left null for the whole scheme. */
const GIRL_CHILD = /\b(girl[- ]child|girl children|daughters?|baby girl|newborn girl|beti)\b/i;

const GENDER_NOUN = String.raw`(?:woman|women|female|females|girl|girls|widow|widows|lady|ladies|mahila|transgender(?:\s+persons?)?|third gender|male|males|man|men|boy|boys)`;
/** A word allowed between "a" and the gender noun (never "or"/"and" or another gender noun). */
const ADJ = String.raw`(?:(?!(?:or|and)\b)(?!${GENDER_NOUN}\b)[A-Za-z'’-]+\s+)`;
const ROLE = String.raw`(?:students?|entrepreneurs?|farmers?|workers?|applicants?|candidates?|beneficiar(?:y|ies)|artisans?|members?|persons?|individuals?|citizens?|residents?)`;
const SUBJECT = String.raw`(?:applicants?|beneficiar(?:y|ies)|candidates?|persons?|individuals?|owner|member|head)`;
const MODAL = String.raw`(?:must|should|shall|has to|have to|needs? to|is required to|are required to)`;

/** "The applicant must be a [pregnant] woman": not followed by a list, "of", or "to". */
const FORM_A = new RegExp(
  String.raw`^(?:the\s+|an?\s+)?${SUBJECT}\b[^,;:/]{0,30}?\b${MODAL}\s+be\s+(?:an?\s+|the\s+)?${ADJ}{0,3}(${GENDER_NOUN})\b(?![-\w])(?!\s*(?:,|/|or\b|and\b|of\b|to\b))(?![^.]*(?:,|/|\bor\b))`,
  'i',
);
/** "Only women farmers who ... are eligible", "The girl student should ...", "Women can apply". */
const FORM_B = new RegExp(
  String.raw`^(?:(?:the|all|only|any|every)\s+)*${ADJ}{0,2}(${GENDER_NOUN})(?:\s+${ROLE})?\s+(?:should|must|shall|are|is|can|may|will|who|having|aged|above|below|between|belonging|residing|living|from)\b`,
  'i',
);
// Deliberately NO bare-fragment form ("Pregnant women.", "Widow."): such lines are usually list items
// enumerating several beneficiary groups (children, pregnant women, ...), i.e. alternatives, not a gate.

const MARRIAGE_CONTEXT = /\b(marr(y|ies|ied|iage)|bride|groom|bridegroom|spouse|wife|husband|the other)\b/i;

function genderFromNoun(noun: string): Gender {
  const n = noun.toLowerCase();
  if (/transgender|third gender/.test(n)) return 'transgender';
  if (/^(male|males|man|men|boy|boys)$/.test(n)) return 'male';
  return 'female';
}

function genderOfSentence(sentence: string): { gender: Gender | null; reject: string | null } {
  // only sentences that mention a gender word at all are interesting
  if (!new RegExp(String.raw`\b${GENDER_NOUN}\b`, 'i').test(sentence)) return { gender: null, reject: null };

  if (NOT_A_GATE.test(sentence)) return { gender: null, reject: 'relaxation/priority/quota/benefit tier, not a gate' };
  if (OPEN_OR_LIST.test(sentence)) return { gender: null, reject: 'open to more than one gender' };
  if (MARRIAGE_CONTEXT.test(sentence)) return { gender: null, reject: 'marriage/relationship wording, not a rule on the applicant' };

  const m = FORM_A.exec(sentence) ?? FORM_B.exec(sentence);
  if (m) return { gender: genderFromNoun(m[1]), reject: null };

  return { gender: null, reject: 'mentions gender but is not an explicit rule on the applicant' };
}

export function extractGender(sentences: string[]): DemographicExtractionResult<Gender> {
  const result = emptyResult<Gender>();
  let current: Gender[] = [];
  let girlChildSeen = false;

  for (const sentence of cleanSentences(sentences)) {
    if (GIRL_CHILD.test(sentence)) {
      girlChildSeen = true;
      result.rejected.push({ sentence, reason: 'girl-child / daughter wording: beneficiary is the child, applicant is the parent' });
      continue;
    }
    const { gender, reject } = genderOfSentence(sentence);
    if (reject) {
      result.rejected.push({ sentence, reason: reject });
      continue;
    }
    if (!gender) continue;
    result.matchedSentences.push(sentence);
    current = current.length === 0 ? [gender] : current.filter((g) => g === gender); // each sentence is its own requirement
    if (current.length === 0) {
      result.matchedSentences = [];
      result.nullReason = 'conflicting gender gates in different sentences';
      return result;
    }
  }

  if (girlChildSeen) {
    result.matchedSentences = [];
    result.nullReason = 'girl-child / daughter scheme: gender left null by design';
    return result;
  }
  if (current.length > 0) {
    result.values = current;
    result.value = current.join(',');
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Social category
// ─────────────────────────────────────────────────────────────

const CATEGORY_TOKENS: Array<[SocialCategory, RegExp]> = [
  ['sc', /\b(SC|SCs|Scheduled Castes?|Schedule Castes?)\b/],
  ['st', /\b(ST|STs|Scheduled Tribes?|Schedule Tribes?)\b/],
  ['obc', /\b(OBC|OBCs|Other Backward Class(es)?|SEBCs?|Socially and Educationally Backward Class(es)?)\b/i],
];
const GENERAL_GATE = /\b(general|unreserved|open) (category|caste)\b/i;
/** "General, SC, ST ...": the capitalised group name "General" inside a list of categories. */
const GENERAL_IN_CATEGORY_LIST = /\bGeneral\s*[,/&]\s*(SC|ST|OBC|Scheduled|Other|Backward|EWS|Women|BPL)|(SC|ST|OBC|Scheduled \w+|EWS)\s*[,/&]\s*General\b/;
const BELONG_TO = /\b(belong(s|ing)? to|be from|be a member of|falls? under|comes? from|hails? from|come from)\b/i;
const GATE_LEAD =
  /\b(applicant|applicants|beneficiar(y|ies)|candidate|candidates|student|students|person|persons|individual|farmer|farmers|entrepreneur|member|worker|household)\b[^.]{0,60}\b(should|must|shall|has to|have to|needs? to|is required to|are required to|will be|is eligible|are eligible|can apply|may apply)\b/i;
/** Groups outside SC/ST/OBC/general that appear in option lists; if present, the list can't be modelled. */
const UNMODELLED_GROUP =
  /\b(denotified|de-notified|notified tribe|NTDNT|DNT|DNC|nomadic|semi[- ]nomadic|PVTG|minorit(y|ies)|muslim|christian|sikh|buddhist|jain|parsi|EWS|economically weaker|landless|artisan|transgender|prisoner|inmate|PwD|disabled|differently[- ]abled|safai|sanitation|scaveng|EBCs?|MBCs?|BCs?|DNTs?|VJNTs?|PwDs?|Vimukta)\b/i;
/** "SC, ST, or a BPL family": another route to eligibility sits in the same list. */
const ALT_ROUTE = /\bor\b[^.]*\b(BPL|below poverty line|primitive tribes?|PTGs?)\b|\b(BPL|below poverty line|primitive tribes?|PTGs?)\b[^.]*,\s*or\b/i;
/** A sentence about a marriage / relationship can name a caste without restricting the applicant's own. */
const PARTNER_CONTEXT = /\b(inter-?caste|marriage|bride|groom|bridegroom|spouse|partner|couple|the other|one of the (applicants|partners|spouses))\b/i;
/** Certificate / proof requirements describe paperwork for people claiming a category, not a gate. */
const PAPERWORK = /\b(certificate|proof|documents?)\b/i;
const APPLICANT_SUBJECT = /\b(applicants?|beneficiar(y|ies)|candidates?|students?|farmers?|persons?|individuals?|entrepreneurs?|members?|workers?|households?|famil(y|ies)|trainees?|cultivators?|owners?|residents?|citizens?|artisans?|fishermen|labou?rers?|youth|scholars?|boys?|girls?|women|men|they|he|she|one)\b/i;
const EXCLUSION = /\b(other than|excluding|except|not covered|apart from)\b/i;
const NEGATED = /\b(not|non[- ])\b[^.]{0,30}\b(SC|ST|OBC|scheduled|schedule|backward)\b/i;
const LIST_WITH_WOMEN = /\b(women|woman|female|girls?)\b\s*(,|\band\b|\bor\b|\/)|(,|\band\b|\bor\b|\/)\s*\b(women|woman|female|girls?)\b/i;
/** Short fragments such as "General Category: 78.56%." or "Scheduled Castes: 20%." are benefit tiers, not gates. */
const STARTS_AS_RULE = /^\s*(only\s+)?(the\s+)?(SC|ST|OBC|Scheduled|general)[^.:]*\b(are|is|can|may)\b[^.]*\b(eligible|apply|entitled)/i;

function categoryOfSentence(rawSentence: string): { set: SocialCategory[]; reject: string | null } {
  // "socially and educationally backward classes (SC)" uses (SC) as an abbreviation of that phrase
  const sentence = rawSentence.replace(/(Backward Class(?:es)?)\s*\((?:SC|SEBC|SBC)\)/gi, '$1');
  const set: SocialCategory[] = [];
  for (const [k, re] of CATEGORY_TOKENS) if (re.test(sentence)) set.push(k);
  if (/Scheduled Castes?\s*(?:and|&|\/)\s*Tribes?/i.test(sentence) && !set.includes('st')) set.push('st');
  if (GENERAL_GATE.test(sentence)) set.push('general');
  if (set.length === 0) return { set, reject: null }; // not about category at all

  if (GENERAL_IN_CATEGORY_LIST.test(sentence)) return { set: [], reject: 'lists general alongside other categories: open to all' };
  if (NOT_A_GATE.test(sentence)) return { set: [], reject: 'relaxation/priority/quota/reservation note, not a gate' };
  if (PAPERWORK.test(sentence)) return { set: [], reject: 'certificate/proof requirement, not a category gate' };
  if (PARTNER_CONTEXT.test(sentence)) return { set: [], reject: "marriage/partner context, not the applicant's own category" };
  if (OPEN_OR_LIST.test(sentence)) return { set: [], reject: 'open to every category' };
  if (ALT_ROUTE.test(sentence)) return { set: [], reject: 'another route to eligibility (BPL/primitive tribe) in the same list' };
  if (UNMODELLED_GROUP.test(sentence)) return { set: [], reject: 'list includes groups outside SC/ST/OBC/general (e.g. DNT, minority, EWS, landless)' };

  // "General Category (Other than SC, ST and OBC)" means general only; anything after the exclusion is out.
  if (EXCLUSION.test(sentence)) {
    if (GENERAL_GATE.test(sentence)) return { set: ['general'], reject: null };
    return { set: [], reject: 'exclusionary wording' };
  }
  if (NEGATED.test(sentence)) return { set: [], reject: 'negated wording' };

  if (GENERAL_IN_CATEGORY_LIST.test(sentence) || (set.includes('general') && set.length > 1)) {
    return { set: [], reject: 'lists general alongside other categories: open to all' };
  }
  // "Women, SC, and ST beneficiaries ..." names women as one option among several groups.
  if (LIST_WITH_WOMEN.test(sentence)) {
    return { set: [], reject: 'category is one option in a list that also names women' };
  }
  const belong = BELONG_TO.exec(sentence);
  if (belong && !GATE_LEAD.test(sentence) && !APPLICANT_SUBJECT.test(sentence.slice(0, belong.index)) && belong.index > 0) {
    return { set: [], reject: 'subject of the category rule is not the applicant' };
  }
  if (!BELONG_TO.test(sentence) && !GATE_LEAD.test(sentence) && !STARTS_AS_RULE.test(sentence)) {
    return { set: [], reject: 'mentions a category but is not phrased as a rule on the applicant' };
  }
  return { set, reject: null };
}

export function extractCategory(sentences: string[]): DemographicExtractionResult<SocialCategory> {
  const result = emptyResult<SocialCategory>();
  let allowed: SocialCategory[] | null = null;

  for (const sentence of cleanSentences(sentences)) {
    const { set, reject } = categoryOfSentence(sentence);
    if (reject) {
      result.rejected.push({ sentence, reason: reject });
      continue;
    }
    if (set.length === 0) continue;
    result.matchedSentences.push(sentence);
    allowed = allowed === null ? [...set] : allowed.filter((c) => set.includes(c)); // each sentence is its own requirement
    if (allowed.length === 0) {
      result.matchedSentences = [];
      result.nullReason = 'category gates in different sentences do not overlap';
      return result;
    }
  }

  if (allowed && allowed.length > 0) {
    const order: SocialCategory[] = ['sc', 'st', 'obc', 'general'];
    result.values = order.filter((c) => allowed!.includes(c));
    result.value = result.values.join(',');
  }
  return result;
}
