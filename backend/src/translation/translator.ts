import { Llm, LlmRequest } from './llm.js';
import { LanguageConfig } from './languages.js';
import { glossaryHits } from './glossary.js';
import { validateList, validateText, GlossaryRequirement } from './validate.js';

/**
 * Translates one field at a time and refuses to trust the model:
 *   1. long text is split into chunks, so a single huge string can't be skipped or truncated;
 *   2. every chunk is validated (see validate.ts);
 *   3. a chunk that fails, errors out, or is cut off is retried on the fallback model;
 *   4. if both models fail the field is reported as failed, and the caller keeps showing English.
 * Only the chunk that failed is retried, never the whole field.
 */
export interface TranslatorOptions {
  llm: Llm;
  primaryModel: string;
  fallbackModel: string;
  /** Called for every rejected attempt, with the reasons. Optional. */
  onReject?: (info: { model: string; reasons: string[]; /** Start of the rejected output, to make rejections debuggable. */ output?: string }) => void;
}

export interface FieldResult {
  ok: boolean;
  value?: string | string[];
  /** Model(s) that produced the accepted output, e.g. "openai/gpt-oss-120b" or "openai/gpt-oss-120b+qwen/qwen3.8-27b". */
  model?: string;
  /** Total model calls made for this field. */
  attempts: number;
  error?: string;
}

const MAX_CHUNK_CHARS = 1800;
const MAX_ITEMS_PER_CALL = 25;
const MAX_TOKENS = 8000;

// ───────────── splitting ─────────────

interface Chunk {
  text: string;
  /** What to put between this chunk and the next one when joining. */
  sepAfter: string;
}

/** Splits long text into chunks on line boundaries (and sentence boundaries for one giant line). Joining the chunks gives back the original text. */
export function splitText(text: string, maxChars = MAX_CHUNK_CHARS): Chunk[] {
  if (text.length <= maxChars) return [{ text, sepAfter: '' }];

  // Break every line that is itself too long into sentences first.
  const pieces: Array<{ text: string; sepAfter: string }> = [];
  const lines = text.split('\n');
  lines.forEach((line, li) => {
    const lineSep = li < lines.length - 1 ? '\n' : '';
    if (line.length <= maxChars) {
      pieces.push({ text: line, sepAfter: lineSep });
      return;
    }
    const sentences = line.split(/(?<=[.!?।])\s+/);
    sentences.forEach((s, si) => pieces.push({ text: s, sepAfter: si < sentences.length - 1 ? ' ' : lineSep }));
  });

  // Pack pieces into chunks up to maxChars.
  const chunks: Chunk[] = [];
  let current = '';
  let lastSep = '';
  for (const p of pieces) {
    const candidate = current === '' ? p.text : current + lastSep + p.text;
    if (current !== '' && candidate.length > maxChars) {
      chunks.push({ text: current, sepAfter: lastSep });
      current = p.text;
    } else {
      current = candidate;
    }
    lastSep = p.sepAfter;
  }
  if (current !== '') chunks.push({ text: current, sepAfter: '' });
  return chunks;
}

function groupItems(items: string[]): string[][] {
  const groups: string[][] = [];
  let cur: string[] = [];
  let chars = 0;
  for (const item of items) {
    if (cur.length > 0 && (cur.length >= MAX_ITEMS_PER_CALL || chars + item.length > MAX_CHUNK_CHARS)) {
      groups.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(item);
    chars += item.length;
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

// ───────────── prompts ─────────────

function systemPrompt(lang: LanguageConfig, glossary: GlossaryRequirement[], list: boolean, count?: number, hint?: string): string {
  const lines = [
    'You are a professional translator for an Indian government welfare-scheme portal.',
    `Translate the content the user sends from English into ${lang.name}, in a formal, respectful, natural register suitable for official government information. Avoid word-for-word or robotic phrasing.`,
    '',
    'Rules:',
    '- Keep every number, amount (₹, Rs., lakh, crore), percentage, date, email address and URL exactly as written.',
    '- Keep well-known acronyms (SC, ST, OBC, BPL, PwD, PAN, Aadhaar, KYC, NGO, MSME, etc.) and official portal or website names as written.',
    '- Do not add, remove, explain or summarise anything.',
    `- You must translate ALL of it into ${lang.name}. Never return the English unchanged, however long the content is.`,
    `- Translate procedural words like "Application Process", "Offline", "Online", "STEP 1", "STEP 2", "Step", "Note:" into ${lang.name} (for example in Gujarati: "અરજી પ્રક્રિયા", "ઓનલાઇન", "ઓફલાઇન", "પગલું 1", "નોંધ:"). Do not leave English steps or headings untranslated.`,
  ];
  if (hint) lines.push(`- ${hint}`);
  if (glossary.length > 0) {
    lines.push('- Use exactly these renderings for these names:');
    for (const g of glossary) lines.push(`    "${g.en}" -> "${g.target}"`);
  }
  if (list) {
    lines.push(
      `- The user sends a JSON array of exactly ${count} strings. Return ONLY a JSON object {"items": [...]} containing exactly ${count} translated strings, in the same order, one for each input string.`,
    );
  } else {
    lines.push('- Preserve line breaks, bullet markers and numbering exactly.', '- Return ONLY the translation: no preface, no quotes, no markdown fences.');
  }
  return lines.join('\n');
}

function parseItems(text: string): unknown {
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) return (parsed as { items: unknown }).items;
    return undefined;
  } catch {
    return undefined;
  }
}

// ───────────── the translator ─────────────

export function createTranslator(opts: TranslatorOptions) {
  function getChain(lang?: LanguageConfig): Array<{ model: string; effort?: 'low' | 'medium' }> {
    // For Gujarati, Qwen (fallbackModel) is calibrated to produce 100% natural Gujarati script,
    // whereas gpt-oss-120b frequently skips procedural steps and returns English unchanged.
    if (lang?.code === 'gu' && opts.fallbackModel && opts.fallbackModel !== opts.primaryModel) {
      return [{ model: opts.fallbackModel }, { model: opts.primaryModel, effort: 'low' }];
    }
    const chain: Array<{ model: string; effort?: 'low' | 'medium' }> = [{ model: opts.primaryModel, effort: 'low' }];
    if (opts.fallbackModel && opts.fallbackModel !== opts.primaryModel) chain.push({ model: opts.fallbackModel });
    return chain;
  }

  interface Attempt<T> {
    ok: boolean;
    value?: T;
    model?: string;
    calls: number;
    reasons: string[];
  }

  /** Runs the model chain for one chunk/group until one attempt passes validation. */
  async function runChain<T>(
    buildRequest: (step: { model: string; effort?: 'low' | 'medium' }) => LlmRequest,
    check: (text: string) => { ok: boolean; value?: T; reasons: string[] },
    lang?: LanguageConfig,
  ): Promise<Attempt<T>> {
    const reasons: string[] = [];
    let calls = 0;
    const chain = getChain(lang);
    for (const step of chain) {
      calls++;
      try {
        const resp = await opts.llm(buildRequest(step));
        if (resp.finishReason !== 'stop') {
          const why = [`finish reason "${resp.finishReason}" (output cut off)`];
          reasons.push(`${step.model}: ${why[0]}`);
          opts.onReject?.({ model: step.model, reasons: why, output: resp.text.slice(0, 300) });
          continue;
        }
        const result = check(resp.text);
        if (result.ok) return { ok: true, value: result.value, model: step.model, calls, reasons };
        reasons.push(`${step.model}: ${result.reasons.join('; ')}`);
        opts.onReject?.({ model: step.model, reasons: result.reasons, output: resp.text.slice(0, 300) });
      } catch (e) {
        const msg = `request failed (${(e as { status?: number }).status ?? ''} ${String((e as Error).message).slice(0, 120)})`;
        reasons.push(`${step.model}: ${msg}`);
        opts.onReject?.({ model: step.model, reasons: [msg] });
      }
    }
    return { ok: false, calls, reasons };
  }

  async function translateText(source: string, lang: LanguageConfig): Promise<FieldResult> {
    const chunks = splitText(source);
    let attempts = 0;
    const models = new Set<string>();
    const outs: string[] = [];

    for (const chunk of chunks) {
      const glossary = glossaryHits([chunk.text], lang.code);
      const system = systemPrompt(lang, glossary, false);
      const r = await runChain<string>(
        (step) => ({ model: step.model, effort: step.effort, system, user: chunk.text, json: false, maxTokens: MAX_TOKENS }),
        (text) => {
          const v = validateText(chunk.text, text, lang, glossary);
          return { ok: v.ok, value: text, reasons: v.reasons };
        },
        lang,
      );
      attempts += r.calls;
      if (!r.ok) return { ok: false, attempts, error: r.reasons.join(' | ') };
      models.add(r.model!);
      outs.push(r.value!);
    }

    let joined = '';
    chunks.forEach((c, i) => (joined += outs[i] + (i < chunks.length - 1 ? c.sepAfter : '')));

    // One last look at the whole field when it was translated in pieces.
    if (chunks.length > 1) {
      const whole = validateText(source, joined, lang, glossaryHits([source], lang.code));
      if (!whole.ok) return { ok: false, attempts, error: `assembled translation rejected: ${whole.reasons.join('; ')}` };
    }
    return { ok: true, value: joined, model: [...models].join('+'), attempts };
  }

  /** `hint` is one extra instruction about what the items are, e.g. "these are ministry names". */
  async function translateList(items: string[], lang: LanguageConfig, hint?: string): Promise<FieldResult> {
    let attempts = 0;
    const models = new Set<string>();
    const outs: string[] = [];

    for (const group of groupItems(items)) {
      const glossary = glossaryHits(group, lang.code);
      const system = systemPrompt(lang, glossary, true, group.length, hint);
      const r = await runChain<string[]>(
        (step) => ({ model: step.model, effort: step.effort, system, user: JSON.stringify(group), json: true, maxTokens: MAX_TOKENS }),
        (text) => {
          const parsed = parseItems(text);
          if (parsed === undefined) return { ok: false, reasons: ['output is not the requested JSON'] };
          const v = validateList(group, parsed, lang, glossary);
          return { ok: v.ok, value: parsed as string[], reasons: v.reasons };
        },
        lang,
      );
      attempts += r.calls;
      if (!r.ok) return { ok: false, attempts, error: r.reasons.join(' | ') };
      models.add(r.model!);
      outs.push(...r.value!);
    }
    return { ok: true, value: outs, model: [...models].join('+'), attempts };
  }

  return {
    translateText,
    translateList,
  };
}

export type Translator = ReturnType<typeof createTranslator>;
