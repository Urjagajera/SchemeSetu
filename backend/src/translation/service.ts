import { Prisma } from '@prisma/client';
import { FIELD_KEYS, FieldKey, SchemeSource, isListField, sourceFor, sourceHash } from './fields.js';
import { LanguageCode, LanguageConfig } from './languages.js';
import { FieldResult } from './translator.js';

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
    findMany(args: { where: { schemeId: string; languageCode: string } }): Promise<StoredRow[]>;
    upsert(args: {
      where: { schemeId_languageCode_field: { schemeId: string; languageCode: string; field: string } };
      create: StoredRowInput;
      update: Omit<StoredRowInput, 'schemeId' | 'languageCode' | 'field'>;
    }): Promise<unknown>;
  };
}

export interface StoredRow {
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
  translateList(source: string[], lang: LanguageConfig): Promise<FieldResult>;
}

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

  return { getForView, /** Resolves when the running job for a scheme finishes (tests and scripts). */ idle: (schemeId: string, lang: LanguageCode) => inFlight.get(`${schemeId}:${lang}`) ?? Promise.resolve() };
}

export type TranslationService = ReturnType<typeof createTranslationService>;
