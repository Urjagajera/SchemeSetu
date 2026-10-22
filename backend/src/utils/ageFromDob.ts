/**
 * Age in whole years for a date of birth (YYYY-MM-DD), counted on India's calendar date, so a birthday turns over at
 * midnight in India whatever time zone the server runs in. Null for a value that is not a usable past date.
 */
export function ageFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  const born = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? '');
  if (!born) return null;
  // en-CA formats as YYYY-MM-DD.
  const today = /^(\d{4})-(\d{2})-(\d{2})$/.exec(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now));
  if (!today) return null;
  const [by, bm, bd] = born.slice(1).map(Number);
  const [ty, tm, td] = today.slice(1).map(Number);
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  return age >= 0 && age <= 150 ? age : null;
}

/** The age to use for a stored profile: from the birthdate when there is one (always current), else the age as saved. */
export function currentAge(row: { age: string | null; dob: string | null }, now: Date = new Date()): string | null {
  const fromDob = ageFromDob(row.dob, now);
  return fromDob === null ? row.age : String(fromDob);
}
