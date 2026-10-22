/**
 * Age in whole years for a date of birth (YYYY-MM-DD) on today's date here. Null for anything that is not a usable
 * past date. The server works the age out the same way (backend/src/utils/ageFromDob.ts) whenever it sends a profile.
 */
export function ageFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  const born = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? '');
  if (!born) return null;
  const [by, bm, bd] = born.slice(1).map(Number);
  const [ty, tm, td] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  return age >= 0 && age <= 150 ? age : null;
}
