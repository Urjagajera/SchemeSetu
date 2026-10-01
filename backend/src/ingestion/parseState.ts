/**
 * parseState.ts
 * Pure, testable extraction of STATE RESIDENCY gates ("the applicant must be a resident of Gujarat") from
 * Scheme.eligibilityRawText. Sibling of parseDemographics.ts (gender / social category).
 *
 * Locked design rules (agreed before writing this):
 * 1. PRECISION OVER RECALL, as for gender and category. The eligibility engine treats a mismatch as
 *    authoritative and drops the scheme, so an invented restriction hides a scheme from someone who may be
 *    eligible. Anything ambiguous leaves the field null.
 * 2. EXPLICIT TEXT ONLY. A scheme's authority being a state is NOT used to invent a gate: that is the job of the
 *    authority-level filters that already exist. A state scheme with no residency sentence stays null here.
 *    The one exception is "resident of the State" with no name, which is resolved to the scheme's own state.
 * 3. A sentence only counts if it reads as a gate on the applicant themselves (resident of / residing in /
 *    domicile of / belongs to / applicant from / located in), in a sentence that is an eligibility rule. Mentions
 *    that are benefit tiers, preferences, quotas, inclusion lists, institution or business locations, paperwork,
 *    exclusions ("other than", "except") or open-ended lists ("and other states") do not count.
 * 4. The value is a SET of states (comma-separated, canonical spelling from utils/states.ts), because real gates
 *    name several states ("one of the seven participating states", "North-Eastern States", "UTs of J&K and
 *    Ladakh"). Separate sentences are separate requirements, so they are INTERSECTED; an empty intersection is a
 *    conflict -> null.
 * 5. Years of residence ("for at least 3 years") do not change the state gate (the profile cannot answer them);
 *    they are only flagged for the review report.
 * 6. Where a scheme's text names a different state than its authority, the TEXT wins (product decision).
 */
import { INDIAN_STATES_AND_UTS, canonicalState } from '../utils/states.js';
import { ABBREVIATION, DOT, splitIntoSentences } from './sentences.js';

export interface RejectedMention {
  sentence: string;
  reason: string;
}

export interface StateExtractionResult {
  /** Comma-separated canonical state names, in the canonical list order, or null when there is no (safe) gate. */
  value: string | null;
  values: string[];
  matchedSentences: string[];
  rejected: RejectedMention[];
  /** Why the field is null even though something was mentioned (if applicable). */
  nullReason: string | null;
  /** An accepted sentence also asks for a number of years of residence (not modelled). */
  yearsQualifier: boolean;
  /** The state came from "resident of the State" with no name, resolved to the scheme's own state. */
  usedImplicit: boolean;
  /** An accepted sentence restricts to districts inside the named state(s): the set is a superset of who qualifies. */
  districtLevel: boolean;
  /** The scheme's authority is a state and the result does not include it (text wins, but worth a human look). */
  differsFromAuthority: boolean;
  /** Set when a human reviewed this scheme and decided its state text is a source-data error: no gate is stored. */
  suppressedReason: string | null;
  /** What the text said before it was suppressed (for the report). */
  suppressedValue: string | null;
}

/**
 * Schemes whose text names a state that contradicts their authority and that were reviewed by hand and judged to
 * be SOURCE-DATA ERRORS (a wrong state pasted into a template), not intentional cross-state eligibility. For these
 * no state gate is stored: they stay authority-only, like a scheme with no residency sentence. Keyed by
 * Scheme.sourceUrl so the exception cannot leak onto any other scheme. The general rule (when text and authority
 * disagree, the text wins) is unchanged for every scheme not listed here.
 * Decision: product owner, after reading the state dry-run report.
 */
export const SUPPRESSED_STATE_GATES: ReadonlyMap<string, string> = new Map([
  ['https://www.myscheme.gov.in/schemes/maternalnutritionuk', 'text says Odisha but the authority is Uttarakhand: source-data error'],
  ['https://www.myscheme.gov.in/schemes/matbhpbocwwb', 'text says Himachal Pradesh but the authority is Madhya Pradesh: source-data error'],
  ['https://www.myscheme.gov.in/schemes/shssd', 'text says Chhattisgarh but the authority is Madhya Pradesh: source-data error'],
]);

// ─────────────────────────────────────────────────────────────
// Finding states in text
// ─────────────────────────────────────────────────────────────

const NORTH_EAST = ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];
const NE_REGION = /\bnorth[- ]?east(?:ern)?\s+(?:states?|regions?)\b|\bNE\s+states?\b|\bNER\b/gi;

/** Spellings that appear in the data besides the canonical name. */
const SPELLINGS: Array<[RegExp, string]> = [
  [/\bJ\s*&\s*K\b/gi, 'Jammu and Kashmir'],
  [/\bJammu\s*(?:&|and)\s*Kashmir\b/gi, 'Jammu and Kashmir'],
  [/\bAndaman\s*(?:&|and)\s*Nicobar(?:\s+Islands?)?\b/gi, 'Andaman and Nicobar Islands'],
  [/\bDadra\s*(?:&|and)\s*Nagar\s+Haveli(?:\s*(?:&|and)\s*Daman\s*(?:&|and)\s*Diu)?\b/gi, 'Dadra & Nagar Haveli and Daman & Diu'],
  [/\bDaman\s*(?:&|and)\s*Diu\b/gi, 'Dadra & Nagar Haveli and Daman & Diu'],
  [/\b(?:NCT of Delhi|New Delhi)\b/gi, 'Delhi'],
  [/\bOrissa\b/gi, 'Odisha'],
  [/\bPondicherry\b/gi, 'Puducherry'],
];

/**
 * A state name that is not a place of residence: part of an organisation's name ("Assam Rifles",
 * "Punjab National Bank", "University of Delhi") or the government that runs the scheme ("recognised by the
 * Government of Gujarat", "Board of ...").
 */
const ORG_AFTER = '(?!\\s+(?:Rifles|National\\s+Bank|Bank\\b|University|Regiment|Police|State\\s+(?:Electricity|Road|Fertili)))';
const ORG_BEFORE = '(?<!(?:University\\s+of|Bank\\s+of|Government\\s+of|Govt\\.?\\s+of|Board\\s+of|Governor\\s+of|Minister\\s+of|Government\\s+of\\s+India\\s+in)\\s)';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&');

/** The states / union territories named in a piece of text, in canonical list order (regions expanded). */
export function statesIn(text: string): string[] {
  const found = new Set<string>();
  let t = text;
  for (const [re, canon] of SPELLINGS) t = t.replace(re, ` ${canon} `);
  if (NE_REGION.test(t)) NORTH_EAST.forEach((s) => found.add(s));
  NE_REGION.lastIndex = 0;
  for (const name of INDIAN_STATES_AND_UTS) {
    const re = new RegExp(`(?<![A-Za-z])${ORG_BEFORE}${escapeRe(name)}(?![A-Za-z])${ORG_AFTER}`, 'i');
    if (re.test(t)) found.add(name);
  }
  return INDIAN_STATES_AND_UTS.filter((s) => found.has(s));
}

/** Length of the shortest prefix of `text` that already contains a state (binary search: a prefix only gains states as it grows). */
function firstStateEnd(text: string): number {
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (statesIn(text.slice(0, mid)).length > 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

// ─────────────────────────────────────────────────────────────
// Sentence-level rules
// ─────────────────────────────────────────────────────────────


/** Relaxations, preferences, quotas and benefit tiers: they mention a state without restricting who may apply. */
const NOT_A_GATE =
  /(relax|priorit|prefer|reserv|quota|concession|special focus|extra |additional|per cent|\d\s*%|assistance (?:of|will|up)|up to \d|subsid|incentive|grant of|bonus|difficult areas|weightage)/i;

/** "other than", "except", "not a resident": the opposite of a gate. */
const EXCLUSION = /\b(other than|excluding|except|apart from|not a resident|non-?residents?|outside (?:the )?state)\b/i;

/** Open to people from elsewhere too. "irrespective of income" is fine; "irrespective of state" is not. */
const OPEN =
  /\b(?:from|of|in|to|resident of|belong\w*\s+to)\s+(?:any|all|every)\s+(?:other\s+)?(?:states?|regions?)\b|\bother (?:states|regions)\b|\b(?:irrespective|regardless) of (?:the |their )?(?:state|residence|domicile|region|origin)\b|\b(?:across|anywhere in|throughout) india\b|\bpan[- ]india\b|\band others\b|\bamong others\b|\betc\b|\band\/or others\b/i;

/** "resident of Gujarat or studying / working / registered in Gujarat": another route to eligibility exists. */
const ALT_ROUTE =
  /\bor\b\s+(?:(?:is|are|should|must|has|have|had|having|been|being|be)\s+)*(?:studying|studied|working|worked|employed|doing business|registered|born|any indian)\b/i;

/** Where the applicant's college, business, hospital or office is, not where the applicant lives. */
const INSTITUTION =
  /\b(college|colleges|universit\w*|institut\w*|school|schools|hospital|hospitals|centre|center|centres|centers|unit|office|plant|factory|enterprise|firm|company|society|organi[sz]ation|ngo|trust|laborator\w*|godown|branch|bank)\b/i;

/** Paperwork wording: a certificate is evidence, not the rule. Only a problem if it comes BEFORE the residency phrase. */
const PAPERWORK = /\b(certificate|proof|affidavit|documents?|ration card|aadhaar|passport|voter)\b/i;

/** "including minorities, women weavers and weavers belonging to NER": a list of who is covered, not a gate. */
const INCLUSION_LIST = /\b(including|inclusive of)\b/i;

/** A sentence has to be an eligibility rule, not a description. */
const GATE_CONTEXT = new RegExp(
  String.raw`\b(must|should|shall|will be|mandatory|compulsory|essential|has to|have to|needs? to|required to|is eligible|are eligible|eligible|can apply|may apply|can avail|may avail|avail|available to|open to|applicable (?:to|for)|admissible|entitled|only|meant for|intended for|designed for|restricted to|limited to|exclusively)\b|\b(?:applicant|beneficiary|candidate|person|individual|family|student|girl|woman|farmer|worker|artisan|weaver|he|she|they)\s+(?:is|are|was)\b|\bwho\s+(?:is|are|has been|have been)\b`,
  'i',
);

/** A short line that is just the residency rule: "Residents of Punjab.", "Domicile of Uttar Pradesh.", "• a permanent resident of Assam". */
const FRAGMENT = /^[••*\-\d.)\s]*(?:(?:an?|the|any|all|only)\s+)?(?:[A-Za-z]+\s+){0,2}?(?:permanent\s+|original\s+|bona ?fide\s+|local\s+|indigenous\s+)?(?:residents?|natives?|domicile[sd]?)\b/i;

const APPLICANT_SUBJECT =
  /\b(applicants?|beneficiar(?:y|ies)|candidates?|growers?|farmers?|cultivators?|girls?|boys?|students?|scholars?|persons?|individuals?|women|men|artisans?|weavers?|workers?|labou?rers?|fishermen|fisherfolk|widows?|pensioners?|sportspersons?|sportsmen|sportswomen|players?|athletes?|patients?|youth|children|child|wards?|parents?|tribals?|citizens?|claimant|head|owners?|members?|famil(?:y|ies)|households?|residents?)\b/i;

/** Years only count as a residence qualifier when they sit next to a residence word ("18 to 60 years of age" is not one). */
const YEARS_NUM = String.raw`(?:\d+|one|two|three|four|five|six|seven|ten|twelve|fifteen|twenty)\s*(?:\(\d+\)\s*)?(?:years?|yrs?)`;
const RESIDENCE_YEARS = new RegExp(String.raw`\b(?:resid\w*|domicil\w*|native|inhabitant\w*|living)\b[^.;]{0,70}\b${YEARS_NUM}\b|\b${YEARS_NUM}\b(?!\s+(?:of\s+age|old|and\s+above|or\s+above|or\s+more\s+of\s+age))[^.;]{0,40}\b(?:resid\w*|domicil\w*)\b`, 'i');

/**
 * Phrases that introduce "where the applicant is from". The weaker forms also need an applicant-like subject.
 */
const ANCHORS: Array<{ name: string; re: RegExp; needsSubject: boolean }> = [
  {
    name: 'resident of',
    re: /\b(?:(?:permanent(?:ly)?|original|bona ?fide|local|indigenous)\s+(?:and\s+(?:permanent|indigenous|original)\s+)?)*(?:residents?|inhabitants?|domiciles?|domiciled|natives?)(?:\s*\/\s*(?:domicile|resident|native)s?)?(?:\s+(?:famil(?:y|ies)|citizens?|households?))?\s+(?:of|in|from)\b/gi,
    needsSubject: false,
  },
  {
    name: 'residing in',
    re: /\b(?:resid(?:e|es|ing)|living|settled)\s+(?:permanently\s+|ordinarily\s+)?(?:in|within)\b/gi,
    needsSubject: false,
  },
  { name: 'located in', re: /\b(?:located|situated|based)\s+(?:in|within)\b/gi, needsSubject: true },
  { name: 'belongs to', re: /\b(?:belong(?:s|ing)?|hail(?:s|ing)?)\s+(?:to|from)\b/gi, needsSubject: true },
  {
    name: 'applicant from',
    re: /\b(?:applicants?|beneficiar(?:y|ies)|candidates?|growers?|farmers?|girls?|students?|persons?|individuals?|women|artisans?|workers?)\s+(?:[A-Za-z-]+\s+){0,3}?from\b/gi,
    needsSubject: false,
  },
  { name: 'from the following', re: /\bfrom\s+(?:the\s+)?following\b/gi, needsSubject: true },
];

/** The clause that follows an anchor ends at the first of these: only states inside it count. */
const CLAUSE_BREAK =
  /;|:|\.(?:\s|$)|\s(?:who|whose|which|having|and have|and has|should|must|shall|with|studying|pursuing|enrolled|seeking|for at least|for a minimum|for more than|since|before|after|during|while|to be|to avail|to apply)\b/i;

const IMPLICIT_STATE = /\b(?:residents?|domicile[d]?|natives?|inhabitants?)\s+(?:of|in)\s+(?:the\s+)?(?:same\s+)?(?:state|union territory|u\.?t\.?)\b|\b(?:residing|living)\s+in\s+the\s+(?:state|union territory)\b/i;

interface SentenceDecision {
  /** States this sentence restricts to, or null when it is not a state gate. */
  states: string[] | null;
  /** Resolved from "resident of the State": the caller substitutes the scheme's own state. */
  implicit?: boolean;
  reject: string | null;
  years?: boolean;
  district?: boolean;
}

function decideSentence(sentence: string): SentenceDecision {
  const none: SentenceDecision = { states: null, reject: null };

  const hasImplicit = IMPLICIT_STATE.test(sentence);
  const named = statesIn(sentence);
  if (named.length === 0 && !hasImplicit) return none; // not about a state at all

  const generalReject = (): string | null => {
    // A trailing colon makes a heading ("For residents of Gujarat:") unless the sentence is itself a rule
    // ("an applicant must be a bonafide resident of Himachal Pradesh and fulfil the below criteria:").
    if (SEGMENT_HEADING.test(sentence) && !GATE_CONTEXT.test(sentence)) return 'heading that introduces a list or segment, not a rule';
    if (NOT_A_GATE.test(sentence)) return 'relaxation / preference / benefit tier, not a gate';
    if (EXCLUSION.test(sentence)) return 'exclusionary wording';
    if (OPEN.test(sentence)) return 'open to people from other states or an open-ended list';
    if (!GATE_CONTEXT.test(sentence) && !(sentence.length <= 110 && FRAGMENT.test(sentence))) return 'mentions residence but is not phrased as an eligibility rule';
    return null;
  };

  // "resident of the State" with no name: the caller resolves it to the scheme's own state.
  if (named.length === 0 && hasImplicit) {
    const why = generalReject();
    if (why) return { states: null, reject: why };
    return { states: [], implicit: true, reject: null, years: RESIDENCE_YEARS.test(sentence) };
  }

  // Look for an anchor phrase followed, soon after, by a state name.
  let sawAnchorWithoutState = false;
  for (const anchor of ANCHORS) {
    anchor.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = anchor.re.exec(sentence)) !== null) {
      const before = sentence.slice(0, m.index);
      const after = sentence.slice(m.index + m[0].length);
      // (abbreviation dots such as "i.e." must not end the clause: a list often follows them)
      const brk = after.replace(ABBREVIATION, (a) => a.replace(/\./g, DOT)).search(CLAUSE_BREAK);
      const tail = brk >= 0 ? after.slice(0, brk) : after;
      const inTail = statesIn(tail);
      // a state has to be named soon after the anchor, so a faraway name is not linked to it
      if (inTail.length === 0 || statesIn(tail.slice(0, 90)).length === 0) {
        sawAnchorWithoutState = true;
        continue;
      }

      if (anchor.needsSubject && !APPLICANT_SUBJECT.test(before)) return { states: null, reject: 'the subject of the location phrase is not the applicant' };
      if (INCLUSION_LIST.test(before)) return { states: null, reject: 'inclusion list ("including ... belonging to ..."), not a gate' };
      // "a student from an Educational Institute in Goa": the place named belongs to an institution, not to the person
      if (INSTITUTION.test(tail.slice(0, firstStateEnd(tail)))) return { states: null, reject: 'location of an institution / business / office, not where the applicant lives' };
      if (anchor.name === 'located in' && INSTITUTION.test(before.slice(-45))) return { states: null, reject: 'location of an institution / business / office, not where the applicant lives' };
      if (INSTITUTION.test(before.slice(-30)) && anchor.name !== 'resident of' && anchor.name !== 'residing in') {
        return { states: null, reject: 'location of an institution / business / office, not where the applicant lives' };
      }
      if (PAPERWORK.test(before)) return { states: null, reject: 'paperwork requirement (certificate/proof), not the rule itself' };
      const why = generalReject();
      if (why) return { states: null, reject: why };
      if (ALT_ROUTE.test(after)) return { states: null, reject: 'another route to eligibility (study/work/registration) in the same sentence' };

      return { states: inTail, reject: null, years: RESIDENCE_YEARS.test(sentence), district: /\bdistricts?\b/i.test(tail) };
    }
  }

  if (sawAnchorWithoutState) return { states: null, reject: 'residence wording but the state is not named close to it' };
  return { states: null, reject: 'names a state but not as where the applicant lives' };
}

const SEGMENT_HEADING = /:\s*$/;

// ─────────────────────────────────────────────────────────────
// Scheme-level result
// ─────────────────────────────────────────────────────────────

function emptyResult(): StateExtractionResult {
  return { value: null, values: [], matchedSentences: [], rejected: [], nullReason: null, yearsQualifier: false, usedImplicit: false, districtLevel: false, differsFromAuthority: false, suppressedReason: null, suppressedValue: null };
}

/**
 * @param sentences     Scheme.eligibilityRawText
 * @param authorityName Scheme.authorityName; only used to resolve "resident of the State" (when it is a state)
 * @param sourceUrl     Scheme.sourceUrl; only used to apply SUPPRESSED_STATE_GATES
 */
export function extractState(sentences: string[], authorityName?: string, sourceUrl?: string): StateExtractionResult {
  const result = extractStateFromText(sentences, authorityName);
  const suppressed = sourceUrl ? SUPPRESSED_STATE_GATES.get(sourceUrl) : undefined;
  if (suppressed && result.value) {
    result.suppressedReason = suppressed;
    result.suppressedValue = result.value;
    result.value = null;
    result.values = [];
    result.matchedSentences = [];
    result.differsFromAuthority = false;
    result.nullReason = `suppressed after review: ${suppressed}`;
  }
  return result;
}

function extractStateFromText(sentences: string[], authorityName?: string): StateExtractionResult {
  const result = emptyResult();
  const authorityState = canonicalState(authorityName ?? '');

  let allowed: string[] | null = null;
  const implicitSentences: string[] = [];
  let explicitCount = 0;

  for (const sentence of splitIntoSentences(sentences)) {
    const d = decideSentence(sentence);
    if (d.reject) {
      result.rejected.push({ sentence, reason: d.reject });
      continue;
    }
    if (d.states === null) continue;

    if (d.implicit) {
      implicitSentences.push(sentence);
      if (d.years) result.yearsQualifier = true;
      continue;
    }
    explicitCount++;
    result.matchedSentences.push(sentence);
    if (d.years) result.yearsQualifier = true;
    if (d.district) result.districtLevel = true;
    const set = d.states;
    allowed = allowed === null ? [...set] : allowed.filter((s) => set.includes(s)); // each sentence is its own requirement
    if (allowed.length === 0) {
      result.matchedSentences = [];
      result.nullReason = 'state gates in different sentences do not overlap';
      return result;
    }
  }

  // "Resident of the State" counts only when no sentence names a state explicitly (explicit text wins).
  if (explicitCount === 0 && implicitSentences.length > 0) {
    if (authorityState) {
      result.matchedSentences = implicitSentences;
      result.usedImplicit = true;
      allowed = [authorityState];
    } else {
      result.yearsQualifier = false;
      for (const s of implicitSentences) result.rejected.push({ sentence: s, reason: '"resident of the State" in a scheme whose authority is not a state: which state is unknown' });
    }
  } else if (explicitCount > 0) {
    for (const s of implicitSentences) result.rejected.push({ sentence: s, reason: 'implicit "the State" ignored: a state is named explicitly elsewhere in the scheme' });
  }

  if (allowed && allowed.length > 0) {
    result.values = INDIAN_STATES_AND_UTS.filter((s) => allowed!.includes(s));
    result.value = result.values.join(',');
    result.differsFromAuthority = authorityState !== null && !result.values.includes(authorityState);
  }
  return result;
}
