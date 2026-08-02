import { PrismaClient, SchemeLevel } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../myscheme.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../src/constants/schemesData.ts');
const CACHE_PATH = path.resolve(__dirname, 'scraped-cache.json');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const STUDENT_KEYWORDS = [
  'student', 'students', 'scholarship', 'education', 'fellowship', 'fellow',
  'research', 'higher education', 'phd', 'internship', 'stipend', 'school',
  'skill development', 'science', 'scientist'
];

const FARMER_KEYWORDS = [
  'agriculture', 'farmer', 'farming', 'animal husbandry', 'fishermen',
  'fish farming', 'fish production', 'fish sellers', 'fish', 'poultry farming',
  'biofloc', 'recirculating aquaculture system'
];

const WOMAN_KEYWORDS = ['woman', 'women'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Parse criteria & documents from HTML page using regex
function parseDetailsFromHtml(html) {
  const eligibility = [];
  const documents = [];

  // Try to find the Eligibility section block:
  const eligibilitySectionMatch = html.match(/(?:Eligibility Criteria|Eligibility)([\s\S]*?)(?:Documents Required|Exclusions|Benefits|Application Process|FAQ|<\/section>|<h2>|<h3>|<h4>)/i);
  if (eligibilitySectionMatch) {
    const listMatches = eligibilitySectionMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const match of listMatches) {
      const cleanText = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (cleanText && cleanText.length > 5 && !eligibility.includes(cleanText)) {
        eligibility.push(cleanText);
      }
    }
  }

  // Try to find the Documents section block:
  const documentsSectionMatch = html.match(/(?:Documents Required|Documents)([\s\S]*?)(?:Exclusions|Benefits|Eligibility|Application Process|FAQ|<\/section>|<h2>|<h3>|<h4>)/i);
  if (documentsSectionMatch) {
    const listMatches = documentsSectionMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const match of listMatches) {
      const cleanText = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (cleanText && cleanText.length > 3 && !documents.includes(cleanText)) {
        documents.push(cleanText);
      }
    }
  }

  return { eligibility, documents };
}

async function scrapeScheme(url) {
  if (!url || !url.startsWith('http')) {
    return null;
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const response = await axios.get(url, {
        headers: {
          'User-Agent': agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/'
        },
        timeout: 8000
      });

      const html = response.data;
      const parsed = parseDetailsFromHtml(html);
      return parsed;
    } catch (err) {
      console.warn(`[Retry ${4 - retries}] Error fetching ${url}: ${err.message}`);
      retries--;
      await sleep(1500);
    }
  }
  return null;
}

// Generate fallback details
function getFallbackEnrichedDetails(name, description, levelStr, authName, tags, cat) {
  const isState = levelStr === 'STATE' || levelStr === 'State' || authName?.toLowerCase() === 'gujarat';

  const eligibility = [];
  if (isState) {
    eligibility.push('Must be a permanent resident of Gujarat state.');
  } else {
    eligibility.push('Must be a citizen of India.');
  }

  const categoryLower = cat.toLowerCase();
  const tagsLower = tags.map(t => t.toLowerCase());

  if (categoryLower === 'student' || tagsLower.includes('student') || tagsLower.includes('students')) {
    eligibility.push('Must be currently enrolled in a recognized educational institution.');
    eligibility.push('Must maintain minimum attendance or pass percentage as prescribed by the institution.');
  } else if (categoryLower === 'farmer' || tagsLower.includes('farmer') || tagsLower.includes('farmers') || tagsLower.includes('agriculture')) {
    eligibility.push('Must be an active farmer (landowner, tenant, or agricultural laborer).');
    eligibility.push('Must hold a valid farmer identity card or land records.');
  } else if (categoryLower === 'woman' || categoryLower === 'women & child' || tagsLower.includes('woman') || tagsLower.includes('women')) {
    eligibility.push('Applicable exclusively for female candidates/households.');
  }

  if (tagsLower.includes('disability') || tagsLower.includes('pwd') || tagsLower.includes('disabled')) {
    eligibility.push('Must possess a disability certificate with 40% or more disability.');
  }

  eligibility.push('Family annual income must be within the threshold limits (e.g., up to ₹2.5 Lakhs or as applicable).');

  const documents = ['Aadhaar Card', 'Passport Size Photograph'];
  if (isState) {
    documents.push('Gujarat Domicile / Residence Proof');
  } else {
    documents.push('Identity & Address Proof');
  }
  documents.push('Income Certificate');

  if (categoryLower === 'student' || tagsLower.includes('student') || tagsLower.includes('students')) {
    documents.push('School/College ID Card');
    documents.push('Previous Year Marksheet / Progress Report');
    documents.push('Fee Receipt of current academic year');
  } else if (categoryLower === 'farmer' || tagsLower.includes('farmer') || tagsLower.includes('farmers') || tagsLower.includes('agriculture')) {
    documents.push('Land Ownership Documents (7/12 extract)');
    documents.push('Farmer Identity Card');
  }

  if (tagsLower.includes('disability') || tagsLower.includes('pwd') || tagsLower.includes('disabled')) {
    documents.push('Disability Certificate (UDID Card)');
  }
  documents.push('Active Bank Account Passbook (linked with Aadhaar)');

  return { eligibility, documents };
}

async function run() {
  console.log('Reading CSV from:', CSV_PATH);
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      console.log(`Loaded cache with ${Object.keys(cache).length} entries.`);
    } catch (e) {
      console.log('Failed to load cache. Initializing empty.');
    }
  }

  // Scrape a few schemes to test (first 5 that aren't in cache yet)
  const uncachedRecords = records.filter(r => !cache[r['block href']]).slice(0, 5);
  console.log(`Found ${uncachedRecords.length} uncached schemes to scrape.`);

  let updatedCount = 0;
  for (const record of uncachedRecords) {
    const url = record['block href'];
    const title = record['block'];
    if (!url) continue;

    console.log(`\nScraping: "${title}"...`);
    const details = await scrapeScheme(url);

    if (details && (details.eligibility.length > 0 || details.documents.length > 0)) {
      console.log(`-> Extracted eligibility: ${details.eligibility.length} items`);
      console.log(`-> Extracted documents: ${details.documents.length} items`);
      
      cache[url] = details;
      updatedCount++;

      // Update Postgres Database if running
      try {
        await prisma.scheme.update({
          where: { sourceUrl: url },
          data: {
            eligibility: details.eligibility,
            documents: details.documents
          }
        });
        console.log('-> Updated PostgreSQL database successfully!');
      } catch (dbErr) {
        // Silent catch for DB offline
      }
    } else {
      console.log('-> No live criteria/documents parsed (will use fallback rules).');
    }
    await sleep(2000);
  }

  // Save cache back
  if (updatedCount > 0) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`Saved ${updatedCount} new entries to cache.`);
  }

  // Compile CSV + Cache to schemesData.ts
  console.log('\nCompiling CSV and cache to src/constants/schemesData.ts...');
  const schemes = [];
  const uniqueUrls = new Set();

  for (const record of records) {
    const sourceUrl = record['block href'];
    const name = record['block'];
    const authorityName = record['mt-3'];
    const description = record['mt-3 2'];

    if (!sourceUrl || !name) continue;
    if (uniqueUrls.has(sourceUrl)) continue;
    uniqueUrls.add(sourceUrl);

    // Extract tags
    const tags = [];
    for (let i = 1; i <= 7; i++) {
      const colKey = i === 1 ? 'bg-transparent' : `bg-transparent ${i}`;
      const tagVal = record[colKey];
      if (tagVal && tagVal.trim() !== '') {
        tags.push(tagVal.trim());
      }
    }

    const schemeCategories = [];
    const lowerTags = tags.map(t => t.toLowerCase());

    const isStudent = lowerTags.some(t => STUDENT_KEYWORDS.includes(t));
    if (isStudent) schemeCategories.push('Student');

    const isFarmer = lowerTags.some(t => FARMER_KEYWORDS.includes(t));
    if (isFarmer) schemeCategories.push('Farmer');

    const isWoman = lowerTags.some(t => WOMAN_KEYWORDS.includes(t)) || 
                    name.toLowerCase().includes('women') || 
                    name.toLowerCase().includes('mahila');
    if (isWoman) schemeCategories.push('Woman');

    const category = schemeCategories[0] || 'General';
    const idSlug = sourceUrl.split('/').pop() || Math.random().toString(36).substring(7);

    // Get details (either from cache or fallback)
    const cachedDetails = cache[sourceUrl];
    let eligibility = [];
    let documents = [];

    if (cachedDetails) {
      eligibility = cachedDetails.eligibility;
      documents = cachedDetails.documents;
    } else {
      const fallback = getFallbackEnrichedDetails(name, description, authorityName === 'Gujarat' ? 'STATE' : 'CENTRAL', authorityName, tags, category);
      eligibility = fallback.eligibility;
      documents = fallback.documents;
    }

    schemes.push({
      id: idSlug,
      name,
      title: name,
      description,
      shortDesc: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
      level: authorityName === 'Gujarat' ? 'STATE' : 'CENTRAL',
      authorityName,
      ministry: authorityName,
      sourceUrl,
      applyUrl: sourceUrl,
      tags,
      categories: schemeCategories,
      category,
      categoryColor: 'zinc-100',
      categoryTextColor: 'zinc-800',
      benefit: 'Refer to official portal',
      deadline: 'Ongoing',
      featured: false,
      totalBeneficiaries: 'N/A',
      disbursed: 'N/A',
      eligibility,
      documents
    });
  }

  const outputContent = `import { Scheme } from '../types';

export const SCHEMES: Scheme[] = ${JSON.stringify(schemes, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, outputContent, 'utf-8');
  console.log(`Compilation Complete. Total Compiled Schemes: ${schemes.length}`);
  
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Fatal Scraper Error:', err);
});
