const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Bread Prod 1', name_am: 'ዳቦ ምርት ፩', category: 'BREAD_AND_SWEET_BREADS', price: 10, unitType: 'piece', costPrice: 5, sellingPrice: 10, productionShift: 'BOTH' },
  { name: 'Bread Prod 2', name_am: 'ዳቦ ምርት ፪', category: 'BREAD_AND_SWEET_BREADS', price: 15, unitType: 'piece', costPrice: 8, sellingPrice: 15, productionShift: 'BOTH' },

  { name: 'Cream Cake 1', name_am: 'ክሬም ኬክ ፩', category: 'CREAM_CAKES', price: 100, unitType: 'piece', costPrice: 60, sellingPrice: 100, productionShift: 'DAY' },
  { name: 'Cream Cake 2', name_am: 'ክሬም ኬክ ፪', category: 'CREAM_CAKES', price: 150, unitType: 'piece', costPrice: 90, sellingPrice: 150, productionShift: 'DAY' },

  { name: 'Soft Cake 1', name_am: 'ለስላሳ ኬክ ፩', category: 'SOFT_CAKES', price: 50, unitType: 'piece', costPrice: 25, sellingPrice: 50, productionShift: 'DAY' },
  { name: 'Soft Cake 2', name_am: 'ለስላሳ ኬክ ፪', category: 'SOFT_CAKES', price: 100, unitType: 'piece', costPrice: 55, sellingPrice: 100, productionShift: 'DAY' },

  { name: 'Dry Cake 1', name_am: 'ደረቅ ኬክ ፩', category: 'DRY_CAKES', price: 50, unitType: 'piece', costPrice: 25, sellingPrice: 50, productionShift: 'DAY' },
  { name: 'Dry Cake 2', name_am: 'ደረቅ ኬክ ፪', category: 'DRY_CAKES', price: 100, unitType: 'piece', costPrice: 55, sellingPrice: 100, productionShift: 'DAY' },

  { name: 'Cookies 1', name_am: 'ኩኪስ ፩', category: 'COOKIES', price: 500, unitType: 'piece', costPrice: 300, sellingPrice: 500, productionShift: 'DAY' },

  { name: 'Fetire 1', name_am: 'ፍቲር ፩', category: 'FETIRE_AND_SNACKS', price: 200, unitType: 'piece', costPrice: 100, sellingPrice: 200, productionShift: 'DAY' },

  { name: 'Drinks 1', name_am: 'መጠጥ ፩', category: 'DRINKS_AND_RETAIL_ITEMS', price: 200, unitType: 'piece', costPrice: 120, sellingPrice: 200, productionShift: 'BOTH' },
  { name: 'Drinks 2', name_am: 'መጠጥ ፪', category: 'DRINKS_AND_RETAIL_ITEMS', price: 300, unitType: 'piece', costPrice: 180, sellingPrice: 300, productionShift: 'BOTH' },
];

async function main() {
  console.log('Seeding products...');
  for (const product of PRODUCTS) {
    const upserted = await prisma.product.upsert({
      where: { name: product.name },
      update: { name_am: product.name_am, category: product.category, price: product.price, unitType: product.unitType, isActive: true, costPrice: product.costPrice, sellingPrice: product.sellingPrice, productionShift: product.productionShift },
      create: { name: product.name, name_am: product.name_am, category: product.category, price: product.price, unitType: product.unitType, isActive: true, costPrice: product.costPrice, sellingPrice: product.sellingPrice, productionShift: product.productionShift },
    });

    const existingHistory = await prisma.productPriceHistory.findFirst({
      where: { productId: upserted.id, validTo: null },
    });
    if (!existingHistory) {
      await prisma.productPriceHistory.create({
        data: {
          productId: upserted.id,
          price: product.price,
          validFrom: new Date('2026-04-01'),
          validTo: null,
        },
      });
    }
  }
  console.log(`Products seeded: ${PRODUCTS.length} with initial price history`);
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });