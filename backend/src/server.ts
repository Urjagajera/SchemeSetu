import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { schemeVocabulary } from './routes/schemes.js';

app.listen(config.PORT, () => {
  logger.info(`[Server] Express backend listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  // Build the typo-correction word list now, so the first search does not wait for it.
  schemeVocabulary().catch(() => logger.warn('[Server] typo-correction word list could not be built yet; searches work without it'));
});
