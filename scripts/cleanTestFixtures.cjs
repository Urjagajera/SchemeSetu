// scripts/cleanTestFixtures.cjs
// Removes the disposable A7 test fixtures. Run after verifying the engine.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEST_SCHEME_IDS = [
  'test-farmer-paddy-subsidy',
  'test-student-scholarship',
  'test-widow-pension',
  'test-disability-employment',
  'test-veteran-welfare',
  'test-msme-entrepreneur',
];

async function main() {
  console.log('Cleaning test fixtures...');

  // Remove junction rows first (FK constraint)
  await prisma.schemeCategory.deleteMany({ where: { schemeId: { in: TEST_SCHEME_IDS } } });
  await prisma.schemeTag.deleteMany({      where: { schemeId: { in: TEST_SCHEME_IDS } } });
  await prisma.scheme.deleteMany({         where: { id:       { in: TEST_SCHEME_IDS } } });

  // Remove test-only tags (by name prefix or exact names we seeded)
  // Leave categories (Farmer/Student/Woman/General are real vocabulary)
  const testTagNames = [
    'Agriculture','Farmer','Paddy','Subsidy','Scholarship','Education','Student',
    'Women','Widow','Disability','PWD','Skill','Youth','Pension','Gujarat',
    'MSME','Entrepreneur','Veteran',
  ];
  await prisma.tag.deleteMany({ where: { name: { in: testTagNames }, schemes: { none: {} } } });

  console.log('Test fixtures removed.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
