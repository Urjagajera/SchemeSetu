import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('Connecting to Supabase...');
    
    const schemeCount = await prisma.scheme.count();
    const categoryCount = await prisma.category.count();
    const schemeCategoryCount = await prisma.schemeCategory.count();
    const tagCount = await prisma.tag.count();
    const schemeTagCount = await prisma.schemeTag.count();
    const userCount = await prisma.user.count();
    const profileCount = await prisma.profile.count();

    console.log('\n================ DATABASE VERIFICATION SUMMARY ================');
    console.log(`Scheme table count:         ${schemeCount} rows`);
    console.log(`Category table count:       ${categoryCount} rows`);
    console.log(`SchemeCategory table count: ${schemeCategoryCount} rows`);
    console.log(`Tag table count:            ${tagCount} rows`);
    console.log(`SchemeTag table count:      ${schemeTagCount} rows`);
    console.log(`User table count:           ${userCount} rows`);
    console.log(`Profile table count:        ${profileCount} rows`);
    console.log('================================================================\n');

    console.log('Verification Success: Supabase connection is fully live and operational!');
  } catch (err) {
    console.error('Database connection failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
