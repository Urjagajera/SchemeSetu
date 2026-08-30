import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (two levels up from src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ────────────────────────────────────────────────────────────
// Fail-fast validation: these vars MUST be present at startup.
// App will NOT silently run with undefined config.
// ────────────────────────────────────────────────────────────
const REQUIRED_VARS = ['PORT', 'DATABASE_URL', 'NODE_ENV'] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`[Config] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────
// Typed config — nothing else in the app reads process.env
// ────────────────────────────────────────────────────────────
export const config = {
  PORT: parseInt(process.env.PORT as string, 10),
  DATABASE_URL: process.env.DATABASE_URL as string,
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
} as const;

export default config;
