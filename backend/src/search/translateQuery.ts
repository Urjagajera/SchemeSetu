import type { Llm } from '../translation/llm.js';

/**
 * Hindi and Gujarati searches (typed, or spoken through voice search) turned into English search words, because
 * the scheme data is in English. Groq does it with the same small model SetuAI uses; an answer is remembered, so
 * the same search never spends the free allowance twice. When Groq can't answer (no key, busy, offline), the
 * result is null and the search goes ahead with the words as they were written.
 */

/** Devanagari (Hindi) or Gujarati letters anywhere in the text. */
export const needsTranslation = (text: string) => /[ऀ-ॿ઀-૿]/.test(text);

const SYSTEM = `You turn a search typed or spoken on SchemeSetu, a website listing Indian government welfare schemes, into English search words.
The search may be in Hindi, Gujarati, English or a mix, and may be a whole spoken sentence.
Write well-known short names out in full as well, the way official titles spell them (PM-KISAN: "Pradhan Mantri Kisan Samman Nidhi"; PMAY: "Pradhan Mantri Awas Yojana").
Keep the name of an Indian state if one is mentioned, in English (ગુજરાત: "Gujarat").
Reply with JSON only: {"keywords": ["..."]}: 1 to 8 English words or names that would appear in a scheme's title, tags or description. No generic words like "scheme" or "government".`;

const MAX_REMEMBERED = 500;
const MAX_KEYWORDS = 8;

export type QueryTranslator = (text: string) => Promise<string[] | null>;

export function createQueryTranslator(llm: Llm | null, model: string): QueryTranslator {
  const remembered = new Map<string, string[]>();

  return async (text) => {
    const key = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const known = remembered.get(key);
    if (known) {
      // Most recently used goes to the back, so the oldest unused search is the one forgotten first.
      remembered.delete(key);
      remembered.set(key, known);
      return known;
    }
    if (!llm) return null;

    try {
      const res = await llm({ model, system: SYSTEM, user: key, json: true, maxTokens: 800, effort: 'low' });
      if (res.finishReason === 'length') return null;
      const parsed = JSON.parse(res.text) as { keywords?: unknown };
      const words = Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((k): k is string => typeof k === 'string' && k.trim() !== '').map((k) => k.trim()).slice(0, MAX_KEYWORDS)
        : [];
      if (words.length === 0) return null;
      remembered.set(key, words);
      if (remembered.size > MAX_REMEMBERED) remembered.delete(remembered.keys().next().value as string);
      return words;
    } catch {
      return null; // not remembered: the next try may reach Groq
    }
  };
}
