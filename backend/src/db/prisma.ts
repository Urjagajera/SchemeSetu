import { PrismaClient } from '@prisma/client';
import config from '../config/env.js';

// Singleton PrismaClient — avoids the common pitfall of creating multiple
// connections, especially under hot-reload (tsx watch) in development.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
