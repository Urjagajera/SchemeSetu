import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from project root (two levels up from backend/src/config/env.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  JWT_SECRET: process.env.JWT_SECRET || 'schemesetu_jwt_dev_secret_key_2026',
  ENABLE_DEMO_LOGIN: process.env.ENABLE_DEMO_LOGIN === 'true'
};

export default env;
