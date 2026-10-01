/**
 * Languages the on-demand scheme translation knows about.
 *
 * `enabled` is the switch that decides whether GET /api/schemes/:id?lang=xx triggers translation. Hindi is
 * enabled. Gujarati is defined (so the validators and glossary already cover it) but stays OFF until it has
 * been verified: Hindi goes live first, and Gujarati needs a native-speaker review and a pricing/limits check
 * on the fallback model before it is switched on. Flip `enabled` here to turn a language on.
 */
export type LanguageCode = 'hi' | 'gu';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  /** Unicode block of the language's own script, inclusive. */
  script: readonly [number, number];
  /** Native digit characters 0..9, so "१०,०००" can be compared with "10,000". */
  digits: string;
  enabled: boolean;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  hi: { code: 'hi', name: 'Hindi', script: [0x0900, 0x097f], digits: '०१२३४५६७८९', enabled: true },
  gu: { code: 'gu', name: 'Gujarati', script: [0x0a80, 0x0aff], digits: '૦૧૨૩૪૫૬૭૮૯', enabled: false },
};

/** The language to translate into for a ?lang= value, or null (English, unknown, or not enabled yet). */
export function enabledLanguage(lang: unknown): LanguageConfig | null {
  if (typeof lang !== 'string') return null;
  const cfg = (LANGUAGES as Record<string, LanguageConfig | undefined>)[lang.trim().toLowerCase()];
  return cfg && cfg.enabled ? cfg : null;
}
