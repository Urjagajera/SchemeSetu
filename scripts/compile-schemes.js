import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../myscheme.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../src/constants/schemesData.ts');

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

function run() {
  console.log('Reading CSV from:', CSV_PATH);
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const schemes = [];
  const uniqueUrls = new Set();
  const allTags = new Set();

  let zeroCategoriesCount = 0;
  let oneCategoryCount = 0;
  let multipleCategoriesCount = 0;

  for (const record of records) {
    const sourceUrl = record['block href'];
    const name = record['block'];
    const authorityName = record['mt-3'];
    const description = record['mt-3 2'];

    if (!sourceUrl || !name) continue;

    // Deduplicate
    if (uniqueUrls.has(sourceUrl)) {
      continue;
    }
    uniqueUrls.add(sourceUrl);

    // Extract tags
    const tags = [];
    for (let i = 1; i <= 7; i++) {
      const colKey = i === 1 ? 'bg-transparent' : `bg-transparent ${i}`;
      const tagVal = record[colKey];
      if (tagVal && tagVal.trim() !== '') {
        const cleanTag = tagVal.trim();
        tags.push(cleanTag);
        allTags.add(cleanTag.toLowerCase());
      }
    }

    // Determine category mapping (case-insensitive)
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

    if (schemeCategories.length === 0) {
      zeroCategoriesCount++;
    } else if (schemeCategories.length === 1) {
      oneCategoryCount++;
    } else {
      multipleCategoriesCount++;
    }

    // Extract ID slug
    const idSlug = sourceUrl.split('/').pop() || Math.random().toString(36).substring(7);

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
      category: schemeCategories[0] || 'General',
      categoryColor: 'zinc-100',
      categoryTextColor: 'zinc-800',
      benefit: 'Refer to official portal',
      deadline: 'Ongoing',
      featured: false,
      totalBeneficiaries: 'N/A',
      disbursed: 'N/A'
    });
  }

  // Generate output content
  const outputContent = `import { Scheme } from '../types';

export const SCHEMES: Scheme[] = ${JSON.stringify(schemes, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, outputContent, 'utf-8');
  
  console.log('--- Seeding/Compilation Complete ---');
  console.log(`Total Schemes Imported: ${schemes.length}`);
  console.log(`Total Unique Tags: ${allTags.size}`);
  console.log(`Zero Categories: ${zeroCategoriesCount}`);
  console.log(`One Category: ${oneCategoryCount}`);
  console.log(`Multiple Categories: ${multipleCategoriesCount}`);
}

run();
