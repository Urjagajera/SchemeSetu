// scripts/testEngine.cjs
// Manual verification: run eligibility engine against 3 test profiles.
// NOT a persistent test — for A7 validation only.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mirror of eligibilityEngine.ts logic (CJS compatible)
const BOOLEAN_FLAG_KEYWORDS = {
  farmer:     ['farmer', 'farmers', 'agriculture', 'agricultural', 'fisherman', 'fishermen', 'paddy', 'krishi', 'horticulture', 'animal husbandry', 'livestock', 'fish farming'],
  disability: ['disability', 'disabled', 'pwd', 'divyang', 'handicapped', 'differently abled'],
  minority:   ['scheduled caste', 'sc', 'obc', 'st', 'scheduled tribe', 'minority', 'backward class', 'bc', 'ews'],
  widow:      ['widow', 'widowed', 'widow pension'],
  veteran:    ['veteran', 'ex-serviceman', 'ex serviceman', 'defence', 'armed forces', 'military', 'army', 'navy', 'air force'],
};

const OCCUPATION_KEYWORDS = {
  student:          ['student', 'students', 'scholarship', 'education', 'fellowship', 'stipend', 'school', 'college', 'university', 'youth', 'internship'],
  farmer:           BOOLEAN_FLAG_KEYWORDS.farmer,
  entrepreneur:     ['entrepreneur', 'business', 'startup', 'start-up', 'msme', 'industry', 'self-employment', 'self employment', 'trader', 'retailer', 'enterprise'],
  'senior citizen': ['senior citizen', 'senior citizens', 'pension', 'old age', 'elderly'],
  unemployed:       ['unemployed', 'job seeker', 'unemployment', 'youth employment'],
};

function buildProfileKeywords(profile) {
  const kw = new Set();
  if (Array.isArray(profile.interests)) profile.interests.forEach(i => kw.add(i.toLowerCase().trim()));
  if (profile.occupation) {
    const occ = profile.occupation.toLowerCase().trim();
    kw.add(occ);
    const mapped = OCCUPATION_KEYWORDS[occ];
    if (mapped) mapped.forEach(k => kw.add(k));
  }
  if (profile.education) kw.add(profile.education.toLowerCase().trim());
  if (profile.gender === 'female') ['woman', 'women', 'girl', 'girls', 'female', 'mahila', 'kanya'].forEach(k => kw.add(k));
  if (profile.category) kw.add(profile.category.toLowerCase().trim());
  if (profile.farmer)     BOOLEAN_FLAG_KEYWORDS.farmer.forEach(k => kw.add(k));
  if (profile.disability) BOOLEAN_FLAG_KEYWORDS.disability.forEach(k => kw.add(k));
  if (profile.minority)   BOOLEAN_FLAG_KEYWORDS.minority.forEach(k => kw.add(k));
  if (profile.widow)      BOOLEAN_FLAG_KEYWORDS.widow.forEach(k => kw.add(k));
  if (profile.veteran)    BOOLEAN_FLAG_KEYWORDS.veteran.forEach(k => kw.add(k));
  if (profile.state)      kw.add(profile.state.toLowerCase().trim());
  return kw;
}

function scoreScheme(scheme, profileKeywords, profileState) {
  const matched = new Set();
  for (const sc of scheme.categories) {
    const catName = sc.category.name.toLowerCase();
    if (profileKeywords.has(catName)) matched.add(sc.category.name);
  }
  for (const st of scheme.tags) {
    const tagName = st.tag.name.toLowerCase();
    for (const kw of profileKeywords) {
      if (tagName.includes(kw) || kw.includes(tagName)) { matched.add(st.tag.name); break; }
    }
  }
  for (const eligLine of scheme.eligibility) {
    const lineLower = eligLine.toLowerCase();
    for (const kw of profileKeywords) {
      if (lineLower.includes(kw)) { matched.add(kw); break; }
    }
  }
  if (profileState && scheme.authorityName.toLowerCase().includes(profileState.toLowerCase())) {
    matched.add(`state:${scheme.authorityName}`);
  }
  if (matched.size === 0) return null;
  return { matchScore: matched.size, matchedOn: Array.from(matched) };
}

async function runTest(profileName, profile) {
  const allSchemes = await prisma.scheme.findMany({
    include: {
      categories: { select: { category: { select: { id: true, name: true } } } },
      tags:       { select: { tag:      { select: { id: true, name: true } } } },
    },
  });

  const profileKeywords = buildProfileKeywords(profile);
  console.log(`\n=== Profile: ${profileName} ===`);
  console.log('Keywords:', [...profileKeywords].join(', '));

  const results = [];
  for (const scheme of allSchemes) {
    const r = scoreScheme(scheme, profileKeywords, profile.state);
    if (r) results.push({ name: scheme.name, ...r });
  }
  results.sort((a, b) => b.matchScore - a.matchScore);

  if (results.length === 0) {
    console.log('  No matches.');
  } else {
    results.forEach(r => {
      console.log(`  [score=${r.matchScore}] ${r.name}`);
      console.log(`    matchedOn: ${r.matchedOn.join(', ')}`);
    });
  }
}

async function main() {
  // Profile A: Gujarati farmer with disability
  await runTest('Farmer + Disability (Gujarat)', {
    gender: 'male', state: 'Gujarat', category: 'General', occupation: 'farmer',
    education: 'secondary', interests: [], farmer: true, disability: true, minority: false, widow: false, veteran: false,
  });

  // Profile B: Female student in Gujarat
  await runTest('Female Student (Gujarat)', {
    gender: 'female', state: 'Gujarat', category: 'Student', occupation: 'student',
    education: 'graduate', interests: ['scholarship', 'education'], farmer: false, disability: false, minority: false, widow: false, veteran: false,
  });

  // Profile C: Widow seeking pension
  await runTest('Widow (Gujarat)', {
    gender: 'female', state: 'Gujarat', category: 'General', occupation: 'unemployed',
    education: 'primary', interests: [], farmer: false, disability: false, minority: false, widow: true, veteran: false,
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
