// src/config/env.ts
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from project root (two levels up from backend/src/config/env.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
  // TEMP-DEMO-AUTH: remove before production
  ENABLE_DEMO_LOGIN: process.env.ENABLE_DEMO_LOGIN === 'true'
};

export default env;
