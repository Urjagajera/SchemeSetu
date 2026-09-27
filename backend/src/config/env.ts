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
const REQUIRED_VARS = ['PORT', 'DATABASE_URL', 'NODE_ENV', 'SESSION_SECRET'] as const;

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
  SESSION_SECRET: process.env.SESSION_SECRET as string,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  // DEV-ONLY: remove before production — demo login bypass.
  // Optional on purpose (not in REQUIRED_VARS): must be explicitly set to the
  // literal string "true" for POST /api/auth/demo-login to do anything. This is
  // the second, independent gate on top of NODE_ENV !== 'production' — the route
  // 404s unless BOTH hold, so demo login stays dead even in an environment where
  // NODE_ENV happens to be "development" but nobody actually opted into it.
  ENABLE_DEMO_LOGIN: process.env.ENABLE_DEMO_LOGIN === 'true',
} as const;

export default config;
