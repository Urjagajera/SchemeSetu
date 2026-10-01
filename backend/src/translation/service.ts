import { Prisma } from '@prisma/client';
import { FIELD_KEYS, FieldKey, SchemeSource, isListField, sourceFor, sourceHash, summarySource } from './fields.js';
import { LanguageCode, LanguageConfig } from './languages.js';
import { FieldResult } from './translator.js';
import { translateTerms } from './vocabularyBuilder.js';

/**
 * Translate on first view, serve from the database after.
 *
 * getForView() never waits for the model. It reads what is already stored, starts a background job for
 * whatever is missing or stale, and returns immediately: the caller shows English for the fields that are
 * not ready yet and asks again a few seconds later. Each field is stored the moment it finishes, so
 * partial results appear as they land.
 *
 * - "ready":       every field that has text is translated and stored.
 * - "pending":     a job is running (or just started) for at least one field.
 * - "partial":     nothing is running, but some fields failed validation on both models; those stay English
 *                  and are retried after `failedRetryAfterMs`, not on every page load.
 * - "unavailable": there is no API key, so nothing can be translated; cached fields are still served.
 */
export type TranslationStatus = 'ready' | 'pending' | 'partial' | 'unavailable';

export interface TranslationView {
  language: LanguageCode;
  status: TranslationStatus;
  fields: Partial<Record<FieldKey, string | string[]>>;
  pendingFields: FieldKey[];
  failedFields: FieldKey[];
}

/** The part of Prisma this service uses (so tests can use an in-memory fake). */
export interface TranslationDb {
  schemeTranslation: {
    findMany(args: { where: { schemeId: string | { in: string[] }; languageCode: string; field?: string | { in: string[] } } }): Promise<StoredRow[]>;
    upsert(args: {
      where: { schemeId_languageCode_field: { schemeId: string; languageCode: string; field: string } };
      create: StoredRowInput;
      update: Omit<StoredRowInput, 'schemeId' | 'languageCode' | 'field'>;
    }): Promise<unknown>;
  };
}

export interface StoredRow {
  schemeId: string;
  field: string;
  status: string;
  value: unknown;
  sourceHash: string;
  updatedAt: Date;
}

interface StoredRowInput {
  schemeId: string;
  languageCode: string;
  field: string;
  status: 'ok' | 'failed';
  value: Prisma.InputJsonValue | typeof Prisma.DbNull;
  sourceHash: string;
  model: string | null;
  attempts: number;
  error: string | null;
}

export interface FieldTranslator {
  translateText(source: string, lang: LanguageConfig): Promise<FieldResult>;
  translateList(source: string[], lang: LanguageConfig, hint?: string): Promise<FieldResult>;
}

/**
 * What a card (search results, related schemes, bookmarks...) needs: the translated title and the translated
 * short summary of each scheme. Same statuses as the detail page, counted over the schemes asked about.
 */
export interface CardText {
  language: LanguageCode;
  status: TranslationStatus;
  /** scheme id -> translated title, for the schemes that have one. */
  titles: Record<string, string>;
  /** scheme id -> translated summary (see summarySource), for the schemes that have one. */
  summaries: Record<string, string>;
  /** Titles + summaries still being translated. */
  pending: number;
  failed: number;
}

export interface CardSource {
  id: string;
  name: string;
  description: string;
}

type CardField = 'title' | 'summary';

const CARD_HINTS: Record<CardField, string> = {
  title:
    "These are the names of Indian government welfare schemes and programmes. Translate the descriptive words, and transliterate proper names (for example 'Pradhan Mantri Awas Yojana') into the target script. Keep acronyms such as PM-KISAN or PMFBY as written.",
  summary:
    'These are one- or two-sentence summaries of Indian government welfare schemes, shown on cards. Translate each one fully and naturally. Keep numbers, amounts and acronyms exactly as written, and keep a trailing "..." if there is one.',
};
// Summaries are long, so fewer go in each model call: a rejected batch is retried item by item.
const CARD_BATCH: Record<CardField, number> = { title: 20, summary: 8 };


export interface ServiceDeps {
  db: TranslationDb;
  /** null when no API key is configured. */
  translator: FieldTranslator | null;
  /** How long a field that failed on both models is left alone before it is tried again. Default 10 minutes. */
  failedRetryAfterMs?: number;
  now?: () => number;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

export function createTranslationService(deps: ServiceDeps) {
  const retryAfter = deps.failedRetryAfterMs ?? 10 * 60 * 1000;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => undefined);
  /** One running job per scheme + language, so two visitors opening the same scheme don't translate it twice. */
  const inFlight = new Map<string, Promise<void>>();

  async function translateOne(scheme: SchemeSource, lang: LanguageConfig, field: FieldKey): Promise<void> {
    const source = sourceFor(scheme, field);
    if (source === null || !deps.translator) return;
    const hash = sourceHash(source);
    let result: FieldResult;
    try {
      result = isListField(field)
        ? await deps.translator.translateList(source as string[], lang)
        : await deps.translator.translateText(source as string, lang);
    } catch (e) {
      result = { ok: false, attempts: 0, error: `unexpected error: ${String((e as Error).message).slice(0, 200)}` };
    }

    const base = { schemeId: scheme.id, languageCode: lang.code, field };
    const ok = result.ok && result.value !== undefined;
    const data = {
      status: (ok ? 'ok' : 'failed') as 'ok' | 'failed',
      value: ok ? (result.value as Prisma.InputJsonValue) : Prisma.DbNull,
      sourceHash: hash,
      model: result.model ?? null,
      attempts: Math.max(result.attempts, 1),
      error: ok ? null : (result.error ?? 'unknown error').slice(0, 1000),
    };
    try {
      await deps.db.schemeTranslation.upsert({
        where: { schemeId_languageCode_field: { schemeId: scheme.id, languageCode: lang.code, field } },
        create: { ...base, ...data },
        update: data,
      });
      log(ok ? 'translation stored' : 'translation failed', { schemeId: scheme.id, lang: lang.code, field, model: result.model, attempts: result.attempts, error: ok ? undefined : result.error });
    } catch (e) {
      log('could not store translation', { schemeId: scheme.id, lang: lang.code, field, error: String((e as Error).message).slice(0, 200) });
    }
  }

  function startJob(scheme: SchemeSource, lang: LanguageConfig, fields: FieldKey[]): void {
    const key = `${scheme.id}:${lang.code}`;
    if (inFlight.has(key)) return;
    const job = Promise.all(fields.map((f) => translateOne(scheme, lang, f)))
      .then(() => undefined)
      .catch((e) => log('translation job crashed', { schemeId: scheme.id, lang: lang.code, error: String((e as Error).message).slice(0, 200) }))
      .finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }

  async function getForView(scheme: SchemeSource, lang: LanguageConfig): Promise<TranslationView> {
    const rows = await deps.db.schemeTranslation.findMany({ where: { schemeId: scheme.id, languageCode: lang.code } });
    const byField = new Map(rows.map((r) => [r.field, r]));

    const fields: TranslationView['fields'] = {};
    const need: FieldKey[] = [];
    const failedFields: FieldKey[] = [];

    for (const field of FIELD_KEYS) {
      const source = sourceFor(scheme, field);
      if (source === null) continue; // nothing to translate for this scheme
      const row = byField.get(field);
      if (row && row.sourceHash === sourceHash(source)) {
        if (row.status === 'ok' && row.value !== null && row.value !== undefined) {
          fields[field] = row.value as string | string[];
          continue;
        }
        if (row.status === 'failed' && now() - row.updatedAt.getTime() < retryAfter) {
          failedFields.push(field);
          continue;
        }
      }
      need.push(field); // missing, stale (English changed) or a failure old enough to try again
    }

    const key = `${scheme.id}:${lang.code}`;
    let status: TranslationStatus;
    if (need.length > 0 && !deps.translator) {
      status = 'unavailable';
    } else if (need.length > 0 || inFlight.has(key)) {
      if (!inFlight.has(key)) startJob(scheme, lang, need);
      status = 'pending';
    } else {
      status = failedFields.length > 0 ? 'partial' : 'ready';
    }

    return { language: lang.code, status, fields, pendingFields: status === 'pending' ? need : [], failedFields };
  }

  const sourceOf = (c: CardSource, field: CardField): string | null => (field === 'title' ? (c.name.trim() ? c.name : null) : summarySource(c.description));

  /** Reads what is stored for a page of cards and works out what is missing. Starts nothing. */
  async function planCards(cards: CardSource[], lang: LanguageConfig) {
    const rows =
      cards.length === 0
        ? []
        : await deps.db.schemeTranslation.findMany({ where: { schemeId: { in: cards.map((c) => c.id) }, languageCode: lang.code, field: { in: ['title', 'summary'] } } });
    const stored = new Map(rows.map((r) => [`${r.schemeId}:${r.field}`, r]));

    const out = { titles: {} as Record<string, string>, summaries: {} as Record<string, string> };
    const need: Record<CardField, Array<{ id: string; source: string }>> = { title: [], summary: [] };
    let pending = 0;
    let failed = 0;

    for (const c of cards) {
      for (const field of ['title', 'summary'] as const) {
        const source = sourceOf(c, field);
        if (source === null) continue;
        const row = stored.get(`${c.id}:${field}`);
        if (row && row.sourceHash === sourceHash(source)) {
          if (row.status === 'ok' && typeof row.value === 'string' && row.value.trim() !== '') {
            (field === 'title' ? out.titles : out.summaries)[c.id] = row.value;
            continue;
          }
          if (row.status === 'failed' && now() - row.updatedAt.getTime() < retryAfter) {
            failed++;
            continue;
          }
        }
        // already being translated: by a card job, or (for the title) by the detail page's job
        if (inFlight.has(`${field}:${c.id}:${lang.code}`) || (field === 'title' && inFlight.has(`${c.id}:${lang.code}`))) {
          pending++;
          continue;
        }
        need[field].push({ id: c.id, source });
      }
    }
    return { ...out, need, pending, failed };
  }

  function startCardJob(field: CardField, items: Array<{ id: string; source: string }>, lang: LanguageConfig): Promise<void> {
    const translator = deps.translator;
    if (!translator || items.length === 0) return Promise.resolve();
    const keys = items.map((i) => `${field}:${i.id}:${lang.code}`);
    const sources = [...new Set(items.map((i) => i.source))];
    const job = (async () => {
      const result = await translateTerms(sources, (batch) => translator.translateList(batch, lang, CARD_HINTS[field]), CARD_BATCH[field]);
      const failures = new Map(result.failed.map((f) => [f.term, f.error]));
      await Promise.all(
        items.map(async (i) => {
          const out = result.translated[i.source];
          const ok = out !== undefined && out !== '';
          const data = {
            status: (ok ? 'ok' : 'failed') as 'ok' | 'failed',
            value: ok ? (out as Prisma.InputJsonValue) : Prisma.DbNull,
            sourceHash: sourceHash(i.source),
            model: result.models[i.source] || null,
            attempts: ok && !result.retried.includes(i.source) ? 1 : 2,
            error: ok ? null : (failures.get(i.source) ?? 'unknown error').slice(0, 1000),
          };
          try {
            await deps.db.schemeTranslation.upsert({
              where: { schemeId_languageCode_field: { schemeId: i.id, languageCode: lang.code, field } },
              create: { schemeId: i.id, languageCode: lang.code, field, ...data },
              update: data,
            });
          } catch (e) {
            log(`could not store ${field}`, { schemeId: i.id, lang: lang.code, error: String((e as Error).message).slice(0, 200) });
          }
        }),
      );
      log(field === 'title' ? 'titles translated' : 'summaries translated', { count: items.length, failed: result.failed.length, lang: lang.code });
    })()
      .catch((e) => log(`${field} job crashed`, { lang: lang.code, error: String((e as Error).message).slice(0, 200) }))
      .finally(() => keys.forEach((k) => inFlight.delete(k)));
    keys.forEach((k) => inFlight.set(k, job));
    return job;
  }

  /**
   * Titles and summaries for a page of cards. Like getForView it never waits for the model: it returns what
   * is already stored, starts one background batch per field for the rest (a model call per ~20 titles or ~8
   * summaries, not one per scheme), and the caller asks again a few seconds later. Something the detail page
   * is already translating is not started a second time.
   */
  async function getCardText(cards: CardSource[], lang: LanguageConfig): Promise<CardText> {
    const plan = await planCards(cards, lang);
    const needed = plan.need.title.length + plan.need.summary.length;
    let status: TranslationStatus;
    let pending = plan.pending;
    if (needed > 0 && !deps.translator) {
      status = 'unavailable';
    } else {
      startCardJob('title', plan.need.title, lang);
      startCardJob('summary', plan.need.summary, lang);
      pending += needed;
      status = pending > 0 ? 'pending' : plan.failed > 0 ? 'partial' : 'ready';
    }
    return { language: lang.code, status, titles: plan.titles, summaries: plan.summaries, pending: status === 'pending' ? pending : 0, failed: plan.failed };
  }

  /** Same work as getCardText, but resolves when everything has been translated and stored (bulk runs). Returns how many were attempted. */
  async function translateCards(cards: CardSource[], lang: LanguageConfig): Promise<number> {
    const plan = await planCards(cards, lang);
    await Promise.all([startCardJob('title', plan.need.title, lang), startCardJob('summary', plan.need.summary, lang)]);
    return plan.need.title.length + plan.need.summary.length;
  }

  return { getForView, getCardText, translateCards, /** Resolves when the running job for a scheme finishes (tests and scripts). */ idle: (schemeId: string, lang: LanguageCode) => inFlight.get(`${schemeId}:${lang}`) ?? Promise.resolve() };
}

export type TranslationService = ReturnType<typeof createTranslationService>;
