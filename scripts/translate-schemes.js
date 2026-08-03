import { PrismaClient } from '@prisma/client';
import groqClient from './lib/groqClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.resolve(__dirname, 'translation-errors.log');

const prisma = new PrismaClient();

// Configurable Constants
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Helper to write to error log
function logError(schemeId, lang, errorMsg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] Scheme ID: ${schemeId}, Lang: ${lang}, Error: ${errorMsg}\n`;
  try {
    fs.appendFileSync(logPath, logMsg, 'utf-8');
  } catch (err) {
    console.error('Failed to write to error log:', err.message);
  }
}

// Helper to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Groq API client call wrapper with exponential backoff & rate limit handling
async function callGroqWithRetry(params, retries = MAX_RETRIES, delay = BASE_RETRY_DELAY_MS) {
  try {
    return await groqClient.chat.completions.create(params);
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }

    const statusCode = err.status || err.statusCode;
    const isRateLimit = statusCode === 429;
    const isServerError = statusCode >= 500 && statusCode < 600;

    if (isRateLimit || isServerError) {
      let waitTime = delay;

      // Extract retry wait time from headers if available
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
      await sleep(waitTime);
      return callGroqWithRetry(params, retries - 1, delay * 2);
    }

    throw err;
  }
}

async function run() {
  console.log('--- Starting Scheme Translation Pipeline ---');
  console.log(`Concurrency cap: ${CONCURRENCY}`);
  console.log(`Groq Model:      ${GROQ_MODEL}`);
  console.log(`Error log path:  ${logPath}`);

  try {
    // 1. Fetch all schemes from DB
    console.log('Fetching schemes from database...');
    const schemes = await prisma.scheme.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const totalSchemes = schemes.length;
    console.log(`Found ${totalSchemes} schemes in database.`);

    if (totalSchemes === 0) {
      console.log('No schemes to translate. Exiting.');
      return;
    }

    // 2. Fetch existing translations to support idempotency/resumability
    console.log('Checking existing translations in database...');
    const existingTranslations = await prisma.schemeTranslation.findMany({
      select: {
        schemeId: true,
        languageCode: true,
      },
    });

    const existingSet = new Set(
      existingTranslations.map((t) => `${t.schemeId}_${t.languageCode}`)
    );
    console.log(`Found ${existingTranslations.length} existing translation rows.`);

    // 3. Construct list of tasks that need to be processed
    const tasks = [];
    const languages = [
      { code: 'gu', name: 'Gujarati' },
      { code: 'hi', name: 'Hindi' },
    ];

    for (const scheme of schemes) {
      for (const lang of languages) {
        const taskKey = `${scheme.id}_${lang.code}`;
        if (!existingSet.has(taskKey)) {
          tasks.push({
            scheme,
            langCode: lang.code,
            langName: lang.name,
          });
        }
      }
    }

    const totalTasks = totalSchemes * languages.length;
    const skippedCount = existingTranslations.length;
    const tasksToProcess = tasks.length;

    console.log(`Total translation jobs needed: ${totalTasks}`);
    console.log(`Already completed (Skipped):   ${skippedCount}`);
    console.log(`Remaining jobs to run:         ${tasksToProcess}`);

    if (tasksToProcess === 0) {
      console.log('All translations already complete! No work to do.');
      return;
    }

    let completedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    // Worker Function
    const processTask = async (task, taskIdx) => {
      const { scheme, langCode, langName } = task;

      const systemPrompt = `You are a professional translation system for government portal websites.
Translate the provided scheme name (title) and description into the target language.
Use a formal, respectful, and natural register suitable for official government scheme descriptions. Avoid robotic, word-for-word, or overly literal translations. Match the grammatical style of the target language.

You MUST respond with a valid JSON object containing exactly these two keys:
1. "translatedName": the translated scheme title
2. "translatedDescription": the translated scheme description

Do not include any markdown formatting (like \`\`\`json), explanations, introductory text, or other wrapper characters. Respond ONLY with the JSON string.`;

      const userContent = `Target Language: ${langName}
Scheme Name: ${scheme.name}
Scheme Description: ${scheme.description}`;

      try {
        const response = await callGroqWithRetry({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1, // low temperature for consistent translation quality
        });

        let content = response.choices[0]?.message?.content || '{}';
        // Clean markdown code blocks defensively if present
        content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        const parsed = JSON.parse(content);
        const translatedName = parsed.translatedName?.trim();
        const translatedDescription = parsed.translatedDescription?.trim();

        if (!translatedName || !translatedDescription) {
          throw new Error('Parsed translation JSON contains empty fields.');
        }

        // Save immediately to DB to preserve progress
        await prisma.schemeTranslation.create({
          data: {
            schemeId: scheme.id,
            languageCode: langCode,
            translatedName,
            translatedDescription,
          },
        });

        successCount++;
      } catch (err) {
        failureCount++;
        logError(scheme.id, langCode, err.stack || err.message);
      } finally {
        completedCount++;
        const progressCount = completedCount + skippedCount;
        console.log(
          `[Progress] ${progressCount} / ${totalTasks} complete | Job ${completedCount}/${tasksToProcess} (${successCount} written, ${failureCount} failed, ${skippedCount} skipped)`
        );
      }
    };

    // 4. Run worker pool
    let taskIndex = 0;
    const workers = [];

    const worker = async () => {
      while (taskIndex < tasks.length) {
        const currentIdx = taskIndex++;
        if (currentIdx >= tasks.length) break;
        await processTask(tasks[currentIdx], currentIdx);
      }
    };

    // Spawn concurrent workers
    for (let i = 0; i < Math.min(CONCURRENCY, tasks.length); i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    // 5. Final Summary Output
    console.log('\n================ PIPELINE RUN SUMMARY ================');
    console.log(`Total Schemes in Database:   ${totalSchemes}`);
    console.log(`Total Translation Targets:   ${totalTasks}`);
    console.log(`Skipped (Pre-existing):     ${skippedCount}`);
    console.log(`Jobs Attempted:             ${tasksToProcess}`);
    console.log(`Successfully Translated:     ${successCount}`);
    console.log(`Failed Translations:        ${failureCount}`);
    if (failureCount > 0) {
      console.log(`Errors logged to:            ${logPath}`);
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
