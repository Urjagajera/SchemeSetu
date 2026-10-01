import prisma from '../db/prisma.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { createGroqLlm } from './llm.js';
import { createTranslator } from './translator.js';
import { createTranslationService } from './service.js';

/**
 * The app-wide translation service. Without GROQ_API_KEY the translator is null, so the API keeps working
 * and reports translation as "unavailable" (cached translations, if any, are still served).
 */
const translator = config.GROQ_API_KEY
  ? createTranslator({
      llm: createGroqLlm(config.GROQ_API_KEY),
      primaryModel: config.TRANSLATION_PRIMARY_MODEL,
      fallbackModel: config.TRANSLATION_FALLBACK_MODEL,
      onReject: ({ model, reasons }) => logger.warn({ model, reasons }, '[translation] attempt rejected by validation'),
    })
  : null;

if (!translator) logger.info('[translation] GROQ_API_KEY is not set: scheme translation is disabled (English only)');

export const translationService = createTranslationService({
  db: prisma as never,
  translator,
  log: (message, meta) => logger.info(meta ?? {}, `[translation] ${message}`),
});
