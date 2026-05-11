const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } }),
    prisma.role.upsert({ where: { name: 'MANAGER' }, update: {}, create: { name: 'MANAGER' } }),
    prisma.role.upsert({ where: { name: 'STAFF' }, update: {}, create: { name: 'STAFF' } }),
    prisma.role.upsert({ where: { name: 'CAKE_CHEF' }, update: {}, create: { name: 'CAKE_CHEF' } }),
    prisma.role.upsert({ where: { name: 'FETIR_CHEF' }, update: {}, create: { name: 'FETIR_CHEF' } }),
    prisma.role.upsert({ where: { name: 'CASHIER' }, update: {}, create: { name: 'CASHIER' } }),
  ]);

  const branch1 = await prisma.branch.upsert({ where: { name: 'Main Branch' }, update: {}, create: { name: 'Main Branch' } });
  const branch2 = await prisma.branch.upsert({ where: { name: 'Branch 2' }, update: {}, create: { name: 'Branch 2' } });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Ahmed Mohamed',
      username: 'admin',
      passwordHash: hashedPassword,
      roleId: roles[0].id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'sara.manager' },
    update: {},
    create: {
      name: 'Sara Ali',
      username: 'sara.manager',
      passwordHash: hashedPassword,
      roleId: roles[1].id,
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'omar.staff' },
    update: {},
    create: {
      name: 'Omar Hassan',
      username: 'omar.staff',
      passwordHash: hashedPassword,
      roleId: roles[2].id,
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'fatima.cake' },
    update: {},
    create: {
      name: 'Fatima Ahmed',
      username: 'fatima.cake',
      passwordHash: hashedPassword,
      roleId: roles[3].id,
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'yousseb.fetir' },
    update: {},
    create: {
      name: 'Youssef Ibrahim',
      username: 'yousseb.fetir',
      passwordHash: hashedPassword,
      roleId: roles[4].id,
      branchId: branch1.id,
    },
  });

  console.log('Seed completed!', { adminUser, roles });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });