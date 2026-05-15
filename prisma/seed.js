const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log("Seeding database...");

  const roles = [
    { name: "ADMIN" },
    { name: "MANAGER" },
    { name: "BAKER" },
    { name: "CAKE_CHEF" },
    { name: "COOKIE_BAKER" },
    { name: "FETIR_CHEF" },
    { name: "CASHIER" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("Roles created");

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const managerRole = await prisma.role.findUnique({
    where: { name: "MANAGER" },
  });
  const bakerRole = await prisma.role.findUnique({ where: { name: "BAKER" } });
  const cakeChefRole = await prisma.role.findUnique({
    where: { name: "CAKE_CHEF" },
  });
  const cookieBakerRole = await prisma.role.findUnique({
    where: { name: "COOKIE_BAKER" },
  });
  const fetirChefRole = await prisma.role.findUnique({
    where: { name: "FETIR_CHEF" },
  });
  const cashierRole = await prisma.role.findUnique({
    where: { name: "CASHIER" },
  });

  const branches = [
    { name: "Main Branch" },
    { name: "Branch 2" },
    { name: "Branch 3" },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { name: branch.name },
      update: {},
      create: branch,
    });
  }
  console.log("Branches created");

  const mainBranch = await prisma.branch.findUnique({
    where: { name: "Main Branch" },
  });

  const passwordHash = await bcrypt.hash("password123", SALT_ROUNDS);

  const users = [
    {
      name: "Admin User",
      username: "admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Manager User",
      username: "manager",
      passwordHash,
      roleId: managerRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Baker User",
      username: "baker",
      passwordHash,
      roleId: bakerRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Cake Chef User",
      username: "cake_chef",
      passwordHash,
      roleId: cakeChefRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Cookie Baker User",
      username: "cookie_baker",
      passwordHash,
      roleId: cookieBakerRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Fetir Chef User",
      username: "fetir_chef",
      passwordHash,
      roleId: fetirChefRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Cashier User",
      username: "cashier",
      passwordHash,
      roleId: cashierRole.id,
      branchId: mainBranch.id,
      isBlocked: false,
    },
    {
      name: "Blocked User",
      username: "blocked_user",
      passwordHash,
      roleId: bakerRole.id,
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
  console.log("Users created");

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
