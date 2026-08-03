import { PrismaClient, SchemeLevel } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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

const WOMAN_KEYWORDS = ['woman', 'women', 'widow', 'remarried', 'widow', 'ladies', 'lady'];

function getEnrichedDetailsForSeeding(
  name: string,
  description: string,
  levelStr: string,
  authName: string,
  tags: string[],
  cat: string
) {
  const isState = levelStr === 'STATE' || levelStr === 'State' || authName?.toLowerCase() === 'gujarat';

  // Generate eligibility
  const eligibility: string[] = [];
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

  // Generate documents list
  const documents: string[] = ['Aadhaar Card', 'Passport Size Photograph'];
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

  return {
    eligibility,
    documents
  };
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

function buildDeterministicSlug(authorityName: string, schemeName: string): string {
  const authSlug = slugify(authorityName || 'general');
  const nameSlug = slugify(schemeName);
  return `${authSlug}-${nameSlug}`;
}

async function main() {
  console.log('Starting Scheme Database Seeding...');
  
  // Note: Whenever data is re-seeded, translate-schemes.js and translate-values.js must be re-run,
  // and their output JSON files regenerated for the mock data client.
  console.log('NOTICE: Translation files must be regenerated after seeding finishes.');

  const csvPath = path.resolve(__dirname, '../dataset/schemesetu_cleaned_dataset.csv');
  console.log('Reading CSV from:', csvPath);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log(`Parsed ${records.length} records from CSV.`);

  // Clear existing scheme relations & schemes
  console.log('Clearing existing scheme-related data...');
  await prisma.schemeCategory.deleteMany();
  await prisma.schemeTag.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();

  // Create standard categories
  console.log('Initializing standard categories: Student, Farmer, Woman...');
  const categoriesMap: Record<string, any> = {};
  for (const catName of ['Student', 'Farmer', 'Woman']) {
    categoriesMap[catName] = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName }
    });
  }

  // 1. Pre-extract and seed all unique tags to avoid concurrent upsert race conditions
  console.log('Extracting all unique tags from CSV...');
  const allTagNames = new Set<string>();
  for (const record of records) {
    for (let i = 1; i <= 15; i++) {
      const tagVal = record[`raw_tag_${i}`];
      if (tagVal && tagVal.trim() !== '') {
        allTagNames.add(tagVal.trim());
      }
    }
  }

  console.log(`Pre-seeding ${allTagNames.size} unique tags to Supabase...`);
  const uniqueTagsMap = new Map<string, string>(); // name -> id
  const tagsArray = Array.from(allTagNames);
  
  // Format tags data with generated unique IDs for batch creation
  const tagsData = tagsArray.map((name, idx) => ({
    id: `tag-${idx}-${Math.random().toString(36).substring(7)}`,
    name
  }));

  // Batch insert tags
  await prisma.tag.createMany({
    data: tagsData,
    skipDuplicates: true
  });

  console.log('Fetching seeded tags to populate in-memory map...');
  const dbTags = await prisma.tag.findMany();
  for (const tag of dbTags) {
    uniqueTagsMap.set(tag.name.toLowerCase(), tag.id);
  }
  console.log(`Successfully mapped ${uniqueTagsMap.size} tags.`);

  // 2. Map schemes and relation data in memory
  console.log('Mapping schemes and relations in memory...');
  const schemesData: any[] = [];
  const schemeTagData: any[] = [];
  const schemeCategoryData: any[] = [];

  const generatedSlugs = new Set<string>();
  let zeroCategoriesCount = 0;
  let oneCategoryCount = 0;
  let multipleCategoriesCount = 0;

  for (const record of records) {
    const name = record['scheme_name'];
    const sourceUrl = record['link'];
    const authorityName = record['authority'];
    const description = record['description'];
    const mainCategory = record['main_category']?.toLowerCase() || '';

    if (!sourceUrl || !name) continue;

    // Set Level
    const level = authorityName === 'Gujarat' ? SchemeLevel.STATE : SchemeLevel.CENTRAL;

    // Handle Tags (raw_tag_1 through raw_tag_15)
    const tagsList: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const tagVal = record[`raw_tag_${i}`];
      if (tagVal && tagVal.trim() !== '') {
        tagsList.push(tagVal.trim());
      }
    }

    // Determine category mapping (case-insensitive)
    const schemeCategories: string[] = [];
    const lowerTags = tagsList.map(t => t.toLowerCase());

    const isStudent = lowerTags.some(t => STUDENT_KEYWORDS.includes(t));
    if (isStudent || mainCategory === 'education') schemeCategories.push('Student');

    const isFarmer = lowerTags.some(t => FARMER_KEYWORDS.includes(t));
    if (isFarmer || mainCategory === 'agriculture') schemeCategories.push('Farmer');

    const isWoman = lowerTags.some(t => WOMAN_KEYWORDS.includes(t)) ||
      name.toLowerCase().includes('women') ||
      name.toLowerCase().includes('mahila') ||
      mainCategory === 'women & child development';
    if (isWoman) schemeCategories.push('Woman');

    if (schemeCategories.length === 0) {
      zeroCategoriesCount++;
    } else if (schemeCategories.length === 1) {
      oneCategoryCount++;
    } else {
      multipleCategoriesCount++;
    }

    const category = schemeCategories[0] || 'General';
    const enriched = getEnrichedDetailsForSeeding(name, description, level, authorityName, tagsList, category);

    // Create deterministic slug ID
    const baseSlug = buildDeterministicSlug(authorityName, name);
    let id = baseSlug;
    if (generatedSlugs.has(id)) {
      let index = 2;
      while (generatedSlugs.has(`${baseSlug}-${index}`)) {
        index++;
      }
      id = `${baseSlug}-${index}`;
    }
    generatedSlugs.add(id);

    // Add Scheme insertion payload
    schemesData.push({
      id,
      name,
      sourceUrl,
      description,
      level,
      authorityName,
      eligibility: enriched.eligibility,
      documents: enriched.documents
    });

    // Add Tag links payload
    for (const tagName of tagsList) {
      const tagId = uniqueTagsMap.get(tagName.toLowerCase());
      if (tagId) {
        schemeTagData.push({ schemeId: id, tagId });
      }
    }

    // Add Category links payload
    for (const catName of schemeCategories) {
      const categoryObj = categoriesMap[catName];
      if (categoryObj) {
        schemeCategoryData.push({ schemeId: id, categoryId: categoryObj.id });
      }
    }
  }

  // 3. Perform batch inserts
  console.log(`Inserting ${schemesData.length} schemes into Supabase...`);
  await prisma.scheme.createMany({
    data: schemesData,
    skipDuplicates: true
  });

  console.log(`Inserting ${schemeTagData.length} tag relations in chunks...`);
  // Insert in chunks of 5000 to avoid query parameter size limits
  const CHUNK_SIZE = 5000;
  for (let i = 0; i < schemeTagData.length; i += CHUNK_SIZE) {
    const chunk = schemeTagData.slice(i, i + CHUNK_SIZE);
    await prisma.schemeTag.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`  Seeded tag relations chunk ${Math.min(i + CHUNK_SIZE, schemeTagData.length)} / ${schemeTagData.length}`);
  }

  console.log(`Inserting ${schemeCategoryData.length} category relations...`);
  await prisma.schemeCategory.createMany({
    data: schemeCategoryData,
    skipDuplicates: true
  });

  console.log('Seeding process finished.');
  console.log('================ SUMMARY ================');
  console.log(`Total Schemes Imported / Upserted: ${schemesData.length}`);
  console.log(`Total Unique Tags Upserted: ${uniqueTagsMap.size}`);
  console.log(`Schemes with Zero Categories: ${zeroCategoriesCount}`);
  console.log(`Schemes with One Category: ${oneCategoryCount}`);
  console.log(`Schemes with Multiple Categories: ${multipleCategoriesCount}`);
  console.log('=========================================');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
