const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Bread Prod 1', category: 'BREAD_AND_SWEET_BREADS', price: 10, unitType: 'piece' },
  { name: 'Bread Prod 2', category: 'BREAD_AND_SWEET_BREADS', price: 15, unitType: 'piece' },

  { name: 'Cream Cake 1', category: 'CREAM_CAKES', price: 100, unitType: 'piece' },
  { name: 'Cream Cake 2', category: 'CREAM_CAKES', price: 150, unitType: 'piece' },

  { name: 'Soft Cake 1', category: 'SOFT_CAKES', price: 50, unitType: 'piece' },
  { name: 'Soft Cake 2', category: 'SOFT_CAKES', price: 100, unitType: 'piece' },

  { name: 'Dry Cake 1', category: 'DRY_CAKES', price: 50, unitType: 'piece' },
  { name: 'Dry Cake 2', category: 'DRY_CAKES', price: 100, unitType: 'piece' },

  { name: 'Cookies 1', category: 'COOKIES', price: 500, unitType: 'piece' },

  { name: 'Fetire 1', category: 'FETIRE_AND_SNACKS', price: 200, unitType: 'piece' },

  { name: 'Drinks 1', category: 'DRINKS_AND_RETAIL_ITEMS', price: 200, unitType: 'piece' },
  { name: 'Drinks 2', category: 'DRINKS_AND_RETAIL_ITEMS', price: 300, unitType: 'piece' },
  { name: 'Soft Drink - Cola', category: 'DRINKS_AND_RETAIL_ITEMS', price: 50, unitType: 'piece' },
  { name: 'Soft Drink - Lemon', category: 'DRINKS_AND_RETAIL_ITEMS', price: 50, unitType: 'piece' },
];

async function main() {
  console.log('Seeding products...');
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: { category: product.category, price: product.price, unitType: product.unitType, isActive: true },
      create: { name: product.name, category: product.category, price: product.price, unitType: product.unitType, isActive: true },
    });
  }
  console.log(`Products seeded: ${PRODUCTS.length}`);
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });