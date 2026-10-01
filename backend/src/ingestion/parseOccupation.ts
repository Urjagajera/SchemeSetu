/**
 * parseOccupation.ts
 * Pure, testable extraction of an OCCUPATION requirement ("The applicant must be a farmer") from
 * Scheme.eligibilityRawText. Sibling of parseState.ts / parseLand.ts. The result goes into
 * EligibilityCriteria.occupation, which the engine treats as a SOFT criterion (ranking and a note, never an
 * exclusion), because a profile holds ONE occupation while a person can be several things at once.
 *
 * Locked design rules:
 * 1. Only one phrasing counts: "The applicant / beneficiary / candidate must|should be a <occupation>". The other
 *    common phrasing, where the occupation is the subject of a sentence ("Farmers who have already received the
 *    benefit are not eligible", "The entrepreneur should have a vaccination scheme"), is mostly conditions,
 *    exclusions and process steps, so it is ignored.
 * 2. The value is a SET drawn from the profile's own options: farmer, student, entrepreneur, employee,
 *    unemployed ("self-employed" is entrepreneur). The profile's "senior citizen" and "other" never appear.
 * 3. Every alternative in the sentence has to be one we can model. "farmer, entrepreneur, or member of SHG",
 *    "student, guardian or heir of the student", "graduate student, researcher, or farmer" are rejected, because the
 *    real set is larger than the part we can name.
 * 4. Relatives and dependents ("ward of an unemployed ESM", "child of a farmer"), negations ("No member of the
 *    family should be an employee"), organisations, and benefit tiers do not count.
 * 5. Qualifiers are ignored ("small or marginal farmer", "girl student", "regular student", "SC entrepreneur"):
 *    they narrow the occupation, they do not change it.
 * 6. Separate sentences are separate requirements and are intersected; no overlap is a conflict -> null.
 */
import { splitIntoSentences } from './sentences.js';

export type OccupationValue = 'farmer' | 'student' | 'entrepreneur' | 'employee' | 'unemployed';

const ORDER: OccupationValue[] = ['farmer', 'student', 'entrepreneur', 'employee', 'unemployed'];

export interface RejectedMention {
  sentence: string;
  reason: string;
}

export interface OccupationExtractionResult {
  /** Comma-separated set in a fixed order (for example "farmer,entrepreneur"), or null when there is no (safe) requirement. */
  value: string | null;
  values: OccupationValue[];
  matchedSentences: string[];
  rejected: RejectedMention[];
  nullReason: string | null;
}

/** Whole noun phrases only: a token that is anything else makes the sentence unmodellable. */
const CLASSES: Array<[OccupationValue, RegExp]> = [
  ['farmer', /^(?:(?:[A-Za-z-]+\s+){0,2}farmers?|cultivators?|agriculturists?|ryots?|kisans?|growers?|livestock keepers?|(?:dairy|livestock|fish|poultry|horticulture|sericulture|bee) farmers?)$/i],
  ['student', /^(?:(?:[A-Za-z-]+\s+){0,2}students?|scholars?)$/i],
  ['entrepreneur', /^(?:(?:[A-Za-z-]+\s+){0,2}entrepreneurs?|self[- ]employed(?: persons?| individuals?)?|business ?(?:owners?|persons?|men|women)|proprietors?|msme owners?|start-?up founders?)$/i],
  ['employee', /^(?:employees?|salaried(?: employees?| persons?)?|government employees?|state government employees?|central government employees?)$/i],
  ['unemployed', /^(?:unemployed(?: persons?| youths?| individuals?)?|jobless(?: persons?)?)$/i],
];

/** Words that narrow an occupation without changing it. */
const QUALIFIER =
  /\b(?:small|marginal|ryot|bona ?fide|regular|full[- ]time|part[- ]time|first[- ]generation|prospective|interested|existing|new|progressive|genuine|actual|active|actively|registered|eligible|girl|boy|women|woman|male|female|transgender|differently[- ]abled|disabled|physically challenged|handicapped|SC|ST|OBC|scheduled castes?|scheduled tribes?|tribal|minority|poor|needy|meritorious|deserving|rural|urban|young|educated|local|individual|post[- ]?graduate|postgraduate|graduate|undergraduate|PhD|research|technical|medical|engineering|degree|diploma|school|college|university|professionally|currently|presently)\b/gi;

/** The noun phrase ends where a clause about it begins. */
const PHRASE_END = /,?\s(?:including|namely|such as|who|whose|that|which|having|with|engaged|actively|from|of|in|at|on|under|pursuing|studying|enrolled|aged|willing|looking|but|owning|owns|holding|possessing|cultivating|growing|rearing|practising|operating|involved|associated|and have|and has|and hold|and own|and possess|and are|and is|and also|and should|and must|residing|belonging|seeking|desiring|wishing|for|to be|to)\b|[.;:(]/i;

const FORM = /\b(?:applicants?|beneficiar(?:y|ies)|candidates?|persons?|individuals?)\b([^.;]{0,30}?)\b(?:must|should|shall|has to|have to|needs? to)\s+be\s+(?:an?\s+|the\s+)?([^.;]{1,140})/i;

const NOT_A_GATE = /(relax|priorit|prefer|reserv|quota|concession|special focus|extra |additional|\d+\s*%\s+of\s+(?:the\s+)?(?:beneficiar|applicant|seat|total)|assistance (?:of|will|up)|subsid|incentive|grant of|bonus|weightage)/i;
const NEGATION = /\b(?:not|no|none|neither|nor|non)\b/i;
const RELATIVE = /\b(?:ward|wards|son|daughter|child|children|wife|spouse|widow|dependent|dependant|family|parents?|father|mother|guardian|heir|member of the family)\b/i;
const ORGANISATION = /\b(?:organi[sz]ations?|NGOs?|societ(?:y|ies)|compan(?:y|ies)|firms?|groups?|institutions?|cooperatives?|trusts?)\b/i;
/** After the qualifier ("... in service of the Government OR the dependent family members"): a second group qualifies too. */
const OR_ANOTHER_GROUP =
  /\bor\b[^.;]{0,50}\b(?:dependents?|dependants?|family|spouse|wife|husband|sons?|daughters?|child(?:ren)?|wards?|members?|heirs?|guardians?|pensioners?|retired|workers?|labou?rers?|artisans?|researchers?|farmers?|students?|entrepreneurs?|employees?|unemployed|SHGs?|FPOs?|groups?|wage|salary)\b/i;

interface Decision {
  values: OccupationValue[] | null;
  reject: string | null;
}

function classify(token: string): OccupationValue | null {
  for (const [value, re] of CLASSES) if (re.test(token)) return value;
  return null;
}

function decide(sentence: string): Decision {
  const m = FORM.exec(sentence);
  if (!m) return { values: null, reject: null };

  const subjectTail = m[1];
  // A parenthesis must not end the phrase: "self-employed (including in agriculture) or wage/salary employed" has its
  // second alternative AFTER the brackets.
  let phrase = m[2].replace(/\([^)]*\)/g, ' ').trim();
  const cut = phrase.search(PHRASE_END);
  const rest = cut >= 0 ? phrase.slice(cut) : '';
  if (cut >= 0) phrase = phrase.slice(0, cut);

  // Is any occupation word in the phrase at all? If not, this sentence is about something else.
  const mentionsOccupation = CLASSES.some(([, re]) => phrase.split(/[\s,/&]+/).some((w) => re.test(w.replace(/[^A-Za-z-]/g, ''))));
  if (!mentionsOccupation) return { values: null, reject: null };

  // (a sentence ending in a colon that says "must be a student" is still a rule: the list after it describes the qualifiers)
  if (NEGATION.test(sentence.slice(0, (m.index ?? 0) + m[0].length - m[2].length))) return { values: null, reject: 'negated wording' };
  if (RELATIVE.test(subjectTail) || RELATIVE.test(sentence.slice(0, m.index ?? 0))) return { values: null, reject: 'the occupation belongs to a relative or dependent, not the applicant' };
  if (NOT_A_GATE.test(sentence)) return { values: null, reject: 'relaxation / preference / benefit tier, not a gate' };
  if (ORGANISATION.test(subjectTail)) return { values: null, reject: 'the applicant is an organisation or group' };

  // "... or the dependent family members of such employee": another way in sits AFTER the qualifier.
  if (OR_ANOTHER_GROUP.test(rest)) return { values: null, reject: 'another group (a relative, a different occupation or a member) can also qualify, later in the sentence' };

  const tokens = phrase
    .replace(QUALIFIER, ' ')
    .split(/\s*(?:,|\/|&|\bor\b|\band\b)\s*/i)
    .map((t) => t.replace(/\b(?:an?|the)\b/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const values: OccupationValue[] = [];
  for (const t of tokens) {
    const c = classify(t);
    if (!c) return { values: null, reject: `an alternative we cannot model ("${t}"): the real set is larger than the part we can name` };
    if (!values.includes(c)) values.push(c);
  }
  if (values.length === 0) return { values: null, reject: null };
  return { values, reject: null };
}

export function extractOccupation(sentences: string[]): OccupationExtractionResult {
  const result: OccupationExtractionResult = { value: null, values: [], matchedSentences: [], rejected: [], nullReason: null };
  let allowed: OccupationValue[] | null = null;

  for (const sentence of splitIntoSentences(sentences)) {
    const d = decide(sentence);
    if (d.reject) {
      result.rejected.push({ sentence, reason: d.reject });
      continue;
    }
    if (!d.values) continue;
    result.matchedSentences.push(sentence);
    allowed = allowed === null ? [...d.values] : allowed.filter((v) => d.values!.includes(v)); // each sentence is its own requirement
    if (allowed.length === 0) {
      result.matchedSentences = [];
      result.nullReason = 'occupation requirements in different sentences do not overlap';
      return result;
    }
  }

  if (allowed && allowed.length > 0) {
    result.values = ORDER.filter((v) => allowed!.includes(v));
    result.value = result.values.join(',');
  }
  return result;
}
