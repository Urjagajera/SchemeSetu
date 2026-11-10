/**
 * parseStatusGates.ts
 * Pure, testable extraction of four status rules from Scheme.eligibilityRawText (decided 2026-11-10):
 *
 *   govtJob    "not-self"   the applicant must not have a government job
 *              "not-family" no one in the applicant's family may have one (stricter: covers the applicant too)
 *              "required"   the applicant must be a government employee
 *   incomeTax  "not-self" / "not-family"   the applicant (or no one in the family) must pay income tax
 *   bpl        "yes"   the applicant / family must be Below the Poverty Line
 *              "no"    the applicant must NOT be BPL ("Non BPL", "APL")
 *   pension    "no"    the applicant must not already receive a pension
 *
 * Locked design rules (the same ones as the other parsers):
 * 1. PRECISION OVER RECALL. A wrong rule hides a scheme from someone it is meant for; a missed rule only shows an
 *    extra one. Only an explicit rule about the applicant or their family counts.
 * 2. Not rules: preferences, priorities, extra benefit for a group ("BPL families get ₹5,000 more"), lists of who may
 *    apply ("General/SC/ST/BPL"), either/or alternatives ("BPL or income below ₹1 lakh"), headings, and rules about
 *    something else (a dismissed or retired employee, a government school or hospital, a pension the scheme pays).
 * 3. Two sentences that disagree (one "must be BPL", another "must not be") -> null.
 */
import { splitIntoSentences } from './sentences.js';

export type GovtJobRule = 'not-self' | 'not-family' | 'required';
export type IncomeTaxRule = 'not-self' | 'not-family';
export type BplRule = 'yes' | 'no';
export type PensionRule = 'no';

export interface GateResult<V extends string> {
  value: V | null;
  matchedSentences: string[];
  rejected: Array<{ sentence: string; reason: string }>;
  nullReason: string | null;
}

export interface StatusGates {
  govtJob: GateResult<GovtJobRule>;
  incomeTax: GateResult<IncomeTaxRule>;
  bpl: GateResult<BplRule>;
  pension: GateResult<PensionRule>;
}

const NEGATION = /\b(?:should not|shall not|must not|will not|cannot|can not|can't|not be|not have|not been|not employed|not working|not in|not a|not an|are not|is not|neither|nor|no member|none of|not eligible|ineligible|excluded|will be excluded|are excluded|not entitled|not applicable|disqualif\w*|not allowed|not permitted|without any|no (?:family )?members?|no (?:govt\.?|government|central|state) (?:employees?|servants?))\b|^\s*no\b/i;
// A spouse counts only as "the applicant or their spouse" ("ESM / living spouse / widows who are re-employed" are applicants).
const FAMILY = /\b(?:famil(?:y|ies)|household|no member|any member|none of the (?:family )?members|members? of (?:the|his|her|their) family|parents?|mother|father|guardians?|dependents?|relatives?)\b|\b(?:applicant|herself|himself)\s+or\s+(?:his|her|their)\s+(?:spouse|husband|wife)\b/i;
const HEADING = /:\s*$/;
/** A sentence that starts with the "Exclusions" heading glued on: what follows is who is excluded. */
const EXCLUSIONS_HEADING = /^\s*exclusions?\b(?!\s*:?\s*$)/i;
const NOT_A_GATE = /\b(?:priorit\w*|prefer\w*|preferential|reserv\w*|quota|weightage|special focus|first come)\b/i;

/** A government job (not a government school, hospital, scheme or certificate). */
const GOVT_JOB =
  /\b(?:(?:central|state|union|government|govt\.?)\s*(?:\/\s*(?:state|central|semi[- ]?government|psu)\s*)?(?:or\s+(?:semi[- ]?government|state|central)\s+)?(?:government\s+|govt\.?\s+)?(?:employees?|servants?|service|services|job|jobs|employment|post)|(?:employees?|servants?|employed|working|serving)\s+(?:in|with|under|of)\s+(?:the\s+|any\s+)?(?:central\s+or\s+state\s+|state\s+or\s+central\s+|central\s+|state\s+)?(?:government|govt\.?)|government\s*\/\s*semi[- ]?government\s+(?:employees?|service|job)|public sector (?:undertaking|employee|unit|enterprise)s?|\bpsu\b)/i;
/** Employees who are not "a government job held now". */
const NOT_A_CURRENT_JOB = /\b(?:dismissed|ex-?servicem\w*|former|terminated|removed from)\b/i;
const RETIRED = /\bretired\b/i;
const CURRENT_JOB = /\b(?:permanent\w*|serving|regular|employed in|working in|in service)\b/i;
/** Rules about someone else: "the deceased parents", "consultants who are engaged", "the daughter should not be". */
const OTHER_PERSON = /\b(?:deceased|late|missing|consultants?)\b|\b(?:daughter|son)\s+(?:should|must|shall)\b/i;
/** "Note 2: If the parents are ...", "must not be blacklisted by a PSU", "Category paying Rs.850:- ...", "open to all ... including". */
const NOT_A_RULE = /^\s*(?:note\b|if\b)|\bblacklist\w*|\bcategory\b[^:]{0,90}:-|\bopen to\b|\bincluding those\b|\bin case\b|\bwhen they are\b|\(or\)|\bapplications? shall not be (?:ordinarily )?considered\b|^\s*however\b/i;
const GOVT_REQUIRED = /\b(?:should|must|shall)\s+be\s+(?:a|an)?\s*(?:serving|regular|permanent|working)?\s*(?:central|state)?\s*(?:government|govt\.?)\s+(?:employee|servant)\b/i;

const INCOME_TAX = /\bincome[- ]?tax(?:[- ]?payers?|[- ]?payees?|\s+return)?\b|\bpay(?:s|ing)?\s+income[- ]?tax\b/i;

const BPL_WORD = /\b(?:below[- ]poverty[- ]line|bpl)\b/i;
const NON_BPL = /\b(?:non[- ]?bpl|above[- ]poverty[- ]line|\bapl\b)\b|\bnot\s+(?:be\s+)?(?:from\s+|in\s+|under\s+)?(?:a\s+|the\s+)?(?:bpl|below poverty line)\b/i;
/** "General/SC/ST/BPL", "all categories like ... BPL": a list of who may apply, not a gate. */
const OPEN_LIST = /\b(?:all categories|any category|irrespective|including)\b|(?:\/\s*bpl\b|\bbpl\s*\/)/i;
/** "BPL or income below ...": either/or, which one column cannot hold. */
const ALTERNATIVE = /\bbpl\b[^.]{0,60}\bor\b|\bor\b[^.]{0,60}\bbpl\b|\b(?:below poverty line)\b[^.]{0,60}\bor\b|\bor\b[^.]{0,60}\bbelow poverty line\b/i;
/** Extra money or a different amount for BPL people: a benefit tier, not a gate. */
const BENEFIT_TIER = /\b(?:will (?:get|receive|be (?:given|provided|paid))|additional|extra|enhanced|higher|amount of|assistance of|subsidy of|grant of|rs\.?\s*\d|₹\s*\d)\b/i;
const GATE_CONTEXT = /\b(?:must|should|shall|has to|have to|need(?:s)? to|required|only|eligible|belong\w*|holder|holding|possess\w*|living|lives?|come from|comes from|from a|card)\b/i;

const RECEIVING_PENSION = /\b(?:receiv\w*|getting|drawing|availing|in receipt of|beneficiar\w* of)\b[^.]{0,60}\bpension\b|\bpensioners?\b/i;
/** The pension this scheme pays, or a pension the applicant is meant to have. */
const PENSION_NOT_A_GATE = /\b(?:under this scheme|of this scheme|from this scheme|family pension holders? (?:are|is) eligible|should be a pensioner|must be a pensioner)\b/i;

function empty<V extends string>(): GateResult<V> {
  return { value: null, matchedSentences: [], rejected: [], nullReason: null };
}

/** Collects one value per sentence; disagreeing sentences make the result null. A stricter "not-family" wins over "not-self". */
function settle<V extends string>(r: GateResult<V>, found: Array<[V, string]>, stricter?: [V, V]) {
  if (!found.length) return r;
  let values = Array.from(new Set(found.map(([v]) => v)));
  if (stricter && values.length === 2 && values.includes(stricter[0]) && values.includes(stricter[1])) values = [stricter[1]];
  if (values.length > 1) {
    r.nullReason = `sentences disagree (${values.join(' vs ')})`;
    return r;
  }
  r.value = values[0];
  r.matchedSentences = found.filter(([v]) => v === values[0] || !stricter).map(([, s]) => s);
  return r;
}

function govtJob(sentences: string[]): GateResult<GovtJobRule> {
  const r = empty<GovtJobRule>();
  const found: Array<[GovtJobRule, string]> = [];
  for (const s of sentences) {
    if (!GOVT_JOB.test(s)) continue;
    const reject = (reason: string) => r.rejected.push({ sentence: s, reason });
    if (HEADING.test(s)) { reject('heading'); continue; }
    if (NOT_A_CURRENT_JOB.test(s) || (RETIRED.test(s) && !CURRENT_JOB.test(s))) { reject('about a dismissed, retired or former employee, not a job held now'); continue; }
    if (/\bpension\w*\b[^.]{0,40}\b(?:government|govt)\b/i.test(s) && !/\b(?:employ\w*|servants?|service holder)\b/i.test(s)) { reject('a pension from government service (the pension rule), not a job'); continue; }
    if (OTHER_PERSON.test(s)) { reject('about someone other than the applicant or their family (a deceased person, a consultant, a son or daughter)'); continue; }
    if (NOT_A_RULE.test(s)) { reject('a note, a condition, a blacklist, a sub-category or an open invitation, not a rule'); continue; }
    if (NOT_A_GATE.test(s)) { reject('preference or reservation, not a gate'); continue; }
    if (GOVT_REQUIRED.test(s) && !NEGATION.test(s) && !EXCLUSIONS_HEADING.test(s)) {
      // "should be a government employee, pensioner, or dependent family member": too many alternatives to hold
      if (/\bor\b/i.test(s)) { reject('a government employee OR someone else: alternatives one column cannot hold'); continue; }
      found.push(['required', s]);
      continue;
    }
    if (!NEGATION.test(s) && !EXCLUSIONS_HEADING.test(s)) { reject('mentions a government job but not as something the applicant must not have'); continue; }
    found.push([FAMILY.test(s) ? 'not-family' : 'not-self', s]);
  }
  return settle(r, found, ['not-self', 'not-family']);
}

function incomeTax(sentences: string[]): GateResult<IncomeTaxRule> {
  const r = empty<IncomeTaxRule>();
  const found: Array<[IncomeTaxRule, string]> = [];
  for (const s of sentences) {
    if (!INCOME_TAX.test(s)) continue;
    const reject = (reason: string) => r.rejected.push({ sentence: s, reason });
    if (HEADING.test(s)) { reject('heading'); continue; }
    if (NOT_A_RULE.test(s)) { reject('a note, a condition or a sub-category, not a rule'); continue; }
    if (/\bincome[- ]?tax act\b|\bexceed\w*\b/i.test(s)) { reject('the Income Tax Act or an income limit, not a rule about paying tax'); continue; }
    if (/\bincome[- ]?tax\s+(?:return|certificate|assessment|pan)\b|\bitr\b/i.test(s) && !/\btax[- ]?payers?\b/i.test(s)) {
      reject('asks for an income-tax paper, not a rule about paying tax');
      continue;
    }
    if (!NEGATION.test(s)) { reject('mentions income tax but not as something the applicant must not pay'); continue; }
    found.push([FAMILY.test(s) ? 'not-family' : 'not-self', s]);
  }
  return settle(r, found, ['not-self', 'not-family']);
}

function bpl(sentences: string[]): GateResult<BplRule> {
  const r = empty<BplRule>();
  const found: Array<[BplRule, string]> = [];
  for (const s of sentences) {
    if (!BPL_WORD.test(s) && !NON_BPL.test(s)) continue;
    const reject = (reason: string) => r.rejected.push({ sentence: s, reason });
    if (HEADING.test(s)) { reject('heading'); continue; }
    if (NOT_A_RULE.test(s)) { reject('a note, a condition or a sub-category, not a rule'); continue; }
    // "(b) the non-BPL category with income ...", "B. Above Poverty Line": one option in a list
    if (/^\s*\(?[a-z0-9]{1,2}[.)]\s/i.test(s)) { reject('one option in a list of categories, not a gate'); continue; }
    // "BPL or APL", "BPL as well as APL", "BPL or Non-BPL both": open to both
    if (NON_BPL.test(s) && BPL_WORD.test(s.replace(new RegExp(NON_BPL.source, 'gi'), ' '))) { reject('open to both BPL and non-BPL'); continue; }
    if (OPEN_LIST.test(s)) { reject('a list of who may apply, not a gate'); continue; }
    // "one member per family, except BPL families", "BPL card holders may also be allowed", "SC/ST, SMF, and BPL Families"
    if (/\bexcept\b|\bmay also\b|\balso be allowed\b|,\s*(?:and\s+)?bpl\b|\bbpl\b[^.]{0,30}\band\b[^.]{0,25}\b(?:scheduled|sc|st)\b[^.]{0,15}\bcategor/i.test(s)) {
      reject('an exception, an extra group allowed, or BPL as one of several groups');
      continue;
    }
    // how applicants are picked or ranked, not who may apply
    if (/\b(?:criteria|selected in|identification of|filter)\b/i.test(s)) { reject('how applicants are identified or ranked, not a gate'); continue; }
    if (NON_BPL.test(s)) {
      if (ALTERNATIVE.test(s) || /\bwith annual income\b|\bif (?:from|belonging)\b/i.test(s)) { reject('non-BPL with a condition, not a gate'); continue; }
      found.push(['no', s]);
      continue;
    }
    if (NOT_A_GATE.test(s)) { reject('preference or reservation, not a gate'); continue; }
    if (ALTERNATIVE.test(s)) { reject('BPL OR something else: alternatives one column cannot hold'); continue; }
    if (BENEFIT_TIER.test(s)) { reject('a different amount for BPL people, not a gate'); continue; }
    if (NEGATION.test(s)) { reject('negated in a way the parser does not read safely'); continue; }
    if (!GATE_CONTEXT.test(s)) { reject('mentions BPL but is not phrased as a rule'); continue; }
    found.push(['yes', s]);
  }
  return settle(r, found);
}

function pension(sentences: string[]): GateResult<PensionRule> {
  const r = empty<PensionRule>();
  const found: Array<[PensionRule, string]> = [];
  for (const s of sentences) {
    if (!RECEIVING_PENSION.test(s)) continue;
    const reject = (reason: string) => r.rejected.push({ sentence: s, reason });
    if (HEADING.test(s)) { reject('heading'); continue; }
    if (NOT_A_RULE.test(s)) { reject('a note, a condition or a sub-category, not a rule'); continue; }
    if (OTHER_PERSON.test(s)) { reject('about someone other than the applicant (a deceased or missing person)'); continue; }
    if (/\bexceed\w*\b|₹|\brs\.?\s*\d|\bor more\b|\bat least\b|\bceased?\b/i.test(s)) { reject('a pension above or below an amount, or when it stops: a yes/no answer cannot check it'); continue; }
    if (PENSION_NOT_A_GATE.test(s)) { reject('the pension this scheme pays, or one the applicant must have'); continue; }
    if (!NEGATION.test(s)) { reject('mentions a pension but not as something the applicant must not receive'); continue; }
    found.push(['no', s]);
  }
  return settle(r, found);
}

export function extractStatusGates(eligibilityRawText: string[]): StatusGates {
  const sentences = splitIntoSentences(eligibilityRawText);
  return { govtJob: govtJob(sentences), incomeTax: incomeTax(sentences), bpl: bpl(sentences), pension: pension(sentences) };
}
