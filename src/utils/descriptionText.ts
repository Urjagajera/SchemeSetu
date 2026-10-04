import type { Scheme } from '../types';

/**
 * The source data opens most descriptions with a one-word heading on its own line ("Details", then the text).
 * It adds nothing on a card or at the top of a description, and on a card it eats into the character limit.
 * The Hindi and Gujarati translations of that heading are covered too, since a translated description keeps it.
 */
const HEADINGS = new Set(['details', 'विवरण', 'વિગતો', 'વિગત']);

/**
 * Removes that heading line, at display time only (nothing stored is changed). Only a first line that is
 * nothing but the heading (optionally followed by ":" or "-") is removed, so a sentence that merely starts
 * with the word, such as "Details of the scheme are...", is left alone.
 */
export function stripDetailsHeading(text: string | null | undefined): string {
  if (!text) return '';
  const firstLine = /^\s*([^\r\n]*)(?:\r?\n|$)/.exec(text);
  if (!firstLine) return text;
  const heading = firstLine[1].trim().replace(/[:\-–—]+$/, '').trim().toLowerCase();
  if (!HEADINGS.has(heading)) return text;
  return text.slice(firstLine[0].length).replace(/^\s+/, '');
}

/** The short description a card shows: the scheme's own, or the start of its description, without the heading. */
export function cardDescription(scheme: Pick<Scheme, 'shortDesc' | 'description'>): string {
  const text = scheme.shortDesc || scheme.description?.slice(0, 140) || '';
  return stripDetailsHeading(text);
}
