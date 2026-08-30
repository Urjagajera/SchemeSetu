import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';

app.listen(config.PORT, () => {
  logger.info(`[Server] Express backend listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});
