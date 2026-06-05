const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const PASSWORD = 'password123';

// Branch name → slug mapping for usernames
const BRANCH_SLUGS = {
  'Main Branch': 'main',
  'Branch 2': 'branch2',
  'Branch 3': 'branch3',
};

async function main() {
  console.log('Seeding database...');

  const roles = [
    { name: 'ADMIN' },
    { name: 'MANAGER' },
    { name: 'BAKER' },
    { name: 'CAKE_CHEF' },
    { name: 'COOKIE_BAKER' },
    { name: 'FETIR_CHEF' },
    { name: 'CASHIER' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('Roles created');

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
  const bakerRole = await prisma.role.findUnique({ where: { name: 'BAKER' } });
  const cakeChefRole = await prisma.role.findUnique({ where: { name: 'CAKE_CHEF' } });
  const cookieBakerRole = await prisma.role.findUnique({ where: { name: 'COOKIE_BAKER' } });
  const fetirChefRole = await prisma.role.findUnique({ where: { name: 'FETIR_CHEF' } });
  const cashierRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } });

  const branches = [
    { name: 'Main Branch', name_am: 'ዋና ቅርንጫፍ' },
    { name: 'Branch 2', name_am: 'ቅርንጫፍ ፪' },
    { name: 'Branch 3', name_am: 'ቅርንጫፍ ፫' },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: {},
      create: branch,
    });
  }
  console.log('Branches created');

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── Global administration (no branchId) ──
  const globalUsers = [
    {
      name: 'System Admin',
      username: 'system-admin',
      passwordHash,
      roleId: adminRole.id,
      branchId: null,
      isBlocked: false,
    },
  ];

  for (const user of globalUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }
  console.log('Global admin created');

  // ── Branch staff (managers + operational roles) ──
  const branchRecords = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  let branchStaffTotal = 0;

  for (const branch of branchRecords) {
    const slug = BRANCH_SLUGS[branch.name] || branch.name.toLowerCase().replace(/\s+/g, '-');
    const roleNameMap = [
      { roleId: managerRole.id, roleSlug: 'manager' },
      { roleId: bakerRole.id, roleSlug: 'baker' },
      { roleId: cakeChefRole.id, roleSlug: 'cake-chef' },
      { roleId: cookieBakerRole.id, roleSlug: 'cookie-baker' },
      { roleId: fetirChefRole.id, roleSlug: 'fetir-chef' },
      { roleId: cashierRole.id, roleSlug: 'cashier' },
    ];

    for (const { roleId, roleSlug } of roleNameMap) {
      const username = `${slug}-${roleSlug}`;
      const displayName = `${branch.name} ${roleSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;

      await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          name: displayName,
          username,
          passwordHash,
          roleId,
          branchId: branch.id,
          isBlocked: false,
        },
      });
      branchStaffTotal++;
    }
  }

  console.log(`Branch staff created: ${branchStaffTotal} (${branchRecords.length} branches x 6 roles)`);
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
