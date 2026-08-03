import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fallback to read .env file manually if process.env.GROQ_API_KEY is not already set
if (!process.env.GROQ_API_KEY) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const matches = envContent.match(/^GROQ_API_KEY\s*=\s*(.+)$/m);
      if (matches && matches[1]) {
        // Strip quotes if any
        let val = matches[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env.GROQ_API_KEY = val;
      }
    }
  } catch (err) {
    // Fail silently here; validation below will throw a clear error if key remains missing
  }
}

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey || apiKey.trim() === '') {
  throw new Error(
    'FATAL: GROQ_API_KEY is missing or empty. Please ensure it is defined in the root .env file.'
  );
}

const groq = new Groq({ apiKey });

export default groq;
