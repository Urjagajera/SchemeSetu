/**
 * Languages the on-demand scheme translation knows about.
 *
 * `enabled` is the switch that decides whether GET /api/schemes/:id?lang=xx triggers translation. Hindi and
 * Gujarati are both on (Gujarati since 2026-11-14, by the owner's decision, shown as machine translated like Hindi;
 * no native-speaker review yet).
 * `useFallbackModel`: whether a translation that fails validation may move on to the fallback model (Qwen). Off for
 * Gujarati: in the audits Qwen got 8.8% of Gujarati lines wrong in meaning against gpt-oss-120b's 3.1%, so Gujarati
 * retries gpt-oss-120b once more instead, and a field that still fails stays English.
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
  useFallbackModel: boolean;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  hi: { code: 'hi', name: 'Hindi', script: [0x0900, 0x097f], digits: '०१२३४५६७८९', enabled: true, useFallbackModel: true },
  gu: { code: 'gu', name: 'Gujarati', script: [0x0a80, 0x0aff], digits: '૦૧૨૩૪૫૬૭૮૯', enabled: true, useFallbackModel: false },
};

/** The language to translate into for a ?lang= value, or null (English, unknown, or not enabled yet). */
export function enabledLanguage(lang: unknown): LanguageConfig | null {
  if (typeof lang !== 'string') return null;
  const cfg = (LANGUAGES as Record<string, LanguageConfig | undefined>)[lang.trim().toLowerCase()];
  return cfg && cfg.enabled ? cfg : null;
}
