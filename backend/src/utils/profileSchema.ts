import { z } from 'zod';
import { canonicalState } from './states.js';

/**
 * Validation for PUT /api/profile.
 *
 * Principle: a profile may be saved partially. Only `name` is required (when it is sent at all). Every
 * other field is optional, and an unanswered field means "unknown", which the eligibility engine never
 * treats as a reason to exclude a scheme. For each field the body can say one of three things:
 *   - leave it out (undefined)       -> the saved value is left alone,
 *   - send blank ("", null, spaces)  -> the saved value is cleared back to unknown (stored as null),
 *   - send a value                   -> it must be sensible, or the whole request is rejected with 400.
 *
 * The select options mirror the options in src/pages/Profile.tsx; keep the two in step.
 */
export const PROFILE_OPTIONS = {
  gender: ['male', 'female', 'other'],
  education: ['below 10th', '10th', '12th', 'undergraduate', 'graduate', 'post-graduate'],
  occupation: ['farmer', 'student', 'entrepreneur', 'employee', 'senior citizen', 'unemployed', 'other'],
  category: ['general', 'sc', 'st', 'obc'],
  residence: ['rural', 'urban'],
  yesNo: ['yes', 'no'],
} as const;

const MAX_TEXT = 100;
const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 60;

/** "", whitespace-only and null all mean "no answer". Numbers become strings (the form sends strings, other clients may not). */
const normalise = (v: unknown): unknown => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim();
  return v;
};

const optionalValue = <T extends z.ZodType>(schema: T) => z.preprocess(normalise, schema.nullable().optional());

const oneOf = (label: string, options: readonly [string, ...string[]]) =>
  optionalValue(
    z.preprocess(
      (v) => (typeof v === 'string' ? v.toLowerCase() : v),
      z.enum(options, { error: `${label} must be one of: ${options.join(', ')}` }),
    ),
  );

const text = (label: string) => optionalValue(z.string().max(MAX_TEXT, `${label} must be ${MAX_TEXT} characters or fewer`));

const isRealPastDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  return d.getUTCFullYear() >= 1900 && d.getTime() <= Date.now();
};

const tags = z
  .preprocess(
    (v) => (Array.isArray(v) ? v : v === undefined ? undefined : v === null ? [] : v),
    z
      .array(z.string())
      .transform((arr) => [...new Set(arr.map((t) => t.trim()).filter(Boolean))])
      .refine((arr) => arr.length <= MAX_TAGS, `At most ${MAX_TAGS} interests`)
      .refine((arr) => arr.every((t) => t.length <= MAX_TAG_LENGTH), `Each interest must be ${MAX_TAG_LENGTH} characters or fewer`)
      .optional(),
  )
  .optional();

export const profileUpdateSchema = z.object({
  // Required to be real when sent (it is the account's display name). Left out = untouched. Never cleared.
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(MAX_TEXT, `Name must be ${MAX_TEXT} characters or fewer`).optional(),

  age: optionalValue(
    z
      .string()
      .regex(/^\d{1,3}$/, 'Age must be a whole number')
      .refine((s) => Number(s) >= 1 && Number(s) <= 120, 'Age must be between 1 and 120'),
  ),
  dob: optionalValue(z.string().refine(isRealPastDate, 'Date of birth must be a real date (YYYY-MM-DD) that is not in the future')),
  gender: oneOf('Gender', PROFILE_OPTIONS.gender),
  occupation: oneOf('Occupation', PROFILE_OPTIONS.occupation),
  education: oneOf('Education', PROFILE_OPTIONS.education),
  // 0 is a real answer; only blank means unknown.
  income: optionalValue(z.string().regex(/^\d{1,12}$/, 'Income must be a whole number of rupees, 0 or more')),
  category: oneOf('Social category', PROFILE_OPTIONS.category),
  // Must be one of the 28 states / 8 union territories (any letter case); saved in the canonical spelling so it
  // matches the authority name of that state's schemes exactly.
  state: optionalValue(
    z
      .string()
      .refine((s) => canonicalState(s) !== null, 'State must be one of the listed states or union territories')
      .transform((s) => canonicalState(s) as string),
  ),
  district: text('District'),
  residence: oneOf('Residence', PROFILE_OPTIONS.residence),
  minority: oneOf('Minority status', PROFILE_OPTIONS.yesNo),
  disability: oneOf('Disability status', PROFILE_OPTIONS.yesNo),
  farmer: oneOf('Farmer status', PROFILE_OPTIONS.yesNo),
  widow: oneOf('Widow status', PROFILE_OPTIONS.yesNo),
  veteran: oneOf('Veteran status', PROFILE_OPTIONS.yesNo),
  land: oneOf('Land ownership', PROFILE_OPTIONS.yesNo),

  interests: tags,
  profileTags: tags,
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/** One message per field, for the 400 response: { age: "Age must be between 1 and 120", ... }. */
export function profileFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'body');
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
