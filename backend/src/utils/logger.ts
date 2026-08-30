import pino from 'pino';
import config from '../config/env.js';

// pino: fast, JSON-structured logger. In development, pretty-print for
// readability. In production, emit raw JSON for log aggregators.
const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(config.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
