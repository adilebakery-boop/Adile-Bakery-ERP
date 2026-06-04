// scripts/check-rate-limit.js
const prisma = require('../src/config/prisma');

async function main() {
  const rows = await prisma.rateLimit.findMany({
    take: 50,
    orderBy: { updatedAt: 'desc' }
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());