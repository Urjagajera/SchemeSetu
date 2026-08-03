import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGroqWithRetry } from './lib/groqClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.resolve(__dirname, '../locales');
const enPath = path.resolve(localesDir, 'en.json');
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const BATCH_SIZE = 15; // Number of keys to translate in a single request

async function translateBatch(keysBatch, sourceJson, langName) {
  const batchObj = {};
  for (const k of keysBatch) {
    batchObj[k] = sourceJson[k];
  }

  const systemPrompt = `You are a professional translation system for government portal websites.
You will be given a JSON object containing English UI strings.
Translate each value into the target language: ${langName}.
Ensure translations are formal, natural, and contextually correct for a web portal (e.g. button labels, badges, alert descriptions).
Maintain the exact same keys in your output JSON.
You MUST respond with a valid JSON object. Do not include markdown formatting (such as \`\`\`json), explanations, or notes.`;

  const userContent = JSON.stringify(batchObj, null, 2);

  try {
    const response = await callGroqWithRetry({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    let content = response.choices[0]?.message?.content || '{}';
    content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to translate batch for ${langName}:`, err.message);
    throw err;
  }
}

async function translateLanguage(langCode, langName) {
  console.log(`\nTranslating UI strings to ${langName} (${langCode})...`);
  const targetPath = path.resolve(localesDir, `${langCode}.json`);

  // Read English source
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  // Read existing target translations if any
  let targetData = {};
  if (fs.existsSync(targetPath)) {
    try {
      targetData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      console.log(`Found existing ${langCode}.json with ${Object.keys(targetData).length} keys.`);
    } catch (e) {
      console.warn(`Could not parse existing ${langCode}.json:`, e.message);
    }
  }

  // Find missing/empty keys
  const missingKeys = Object.keys(enData).filter(
    key => !targetData[key] || targetData[key].trim() === ''
  );

  if (missingKeys.length === 0) {
    console.log(`All keys for ${langName} are already translated!`);
    return;
  }

  console.log(`Total keys: ${Object.keys(enData).length} | Missing keys: ${missingKeys.length}`);

  // Process in batches
  for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
    const batch = missingKeys.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(missingKeys.length / BATCH_SIZE)} (${batch.length} keys)...`);
    
    try {
      const translatedBatch = await translateBatch(batch, enData, langName);
      
      // Merge translated batch
      for (const k of batch) {
        if (translatedBatch[k]) {
          targetData[k] = translatedBatch[k];
        } else {
          console.warn(`Warning: Key "${k}" was not returned by LLM.`);
          targetData[k] = enData[k]; // Fallback to English
        }
      }

      // Save progress dynamically
      fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf-8');
      console.log(`Saved progress to ${langCode}.json`);

      // Throttle slightly between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Skipping batch due to error. Save state remains preserved.`);
    }
  }

  console.log(`Finished translations for ${langName}. Total keys written: ${Object.keys(targetData).length}`);
}

async function main() {
  if (!fs.existsSync(enPath)) {
    console.error(`English source translations file not found at ${enPath}`);
    process.exit(1);
  }

  try {
    await translateLanguage('hi', 'Hindi');
    await translateLanguage('gu', 'Gujarati');
    console.log('\n--- UI Translations Generation Pipeline Complete ---');
  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  }
}

main();
