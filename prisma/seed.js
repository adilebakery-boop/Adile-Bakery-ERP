const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER' },
  });

  const bakerRole = await prisma.role.upsert({
    where: { name: 'BAKER' },
    update: {},
    create: { name: 'BAKER' },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'CASHIER' },
    update: {},
    create: { name: 'CASHIER' },
  });

  // Create branches
  const branch1 = await prisma.branch.upsert({
    where: { name: 'Main Branch' },
    update: {},
    create: { name: 'Main Branch' },
  });

  const branch2 = await prisma.branch.upsert({
    where: { name: 'Branch 2' },
    update: {},
    create: { name: 'Branch 2' },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create admin user
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Ahmed Mohamed',
      username: 'admin',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
    },
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'sara.manager' },
    update: {},
    create: {
      name: 'Sara Ali',
      username: 'sara.manager',
      passwordHash: managerPassword,
      roleId: managerRole.id,
      branchId: branch1.id,
    },
  });

  // Create baker user
  await prisma.user.upsert({
    where: { username: 'omar.baker' },
    update: {},
    create: {
      name: 'Omar Hassan',
      username: 'omar.baker',
      passwordHash: managerPassword,
      roleId: bakerRole.id,
      branchId: branch1.id,
    },
  });

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });