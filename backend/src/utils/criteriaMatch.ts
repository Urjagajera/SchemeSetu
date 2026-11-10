/**
 * Matching of a profile against stored EligibilityCriteria.
 * Shared by POST /api/eligibility/report and POST /api/schemes/recommended so both
 * routes judge a profile identically.
 *
 * gender, category and state are stored as comma-separated SETS (for example "sc,st",
 * "female", or "Kerala,Tamil Nadu"; see ingestion/parseDemographics.ts and parseState.ts),
 * so the profile passes when its value is IN the set. landOwnership and residence are single
 * values and use a plain case-insensitive equality.
 *
 * OCCUPATION IS SOFT. A profile holds one occupation but a person can be a student and a farmer, so a
 * mismatch is never a reason to exclude a scheme. evaluateCriteria marks the occupation result `soft`:
 * callers use a match to rank a scheme higher, and a mismatch to rank it lower and show a "worth checking"
 * note, but never as a failed criterion. A blank, "other" or "senior citizen" profile occupation says
 * nothing at all (there is no result).
 *
 * UNKNOWN IS NOT A FAILURE. A criterion the profile can't answer (the field is
 * empty or missing) is reported as "unknown": it never excludes a scheme, and the
 * routes surface it as a note ("set your profile to check this") instead.
 */
import { IncomingProfile } from './profile.js';
import { canonicalState } from './states.js';

export type CriteriaStringField = 'gender' | 'category' | 'occupation' | 'state' | 'landOwnership' | 'residence';

const SET_FIELDS: ReadonlySet<CriteriaStringField> = new Set(['gender', 'category', 'state', 'occupation']);

function splitSet(criteriaValue: string): string[] {
  return criteriaValue
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the profile value satisfies the stored criteria value for this field. */
export function profileMatchesCriteria(field: CriteriaStringField, criteriaValue: string, profileValue: string): boolean {
  const profile = profileValue.trim().toLowerCase();

  if (!SET_FIELDS.has(field)) {
    return criteriaValue.trim().toLowerCase() === profile;
  }

  const allowed = splitSet(criteriaValue);
  const candidates = [profile];
  // The profile form only offers male / female / other; "other" is how a transgender user is recorded.
  if (field === 'gender' && profile === 'other') candidates.push('transgender');
  return allowed.some((a) => candidates.includes(a));
}

const CATEGORY_LABELS: Record<string, string> = { sc: 'SC', st: 'ST', obc: 'OBC', general: 'General' };

/** The occupations a scheme can name (the profile's own options, minus "senior citizen" and "other"). */
const SCHEME_OCCUPATIONS: ReadonlySet<string> = new Set(['farmer', 'student', 'entrepreneur', 'employee', 'unemployed']);
const OCCUPATION_PEOPLE: Record<string, string> = { farmer: 'farmers', student: 'students', entrepreneur: 'entrepreneurs (self-employed)', employee: 'employees', unemployed: 'unemployed people' };

/** Human-readable form of a stored value for the eligibility report ("SC or ST", "female"). */
export function describeCriteriaValue(field: CriteriaStringField, criteriaValue: string): string {
  if (!SET_FIELDS.has(field)) return criteriaValue;
  if (field === 'state') {
    // back to the canonical spelling; a long list reads better as "one of these"
    const states = splitSet(criteriaValue).map((v) => canonicalState(v) ?? v);
    return states.length > 4 ? `one of these ${states.length} states / union territories: ${states.join(', ')}` : states.join(' or ');
  }
  if (field === 'occupation') return splitSet(criteriaValue).map((v) => OCCUPATION_PEOPLE[v] ?? v).join(' or ');
  const parts = splitSet(criteriaValue).map((v) => (field === 'category' ? CATEGORY_LABELS[v] ?? v : v));
  return parts.join(' or ');
}

/** The EligibilityCriteria columns the evaluator reads. */
export interface CriteriaRow {
  ageMin: number | null;
  ageMax: number | null;
  incomeMinAnnual: number | null;
  incomeMaxAnnual: number | null;
  gender: string | null;
  category: string | null;
  occupation: string | null;
  state: string | null;
  landOwnership: string | null;
  /** "rural" | "urban"; optional so older callers and fixtures without the column keep working. */
  residence?: string | null;
  /** Status rules (ingestion/parseStatusGates.ts); optional for the same reason. */
  govtJob?: string | null;
  incomeTax?: string | null;
  bpl?: string | null;
  pension?: string | null;
}

/** Profile fields a hint can point at (the frontend names them in the reader's language). */
export type StatusField = 'govtJob' | 'incomeTax' | 'bpl' | 'pension';
export type HintField = 'age' | 'income' | 'gender' | 'category' | 'state' | 'land' | 'residence' | StatusField;
export type FixedHintField = Exclude<HintField, 'age' | 'income' | StatusField>;

/**
 * "What would change my eligibility": one structured line per rule that blocks the person or could not be checked.
 * Structured (not a sentence) so the card can say it in English, Hindi or Gujarati.
 *  - add: the profile doesn't say; adding it would check this rule.
 *  - ageMin / ageMax / incomeMin / incomeMax: the limit and the profile's own value.
 *  - only: a fixed fact (gender, category, state, residence, land), stated plainly, never suggested as something to change.
 *  - occupation: a soft mismatch; the scheme is meant for these occupations.
 */
export type EligibilityHint =
  | { kind: 'add'; field: HintField }
  | { kind: 'ageMin' | 'ageMax' | 'incomeMin' | 'incomeMax'; limit: number; yours: number }
  | { kind: 'only'; field: FixedHintField; values: string[] }
  | { kind: 'occupation'; values: string[] }
  /** A status rule the person's answer doesn't meet, e.g. govtJob "not-family", bpl "yes". */
  | { kind: 'status'; field: StatusField; rule: string };

export interface CriterionResult {
  /** What the profile would need to supply, e.g. "Gender", "Age". */
  label: string;
  status: 'passed' | 'failed' | 'unknown';
  message: string;
  /** A soft result ranks a scheme but never excludes it (occupation). A soft failure is a note, not a failed criterion. */
  soft?: boolean;
  /** Set on failed and unknown results: what would change it. */
  hint?: EligibilityHint;
}

const hasValue = (v: string | undefined | null): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * Evaluates every criterion on file against the profile. Criteria the profile
 * can't answer come back as 'unknown' (one entry per field, not per bound).
 */
export function evaluateCriteria(criteria: CriteriaRow, profile: IncomingProfile): CriterionResult[] {
  const out: CriterionResult[] = [];
  const unknown = (label: string, field: HintField): CriterionResult => ({
    label,
    status: 'unknown',
    message: `${label}: add this to your profile to check`,
    hint: { kind: 'add', field },
  });

  // ── age ──
  if (criteria.ageMin !== null || criteria.ageMax !== null) {
    const age = parseInt(profile.age ?? '', 10);
    if (isNaN(age)) {
      out.push(unknown('Age', 'age'));
    } else {
      if (criteria.ageMin !== null) {
        out.push(
          age >= criteria.ageMin
            ? { label: 'Age', status: 'passed', message: `Age ≥ ${criteria.ageMin}` }
            : { label: 'Age', status: 'failed', message: `Age must be at least ${criteria.ageMin}`, hint: { kind: 'ageMin', limit: criteria.ageMin, yours: age } },
        );
      }
      if (criteria.ageMax !== null) {
        out.push(
          age <= criteria.ageMax
            ? { label: 'Age', status: 'passed', message: `Age ≤ ${criteria.ageMax}` }
            : { label: 'Age', status: 'failed', message: `Age must be at most ${criteria.ageMax}`, hint: { kind: 'ageMax', limit: criteria.ageMax, yours: age } },
        );
      }
    }
  }

  // ── income ──
  if (criteria.incomeMinAnnual !== null || criteria.incomeMaxAnnual !== null) {
    const income = parseInt(profile.income ?? '', 10);
    if (isNaN(income)) {
      out.push(unknown('Annual income', 'income'));
    } else {
      if (criteria.incomeMinAnnual !== null) {
        out.push(
          income >= criteria.incomeMinAnnual
            ? { label: 'Annual income', status: 'passed', message: 'Income meets minimum' }
            : { label: 'Annual income', status: 'failed', message: `Annual income must be at least ₹${criteria.incomeMinAnnual}`, hint: { kind: 'incomeMin', limit: criteria.incomeMinAnnual, yours: income } },
        );
      }
      if (criteria.incomeMaxAnnual !== null) {
        out.push(
          income <= criteria.incomeMaxAnnual
            ? { label: 'Annual income', status: 'passed', message: 'Income within limit' }
            : { label: 'Annual income', status: 'failed', message: `Annual income must not exceed ₹${criteria.incomeMaxAnnual}`, hint: { kind: 'incomeMax', limit: criteria.incomeMaxAnnual, yours: income } },
        );
      }
    }
  }

  // ── occupation (SOFT) ──
  if (criteria.occupation !== null) {
    const mine = (profile.occupation ?? '').trim().toLowerCase();
    // Only the occupations a scheme can name are compared; blank, "other" and "senior citizen" say nothing.
    if (SCHEME_OCCUPATIONS.has(mine)) {
      const allowed = splitSet(criteria.occupation);
      out.push(
        allowed.includes(mine)
          ? { label: 'Occupation', status: 'passed', soft: true, message: `Occupation matches (this scheme is for ${describeCriteriaValue('occupation', criteria.occupation)})` }
          : { label: 'Occupation', status: 'failed', soft: true, message: `This scheme is meant for ${describeCriteriaValue('occupation', criteria.occupation)}; your profile says ${mine}`, hint: { kind: 'occupation', values: allowed } },
      );
    }
  }

  // ── string fields ──
  const stringChecks: Array<[CriteriaStringField, string | null, string | undefined, string, FixedHintField]> = [
    ['gender', criteria.gender, profile.gender, 'Gender', 'gender'],
    ['category', criteria.category, profile.category, 'Social category', 'category'],
    // A state the app does not recognise is treated as not given: unknown never excludes.
    ['state', criteria.state, canonicalState(profile.state) ?? undefined, 'State residency', 'state'],
    ['landOwnership', criteria.landOwnership, profile.land, 'Land ownership', 'land'],
    ['residence', criteria.residence ?? null, profile.residence, 'Residence (rural / urban)', 'residence'],
  ];
  for (const [field, criteriaValue, profileValue, label, hintField] of stringChecks) {
    if (criteriaValue === null) continue;
    if (!hasValue(profileValue)) {
      out.push(unknown(label, hintField));
      continue;
    }
    // States go back to their canonical spelling; the rest are stored lower-case ("sc", "female", "yes").
    const only: EligibilityHint = {
      kind: 'only',
      field: hintField,
      values:
        field === 'state'
          ? splitSet(criteriaValue).map((v) => canonicalState(v) ?? v)
          : SET_FIELDS.has(field)
            ? splitSet(criteriaValue)
            : [criteriaValue.trim().toLowerCase()],
    };
    const wanted = describeCriteriaValue(field, criteriaValue);
    const matches = profileMatchesCriteria(field, criteriaValue, profileValue);
    if (field === 'landOwnership') {
      // The profile asks "Own Cultivable Land?", so say it in those words rather than "must be yes".
      out.push(
        matches
          ? { label, status: 'passed', message: criteriaValue.trim().toLowerCase() === 'yes' ? `${label} matches (owns cultivable land)` : `${label} matches (landless)` }
          : { label, status: 'failed', message: criteriaValue.trim().toLowerCase() === 'yes' ? 'Owning cultivable land is required' : 'The applicant must be landless (own no cultivable land)', hint: only },
      );
      continue;
    }
    out.push(
      matches
        ? { label, status: 'passed', message: `${label} matches (${wanted})` }
        : { label, status: 'failed', message: `${label} must be ${wanted}`, hint: only },
    );
  }

  // ── status rules (government job, income tax, BPL, pension) ──
  const statusChecks: Array<[StatusField, string | null | undefined, string | undefined, string]> = [
    ['govtJob', criteria.govtJob, profile.govtJob, 'Government job'],
    ['incomeTax', criteria.incomeTax, profile.incomeTax, 'Income tax'],
    ['bpl', criteria.bpl, profile.bpl, 'BPL'],
    ['pension', criteria.pension, profile.pension, 'Pension'],
  ];
  for (const [field, rule, answer, label] of statusChecks) {
    if (!rule) continue;
    if (!hasValue(answer)) {
      out.push(unknown(label, field));
      continue;
    }
    const ok = statusRuleMet(rule.trim().toLowerCase(), answer.trim().toLowerCase());
    if (ok === null) continue; // a rule or answer this version doesn't know: say nothing rather than guess
    out.push(
      ok
        ? { label, status: 'passed', message: `${label}: ${STATUS_RULE_TEXT[`${field}:${rule}`] ?? rule} (met)` }
        : { label, status: 'failed', message: `${label}: ${STATUS_RULE_TEXT[`${field}:${rule}`] ?? rule}`, hint: { kind: 'status', field, rule } },
    );
  }

  return out;
}

/** English wording of each status rule, for the passed / failed lists. The card words hints in the reader's language. */
const STATUS_RULE_TEXT: Record<string, string> = {
  'govtJob:not-self': 'not for people with a government job',
  'govtJob:not-family': 'not for families where anyone has a government job',
  'govtJob:required': 'only for government employees',
  'incomeTax:not-self': 'not for income-tax payers',
  'incomeTax:not-family': 'not for families where anyone pays income tax',
  'bpl:yes': 'only for families Below the Poverty Line (BPL)',
  'bpl:no': 'not for BPL families',
  'pension:no': 'not for people who already get a pension',
};

/**
 * Does the person's answer meet a status rule? Answers: govtJob / incomeTax "self" | "family" | "no"; bpl / pension
 * "yes" | "no". "not-family" covers the person too. null = an unknown rule or answer.
 */
export function statusRuleMet(rule: string, answer: string): boolean | null {
  const known = ['self', 'family', 'no', 'yes'];
  if (!known.includes(answer)) return null;
  switch (rule) {
    case 'not-self':
      return answer !== 'self' && answer !== 'yes';
    case 'not-family':
      return answer === 'no';
    case 'required':
      return answer === 'self';
    case 'yes':
      return answer === 'yes';
    case 'no':
      return answer === 'no';
    default:
      return null;
  }
}

/** Distinct labels of the criteria the profile couldn't answer. */
export function unverifiedLabels(results: CriterionResult[]): string[] {
  return Array.from(new Set(results.filter((r) => r.status === 'unknown').map((r) => r.label)));
}

/**
 * The hints for a report: blocking rules first, then rules the profile couldn't answer (one per field: age has two
 * bounds but one question), then soft (occupation) notes.
 */
export function eligibilityHints(results: CriterionResult[]): EligibilityHint[] {
  const blocking = results.filter((r) => r.status === 'failed' && !r.soft && r.hint).map((r) => r.hint!);
  const seen = new Set<string>();
  const add: EligibilityHint[] = [];
  for (const r of results) {
    if (r.status !== 'unknown' || r.hint?.kind !== 'add' || seen.has(r.hint.field)) continue;
    seen.add(r.hint.field);
    add.push(r.hint);
  }
  const soft = results.filter((r) => r.status === 'failed' && r.soft && r.hint).map((r) => r.hint!);
  return [...blocking, ...add, ...soft];
}
