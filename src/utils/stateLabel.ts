import { Vocabulary } from '../types';

/**
 * How to show a state / union territory name in the chosen language.
 *   1. the translated name from the server's vocabulary (Hindi has all 36),
 *   2. else a translation in the locale files (`state_gujarat`, ...), which Gujarati has for some states,
 *   3. else the English name, as stored.
 * The locale lookup is checked against the key itself because t() answers with the key when it has no entry.
 */
export function stateLabel(name: string, vocab: Vocabulary | null, t: (key: any) => string): string {
  const fromVocabulary = vocab?.names[name.trim()];
  if (fromVocabulary) return fromVocabulary;
  const key = `state_${name.trim().replace(/\s+/g, '_').toLowerCase()}`;
  const fromLocale = t(key);
  return fromLocale && fromLocale !== key ? fromLocale : name;
}
