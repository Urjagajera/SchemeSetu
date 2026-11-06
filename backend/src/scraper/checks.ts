import { VALID_APPLICATION_MODES } from '../ingestion/csvParser.js';
import type { ScrapedScheme } from './csvRow.js';

/**
 * The safety checks a scraped scheme must pass before it is added. A scheme that fails is not added: it is listed in
 * the run's report with the reason, and the next run tries it again.
 */

/** Text as a reader sees it: invisible characters dropped, runs of spaces/line breaks/tabs as one space, one kind of quote. */
export function sameText(text: string | readonly string[]): string {
  const joined = Array.isArray(text) ? text.filter(Boolean).join('\n') : (text as string);
  return joined
    .normalize('NFKC')
    .replace(/[﻿​‌‍⁠]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const withoutHeading = (text: string, heading: string) => text.replace(new RegExp(`^${heading}\\s*`), '');

/** Why a scraped scheme must not be added (empty when it is complete). */
export function problems(s: ScrapedScheme): string[] {
  const out: string[] = [];
  if (!s.title.trim()) out.push('no title');
  if (!s.ministry.trim()) out.push('no ministry or state');
  if (!withoutHeading(s.details, 'Details').trim()) out.push('no details');
  if (s.eligibility.length === 0) out.push('no eligibility');
  if (!withoutHeading(s.applicationProcess, 'Application Process').trim()) out.push('no application process');
  const unknown = s.mode.split('\n').map((m) => m.trim()).filter((m) => m && !(VALID_APPLICATION_MODES as readonly string[]).includes(m));
  // The import only knows these ways to apply; anything else would be stored as misplaced text.
  if (unknown.length > 0) out.push(`unknown way to apply: ${unknown.join(', ')}`);
  return out;
}

/** Title + ministry, the way two copies of one scheme under different links would match. */
export const titleKey = (title: string, ministry: string) => `${sameText(title).toLowerCase()}|${sameText(ministry).toLowerCase()}`;

/** A field the self-check compares, and how. */
export const SELF_CHECK_FIELDS = ['title', 'ministry', 'details', 'eligibility', 'documents'] as const;

/**
 * Self-check: a scheme already in the CSV, read again, must give the same title, ministry, details, eligibility and
 * documents. If myScheme changed its page layout, this is what fails first, and then the run writes nothing.
 * Returns the fields that differ.
 */
export function selfCheckDiffs(scraped: ScrapedScheme, csv: Pick<ScrapedScheme, (typeof SELF_CHECK_FIELDS)[number]>): string[] {
  return SELF_CHECK_FIELDS.filter((f) => {
    const a = f === 'details' ? withoutHeading(sameText(scraped.details), 'Details') : sameText(scraped[f]);
    const b = f === 'details' ? withoutHeading(sameText(csv.details), 'Details') : sameText(csv[f]);
    return a !== b;
  });
}
