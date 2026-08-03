import { PrismaClient } from '@prisma/client';
import groqClient, { callGroqWithRetry } from './lib/groqClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.resolve(__dirname, 'value-translation-errors.log');

const prisma = new PrismaClient();

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function logError(fieldType, originalValue, lang, errorMsg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] Field: ${fieldType}, Value: ${originalValue}, Lang: ${lang}, Error: ${errorMsg}\n`;
  try {
    fs.appendFileSync(logPath, logMsg, 'utf-8');
  } catch (err) {
    console.error('Failed to write to value error log:', err.message);
  }
}

async function run() {
  console.log('--- Starting Value Translation Pipeline (Option A: Curated Subset - Batch requests) ---');
  console.log(`Groq Model:      ${GROQ_MODEL}`);
  console.log(`Error log path:  ${logPath}`);

  try {
    // 1. Gather values used by the first 15 target schemes
    console.log('Gathering values used by target schemes...');
    
    const targetSchemes = await prisma.scheme.findMany({
      take: 15,
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } }
      }
    });

    const targetCategories = new Set();
    const targetAuthorities = new Set();
    const targetTags = new Set();

    for (const s of targetSchemes) {
      if (s.authorityName) targetAuthorities.add(s.authorityName);
      for (const t of s.tags) {
        if (t.tag?.name) targetTags.add(t.tag.name);
      }
      for (const c of s.categories) {
        if (c.category?.name) targetCategories.add(c.category.name);
      }
    }

    const terms = [];
    const addTerm = (fieldType, val) => {
      if (!val || val.trim() === '') return;
      const normalized = val.trim();
      if (!terms.some(t => t.fieldType === fieldType && t.originalValue.toLowerCase() === normalized.toLowerCase())) {
        terms.push({ fieldType, originalValue: normalized });
      }
    };

    for (const val of targetCategories) addTerm('main_category', val);
    for (const val of targetAuthorities) addTerm('authority', val);
    for (const val of targetTags) addTerm('tag', val);
    
    addTerm('gender', 'Male');
    addTerm('gender', 'Female');
    addTerm('gender', 'Other');
    addTerm('level', 'State');
    addTerm('level', 'Central');

    console.log(`Total unique terms gathered: ${terms.length}`);

    // 2. Fetch existing translations in database
    const existingTranslations = await prisma.valueTranslation.findMany({
      select: {
        fieldType: true,
        originalValue: true,
        languageCode: true
      }
    });

    const existingSet = new Set(
      existingTranslations.map(t => `${t.fieldType}_${t.originalValue.toLowerCase()}_${t.languageCode}`)
    );
    console.log(`Found ${existingTranslations.length} existing value translation rows in DB.`);

    // Group missing terms by language
    const guMissing = [];
    const hiMissing = [];

    for (const term of terms) {
      const guKey = `${term.fieldType}_${term.originalValue.toLowerCase()}_gu`;
      if (!existingSet.has(guKey)) {
        guMissing.push({ ...term, langCode: 'gu', langName: 'Gujarati' });
      }
      const hiKey = `${term.fieldType}_${term.originalValue.toLowerCase()}_hi`;
      if (!existingSet.has(hiKey)) {
        hiMissing.push({ ...term, langCode: 'hi', langName: 'Hindi' });
      }
    }

    console.log(`Gujarati missing terms: ${guMissing.length}`);
    console.log(`Hindi missing terms:    ${hiMissing.length}`);

    const systemPrompt = `You are a professional translation system for government portal websites.
Translate the provided array of government-related terms (representing categories, tags, authority names, levels, or genders) into the target language. Keep translations formal, respectful, and brief.
You MUST respond with a valid JSON object containing exactly one key:
"translations": ["translated_term_1", "translated_term_2", ...]
The translated array MUST have the exact same length and order as the input terms.

Do not include any markdown formatting, explanations, or introductory text. Respond ONLY with the JSON string.`;

    // Process Gujarati batch
    if (guMissing.length > 0) {
      console.log(`Batch translating ${guMissing.length} terms into Gujarati via Groq...`);
      const originalTexts = guMissing.map(t => t.originalValue);
      
      try {
        const response = await callGroqWithRetry({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Target Language: Gujarati\nTerms: ${JSON.stringify(originalTexts)}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        });

        let content = response.choices[0]?.message?.content || '{}';
        content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        const parsed = JSON.parse(content);
        const translatedTexts = parsed.translations;

        if (!Array.isArray(translatedTexts) || translatedTexts.length !== originalTexts.length) {
          throw new Error(`Translations length mismatch. Expected ${originalTexts.length}, got ${translatedTexts?.length}`);
        }

        // Insert into database
        for (let i = 0; i < guMissing.length; i++) {
          const term = guMissing[i];
          const transVal = translatedTexts[i]?.trim();
          if (!transVal) throw new Error(`Empty translation at index ${i}`);
          
          await prisma.valueTranslation.create({
            data: {
              fieldType: term.fieldType,
              originalValue: term.originalValue,
              languageCode: term.langCode,
              translatedValue: transVal
            }
          });
        }
        console.log(`Successfully seeded ${guMissing.length} Gujarati terms.`);
      } catch (err) {
        console.error('Error translating Gujarati batch:', err.message);
        logError('BATCH', 'gu', 'gu', err.stack || err.message);
      }
    }

    // Process Hindi batch
    if (hiMissing.length > 0) {
      console.log(`Batch translating ${hiMissing.length} terms into Hindi via Groq...`);
      const originalTexts = hiMissing.map(t => t.originalValue);
      
      try {
        const response = await callGroqWithRetry({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Target Language: Hindi\nTerms: ${JSON.stringify(originalTexts)}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        });

        let content = response.choices[0]?.message?.content || '{}';
        content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        const parsed = JSON.parse(content);
        const translatedTexts = parsed.translations;

        if (!Array.isArray(translatedTexts) || translatedTexts.length !== originalTexts.length) {
          throw new Error(`Translations length mismatch. Expected ${originalTexts.length}, got ${translatedTexts?.length}`);
        }

        // Insert into database
        for (let i = 0; i < hiMissing.length; i++) {
          const term = hiMissing[i];
          const transVal = translatedTexts[i]?.trim();
          if (!transVal) throw new Error(`Empty translation at index ${i}`);
          
          await prisma.valueTranslation.create({
            data: {
              fieldType: term.fieldType,
              originalValue: term.originalValue,
              languageCode: term.langCode,
              translatedValue: transVal
            }
          });
        }
        console.log(`Successfully seeded ${hiMissing.length} Hindi terms.`);
      } catch (err) {
        console.error('Error translating Hindi batch:', err.message);
        logError('BATCH', 'hi', 'hi', err.stack || err.message);
      }
    }

    // 3. Dump all ValueTranslations to JSON file
    console.log('Dumping translations to src/constants/valueTranslations.json...');
    const allValTranslations = await prisma.valueTranslation.findMany({
      select: {
        fieldType: true,
        originalValue: true,
        languageCode: true,
        translatedValue: true
      }
    });

    const valTranslationMap = {};
    for (const t of allValTranslations) {
      valTranslationMap[`${t.fieldType}_${t.originalValue.toLowerCase()}_${t.languageCode}`] = t.translatedValue;
    }

    const outPath = path.resolve(__dirname, '../src/constants/valueTranslations.json');
    fs.writeFileSync(outPath, JSON.stringify(valTranslationMap, null, 2), 'utf-8');
    console.log(`Successfully wrote ${allValTranslations.length} rows to ${outPath}`);

  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
