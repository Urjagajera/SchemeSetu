/**
 * parseResidence.ts
 * Pure, testable extraction of a RURAL / URBAN residence requirement ("The applicant should be residing in a
 * rural area") from Scheme.eligibilityRawText. Sibling of parseState.ts. The result goes into the new
 * EligibilityCriteria.residence column, compared with the profile's residence ("rural" / "urban").
 *
 * Locked design rules (the same ones as the other parsers):
 * 1. PRECISION OVER RECALL. A mismatch drops the scheme, so only an explicit gate on where the applicant lives
 *    counts.
 * 2. The biggest source of "rural"/"urban" in the data is NOT a gate: income ceilings that differ by area
 *    ("₹98,000 rural / ₹1,20,000 urban", "if residing in urban areas"). Any sentence with an amount, an income or
 *    a limit is ignored. So are "both rural and urban" / "rural or urban" (open to both) and mentions of a local
 *    body, school, certificate, unit or business in a rural area (a place of work or study, not of residence).
 * 3. The value is a single word, "rural" or "urban"; a scheme open to both stays null.
 * 4. Separate sentences are separate requirements; "rural" in one and "urban" in another is a conflict -> null.
 */
import { splitIntoSentences } from './sentences.js';

export type ResidenceArea = 'rural' | 'urban';

export interface RejectedMention {
  sentence: string;
  reason: string;
}

export interface ResidenceExtractionResult {
  /** "rural" | "urban", or null when there is no (safe) requirement. */
  value: ResidenceArea | null;
  matchedSentences: string[];
  rejected: RejectedMention[];
  nullReason: string | null;
}

/** Amounts, incomes and limits: the area only picks which ceiling applies. */
const MONEY = /[₹]|\brs\b\.?|rupees|\bincome\b|\bceiling\b|\blimit\b|\bexceed\w*|\blakh\b|\bannual\b|\bsalary\b/i;
/** Open to both. */
const BOTH = /\b(?:rural|urban)\b\s*(?:and|or|&|\/|,)\s*(?:\w+\s+){0,2}(?:urban|rural)\b|\bboth\b[^.]{0,20}\b(?:rural|urban)\b/i;
/** A place of work or study, a body or paperwork: not where the applicant lives. */
const NOT_RESIDENCE =
  /\b(certificate|proof|school|college|institution|institute|unit|office|enterprise|business|branch|bank|industry|shop|centre|center|project|hospital|plant|factory|local bod\w*|panchayat|municipal\w*|corporation)\b/i;
const NOT_A_GATE = /(relax|priorit|prefer|reserv|quota|concession|special focus|extra |additional|per cent|\d\s*%|assistance (?:of|will|up)|subsid|incentive|grant of|bonus|weightage)/i;
const EXCLUSION = /\b(other than|excluding|except|apart from|not (?:a )?(?:resident|from))\b/i;
const SEGMENT_HEADING = /:\s*$/;
const GATE_CONTEXT = /\b(must|should|shall|has to|have to|needs? to|required to|is eligible|are eligible|eligible|only|mandatory|compulsory|essential|applicable)\b/i;
const SUBJECT = /\b(applicants?|beneficiar(?:y|ies)|candidates?|households?|famil(?:y|ies)|farmers?|persons?|individuals?|students?|residents?|women|youth|girls?|boys?|child(?:ren)?|wards?|widows?|pensioners?|labou?rers?|workers?|artisans?|vendors?|traders?)\b/i;

const FORMS: RegExp[] = [
  /\b(?:(?:resid\w*|liv(?:e|es|ing)|settled)\s+(?:(?:in|within|at)\s+)?|resident of\s+|native of\s+|belong\w* to\s+|hail\w* from\s+|from\s+)(?:an?\s+|the\s+|any\s+)?(?:(?:purely|predominantly|designated)\s+)?(rural|urban)\s+(?:area|areas|locality|localities|household|households|famil(?:y|ies)|background|setting|region|part|parts)\b/i,
  /\bpart of an?\s+(rural|urban)\b[^.]{0,25}\bhousehold\b/i,
  // "residing in rural Odisha": the area word sits in front of a place name
  /\b(?:resid\w*|liv(?:e|es|ing))\s+(?:in|within|at)\s+(rural|urban)\s+(?=[A-Z])/,
];

interface Decision {
  value: ResidenceArea | null;
  reject: string | null;
}

function decide(sentence: string): Decision {
  if (!/\b(?:rural|urban)\b/i.test(sentence)) return { value: null, reject: null };

  let area: ResidenceArea | null = null;
  let upToRule = sentence;
  for (const re of FORMS) {
    const m = re.exec(sentence);
    if (m) {
      area = m[1].toLowerCase() as ResidenceArea;
      upToRule = sentence.slice(0, m.index + m[0].length);
      break;
    }
  }
  if (!area) return { value: null, reject: 'mentions rural/urban but not as where the applicant lives' };

  if (SEGMENT_HEADING.test(sentence)) return { value: null, reject: 'heading that introduces a list or segment, not a rule' };
  if (MONEY.test(sentence)) return { value: null, reject: 'an amount or income limit that differs by area, not a residence gate' };
  if (BOTH.test(sentence)) return { value: null, reject: 'open to both rural and urban' };
  // (a certificate / school / unit named AFTER the rule, "must reside in a rural area and possess a ... certificate",
  // does not cancel it)
  if (NOT_RESIDENCE.test(upToRule)) return { value: null, reject: 'a place of work or study, a local body or paperwork, not where the applicant lives' };
  if (NOT_A_GATE.test(sentence)) return { value: null, reject: 'relaxation / preference / benefit tier, not a gate' };
  if (EXCLUSION.test(sentence)) return { value: null, reject: 'exclusionary wording' };
  // a bare line such as "Reside in a rural area" is the rule itself
  const bareRule = /^\s*[•*\-\d.)\s]*(?:reside|live|resident)\b/i.test(sentence) && sentence.length <= 60;
  if (!SUBJECT.test(sentence) && !bareRule) return { value: null, reject: 'the subject is not the applicant' };
  if (!GATE_CONTEXT.test(sentence) && !bareRule) return { value: null, reject: 'mentions residence but is not phrased as an eligibility rule' };
  return { value: area, reject: null };
}

export function extractResidence(sentences: string[]): ResidenceExtractionResult {
  const result: ResidenceExtractionResult = { value: null, matchedSentences: [], rejected: [], nullReason: null };
  const rural: string[] = [];
  const urban: string[] = [];

  for (const sentence of splitIntoSentences(sentences)) {
    const d = decide(sentence);
    if (d.reject) {
      result.rejected.push({ sentence, reason: d.reject });
      continue;
    }
    if (d.value === 'rural') rural.push(sentence);
    if (d.value === 'urban') urban.push(sentence);
  }

  if (rural.length > 0 && urban.length > 0) {
    result.nullReason = 'one sentence requires a rural residence and another an urban one';
    return result;
  }
  if (rural.length > 0) {
    result.value = 'rural';
    result.matchedSentences = rural;
  } else if (urban.length > 0) {
    result.value = 'urban';
    result.matchedSentences = urban;
  }
  return result;
}
