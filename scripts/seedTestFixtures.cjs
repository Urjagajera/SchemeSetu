// scripts/seedTestFixtures.cjs
// Disposable test fixtures for A7 eligibility engine validation.
// NOT permanent — run cleanTestFixtures.cjs to remove these after testing.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test fixtures...');

  // ---- Categories ----
  const catFarmer  = await prisma.category.upsert({ where: { name: 'Farmer' },  update: {}, create: { name: 'Farmer' } });
  const catStudent = await prisma.category.upsert({ where: { name: 'Student' }, update: {}, create: { name: 'Student' } });
  const catWoman   = await prisma.category.upsert({ where: { name: 'Woman' },   update: {}, create: { name: 'Woman' } });
  const catGeneral = await prisma.category.upsert({ where: { name: 'General' }, update: {}, create: { name: 'General' } });

  // ---- Tags ----
  const tags = {
    agriculture:  await prisma.tag.upsert({ where: { name: 'Agriculture' },   update: {}, create: { name: 'Agriculture' } }),
    farmer:       await prisma.tag.upsert({ where: { name: 'Farmer' },        update: {}, create: { name: 'Farmer' } }),
    paddy:        await prisma.tag.upsert({ where: { name: 'Paddy' },         update: {}, create: { name: 'Paddy' } }),
    subsidy:      await prisma.tag.upsert({ where: { name: 'Subsidy' },       update: {}, create: { name: 'Subsidy' } }),
    scholarship:  await prisma.tag.upsert({ where: { name: 'Scholarship' },   update: {}, create: { name: 'Scholarship' } }),
    education:    await prisma.tag.upsert({ where: { name: 'Education' },     update: {}, create: { name: 'Education' } }),
    student:      await prisma.tag.upsert({ where: { name: 'Student' },       update: {}, create: { name: 'Student' } }),
    women:        await prisma.tag.upsert({ where: { name: 'Women' },         update: {}, create: { name: 'Women' } }),
    widow:        await prisma.tag.upsert({ where: { name: 'Widow' },         update: {}, create: { name: 'Widow' } }),
    disability:   await prisma.tag.upsert({ where: { name: 'Disability' },    update: {}, create: { name: 'Disability' } }),
    pwd:          await prisma.tag.upsert({ where: { name: 'PWD' },           update: {}, create: { name: 'PWD' } }),
    skill:        await prisma.tag.upsert({ where: { name: 'Skill' },         update: {}, create: { name: 'Skill' } }),
    youth:        await prisma.tag.upsert({ where: { name: 'Youth' },         update: {}, create: { name: 'Youth' } }),
    pension:      await prisma.tag.upsert({ where: { name: 'Pension' },       update: {}, create: { name: 'Pension' } }),
    gujarat:      await prisma.tag.upsert({ where: { name: 'Gujarat' },       update: {}, create: { name: 'Gujarat' } }),
    msme:         await prisma.tag.upsert({ where: { name: 'MSME' },          update: {}, create: { name: 'MSME' } }),
    entrepreneur: await prisma.tag.upsert({ where: { name: 'Entrepreneur' },  update: {}, create: { name: 'Entrepreneur' } }),
    veteran:      await prisma.tag.upsert({ where: { name: 'Veteran' },       update: {}, create: { name: 'Veteran' } }),
  };

  // ---- Schemes ----
  const schemes = [
    {
      id:            'test-farmer-paddy-subsidy',
      name:          '[TEST] Back Ended Subsidy for Paddy Growers',
      sourceUrl:     'https://example.com/test-farmer-paddy',
      description:   'Subsidies for paddy-growing farmers in Gujarat with active farmer cards.',
      level:         'STATE',
      authorityName: 'Gujarat',
      eligibility:   ['Must be an active farmer.', 'Must hold a valid farmer identity card or land records.'],
      documents:     ['Aadhaar Card', 'Farmer Identity Card'],
      catIds:  [catFarmer.id],
      tagIds:  [tags.agriculture.id, tags.farmer.id, tags.paddy.id, tags.subsidy.id, tags.gujarat.id],
    },
    {
      id:            'test-student-scholarship',
      name:          '[TEST] Post-Matric Scholarship for Meritorious Students',
      sourceUrl:     'https://example.com/test-student-scholarship',
      description:   'Merit scholarship for students pursuing higher education.',
      level:         'CENTRAL',
      authorityName: 'Ministry of Education',
      eligibility:   ['Must be currently enrolled in a recognized educational institution.', 'Must maintain minimum attendance.'],
      documents:     ['Aadhaar Card', 'Marksheet', 'Fee Receipt'],
      catIds:  [catStudent.id],
      tagIds:  [tags.scholarship.id, tags.education.id, tags.student.id, tags.youth.id],
    },
    {
      id:            'test-widow-pension',
      name:          '[TEST] Widow Pension Scheme',
      sourceUrl:     'https://example.com/test-widow-pension',
      description:   'Monthly pension support for widowed women in Gujarat.',
      level:         'STATE',
      authorityName: 'Gujarat',
      eligibility:   ['Applicant must be a widow.', 'Must be a resident of Gujarat.'],
      documents:     ['Aadhaar Card', 'Death Certificate of Spouse'],
      catIds:  [catWoman.id],
      tagIds:  [tags.women.id, tags.widow.id, tags.pension.id, tags.gujarat.id],
    },
    {
      id:            'test-disability-employment',
      name:          '[TEST] Skill Development for Persons with Disability',
      sourceUrl:     'https://example.com/test-pwd-skill',
      description:   'Free skill training for disabled individuals to improve employment prospects.',
      level:         'CENTRAL',
      authorityName: 'Ministry of Social Justice',
      eligibility:   ['Must be a person with disability (PWD).', 'Must hold a valid disability certificate.'],
      documents:     ['Aadhaar Card', 'Disability Certificate'],
      catIds:  [catGeneral.id],
      tagIds:  [tags.disability.id, tags.pwd.id, tags.skill.id, tags.youth.id],
    },
    {
      id:            'test-veteran-welfare',
      name:          '[TEST] Ex-Serviceman Welfare Scheme',
      sourceUrl:     'https://example.com/test-veteran',
      description:   'Financial assistance for veterans and ex-servicemen.',
      level:         'CENTRAL',
      authorityName: 'Ministry of Defence',
      eligibility:   ['Must be an ex-serviceman or veteran.', 'Must produce service discharge certificate.'],
      documents:     ['Aadhaar Card', 'Discharge Certificate'],
      catIds:  [catGeneral.id],
      tagIds:  [tags.veteran.id],
    },
    {
      id:            'test-msme-entrepreneur',
      name:          '[TEST] MSME Capital Subsidy for Entrepreneurs',
      sourceUrl:     'https://example.com/test-msme',
      description:   'Capital subsidy for new and existing MSME entrepreneurs.',
      level:         'STATE',
      authorityName: 'Gujarat',
      eligibility:   ['Must be a registered MSME unit.', 'Must be an entrepreneur or business owner.'],
      documents:     ['Aadhaar Card', 'MSME Registration Certificate'],
      catIds:  [catGeneral.id],
      tagIds:  [tags.msme.id, tags.entrepreneur.id, tags.subsidy.id, tags.gujarat.id],
    },
  ];

  for (const s of schemes) {
    await prisma.scheme.upsert({
      where:  { id: s.id },
      update: {
        name:          s.name,
        description:   s.description,
        level:         s.level,
        authorityName: s.authorityName,
        eligibility:   s.eligibility,
        documents:     s.documents,
      },
      create: {
        id:            s.id,
        name:          s.name,
        sourceUrl:     s.sourceUrl,
        description:   s.description,
        level:         s.level,
        authorityName: s.authorityName,
        eligibility:   s.eligibility,
        documents:     s.documents,
        categories: { create: s.catIds.map(catId => ({ categoryId: catId })) },
        tags:        { create: s.tagIds.map(tagId => ({ tagId })) },
      },
    });

    console.log(`  Seeded: ${s.name}`);
  }

  console.log('Test fixtures seeded: 6 schemes, 4 categories, 18 tags');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
