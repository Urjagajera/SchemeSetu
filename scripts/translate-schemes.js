import { PrismaClient } from '@prisma/client';
import groqClient, { callGroqWithRetry } from './lib/groqClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.resolve(__dirname, 'translation-errors.log');

const prisma = new PrismaClient();

const CONCURRENCY = 3;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function logError(schemeId, lang, errorMsg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] Scheme ID: ${schemeId}, Lang: ${lang}, Error: ${errorMsg}\n`;
  try {
    fs.appendFileSync(logPath, logMsg, 'utf-8');
  } catch (err) {
    console.error('Failed to write to error log:', err.message);
  }
}

async function run() {
  console.log('--- Starting Scheme Translation Pipeline (Option A: Curated Subset) ---');
  console.log(`Concurrency cap: ${CONCURRENCY}`);
  console.log(`Groq Model:      ${GROQ_MODEL}`);
  console.log(`Error log path:  ${logPath}`);

  try {
    // 1. Fetch first 15 target schemes from database (mock-mode subset)
    console.log('Fetching first 15 schemes from database...');
    const schemes = await prisma.scheme.findMany({
      take: 15,
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const totalSchemes = schemes.length;
    console.log(`Targeting ${totalSchemes} schemes for translation.`);

    if (totalSchemes === 0) {
      console.log('No schemes found. Exiting.');
      return;
    }

    // 2. Fetch existing translations in database
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
    console.log(`Found ${existingTranslations.length} existing translation rows in DB.`);

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

    let completedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    if (tasksToProcess > 0) {
      // Worker Function
      const processTask = async (task) => {
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
            temperature: 0.1,
          });

          let content = response.choices[0]?.message?.content || '{}';
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
          console.log(
            `[Progress] ${completedCount + skippedCount} / ${totalTasks} complete | Job ${completedCount}/${tasksToProcess} (${successCount} written, ${failureCount} failed)`
          );
        }
      };

      // Run worker pool
      let taskIndex = 0;
      const workers = [];

      const worker = async () => {
        while (taskIndex < tasks.length) {
          const currentIdx = taskIndex++;
          if (currentIdx >= tasks.length) break;
          await processTask(tasks[currentIdx]);
        }
      };

      for (let i = 0; i < Math.min(CONCURRENCY, tasks.length); i++) {
        workers.push(worker());
      }

      await Promise.all(workers);
    } else {
      console.log('All translations already complete! No work to do.');
    }

    // Dump all translations to JSON file
    console.log('Dumping translations to src/constants/schemeTranslations.json...');
    const allTranslations = await prisma.schemeTranslation.findMany({
      select: {
        schemeId: true,
        languageCode: true,
        translatedName: true,
        translatedDescription: true,
      }
    });

    const translationMap = {};
    for (const t of allTranslations) {
      translationMap[`${t.schemeId}_${t.languageCode}`] = {
        translatedName: t.translatedName,
        translatedDescription: t.translatedDescription
      };
    }

    const outPath = path.resolve(__dirname, '../src/constants/schemeTranslations.json');
    fs.writeFileSync(outPath, JSON.stringify(translationMap, null, 2), 'utf-8');
    console.log(`Successfully wrote ${allTranslations.length} rows to ${outPath}`);

  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
