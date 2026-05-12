const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = [
    { name: 'MANAGER' },
    { name: 'STAFF' },
    { name: 'CAKE_CHEF' },
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

  // Get role IDs
  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
  const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
  const cakeChefRole = await prisma.role.findUnique({ where: { name: 'CAKE_CHEF' } });
  const fetirChefRole = await prisma.role.findUnique({ where: { name: 'FETIR_CHEF' } });
  const cashierRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } });

  // Create branches
  const branches = [
    { name: 'Main Branch' },
    { name: 'Branch 2' },
    { name: 'Branch 3' },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: {},
      create: branch,
    });
  }
  console.log('Branches created');

  // Get branch IDs
  const mainBranch = await prisma.branch.findUnique({ where: { name: 'Main Branch' } });

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

  // Create users
  const users = [
    {
      name: 'Ahmed Mohamed',
      username: 'manager',
      passwordHash,
      roleId: managerRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: 'Ali Hassan',
      username: 'staff',
      passwordHash,
      roleId: staffRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: 'Sara Mahmoud',
      username: 'cake_chef',
      passwordHash,
      roleId: cakeChefRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: 'Omar Ibrahim',
      username: 'fetir_chef',
      passwordHash,
      roleId: fetirChefRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: 'Fatma Ahmed',
      username: 'cashier',
      passwordHash,
      roleId: cashierRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: 'Blocked User',
      username: 'blocked_user',
      passwordHash,
      roleId: staffRole.id,
      branchId: mainBranch.id,
      isBlocked: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }
  console.log('Users created');

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