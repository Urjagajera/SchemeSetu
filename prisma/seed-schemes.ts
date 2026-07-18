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

const WOMAN_KEYWORDS = ['woman', 'women','widow','remarried','widow'];

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

async function main() {
  console.log('Starting Scheme Database Seeding...');
  
  const csvPath = path.resolve(__dirname, '../myscheme.csv');
  console.log('Reading CSV from:', csvPath);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

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

  let totalImported = 0;
  const uniqueTagsMap = new Map<string, string>(); // name -> id

  let zeroCategoriesCount = 0;
  let oneCategoryCount = 0;
  let multipleCategoriesCount = 0;

  for (const record of records) {
    const sourceUrl = record['block href'];
    const name = record['block'];
    const authorityName = record['mt-3'];
    const description = record['mt-3 2'];

    if (!sourceUrl || !name) continue;

    // Set Level
    const level = authorityName === 'Gujarat' ? SchemeLevel.STATE : SchemeLevel.CENTRAL;

    // Handle Tags (bg-transparent through bg-transparent 6)
    const tagsList: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const colKey = i === 1 ? 'bg-transparent' : `bg-transparent ${i}`;
      const tagVal = record[colKey];
      if (tagVal && tagVal.trim() !== '') {
        tagsList.push(tagVal.trim());
      }
    }

    // Determine category mapping (case-insensitive)
    const schemeCategories: string[] = [];
    const lowerTags = tagsList.map(t => t.toLowerCase());

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

    const category = schemeCategories[0] || 'General';
    const enriched = getEnrichedDetailsForSeeding(name, description, level, authorityName, tagsList, category);

    // Create / Upsert Scheme
    const scheme = await prisma.scheme.upsert({
      where: { sourceUrl },
      update: {
        name,
        description,
        level,
        authorityName,
        eligibility: enriched.eligibility,
        documents: enriched.documents
      },
      create: {
        name,
        sourceUrl,
        description,
        level,
        authorityName,
        eligibility: enriched.eligibility,
        documents: enriched.documents
      }
    });

    // Upsert Tags and link to Scheme
    for (const tagName of tagsList) {
      const normalizedTagName = tagName.trim();
      let tagId = uniqueTagsMap.get(normalizedTagName.toLowerCase());

      if (!tagId) {
        const tagObj = await prisma.tag.upsert({
          where: { name: normalizedTagName },
          update: {},
          create: { name: normalizedTagName }
        });
        tagId = tagObj.id;
        uniqueTagsMap.set(normalizedTagName.toLowerCase(), tagId);
      }

      await prisma.schemeTag.upsert({
        where: {
          schemeId_tagId: {
            schemeId: scheme.id,
            tagId
          }
        },
        update: {},
        create: {
          schemeId: scheme.id,
          tagId
        }
      });
    }

    // Link Categories to Scheme
    for (const catName of schemeCategories) {
      const category = categoriesMap[catName];
      await prisma.schemeCategory.upsert({
        where: {
          schemeId_categoryId: {
            schemeId: scheme.id,
            categoryId: category.id
          }
        },
        update: {},
        create: {
          schemeId: scheme.id,
          categoryId: category.id
        }
      });
    }

    totalImported++;
  }

  console.log('Seeding process finished.');
  console.log('================ SUMMARY ================');
  console.log(`Total Schemes Imported / Upserted: ${totalImported}`);
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
