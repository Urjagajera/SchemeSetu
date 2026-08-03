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
        let val = matches[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env.GROQ_API_KEY = val;
      }
    }
  } catch (err) {
    // Fail silently here
  }
}

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey || apiKey.trim() === '') {
  throw new Error(
    'FATAL: GROQ_API_KEY is missing or empty. Please ensure it is defined in the root .env file.'
  );
}

const groq = new Groq({ apiKey });

// Shared helper to call Groq completions with exponential backoff & rate-limit header parsing
export async function callGroqWithRetry(params, retries = 3, delay = 2000) {
  try {
    return await groq.chat.completions.create(params);
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }

    const statusCode = err.status || err.statusCode;
    const isRateLimit = statusCode === 429;
    const isServerError = statusCode >= 500 && statusCode < 600;

    if (isRateLimit || isServerError) {
      let waitTime = delay;

      // Extract wait time from headers if available
      if (err.headers) {
        const retryAfter = err.headers['retry-after'];
        if (retryAfter) {
          waitTime = parseInt(retryAfter, 10) * 1000;
        } else {
          const resetTokens = err.headers['x-ratelimit-reset-tokens'];
          if (resetTokens) {
            const match = resetTokens.match(/([\d.]+)(ms|s|m)/);
            if (match) {
              const val = parseFloat(match[1]);
              const unit = match[2];
              if (unit === 'ms') waitTime = val;
              else if (unit === 's') waitTime = val * 1000;
              else if (unit === 'm') waitTime = val * 60000;
            }
          }
        }
      }

      console.warn(
        `[Groq API Warning] Received status ${statusCode}. Retrying in ${waitTime}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return callGroqWithRetry(params, retries - 1, delay * 2);
    }

    throw err;
  }
}

export default groq;
