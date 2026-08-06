// countSchemes.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const count = await prisma.scheme.count();
    console.log('Scheme count:', count);
  } catch (e) {
    console.error('Error counting schemes:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
