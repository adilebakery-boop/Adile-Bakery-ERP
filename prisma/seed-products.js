const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRODUCTS = [
  // BREAD_AND_SWEET_BREADS
  { name: 'Arabic Bread', category: 'BREAD_AND_SWEET_BREADS', price: 1.00, unitType: 'piece' },
  { name: 'Baguette', category: 'BREAD_AND_SWEET_BREADS', price: 3.00, unitType: 'piece' },
  { name: 'Burger Buns', category: 'BREAD_AND_SWEET_BREADS', price: 0.50, unitType: 'piece' },
  { name: 'Hot Dog Buns', category: 'BREAD_AND_SWEET_BREADS', price: 0.75, unitType: 'piece' },
  { name: 'Croissant', category: 'BREAD_AND_SWEET_BREADS', price: 2.50, unitType: 'piece' },
  { name: 'Danish', category: 'BREAD_AND_SWEET_BREADS', price: 3.00, unitType: 'piece' },
  { name: 'Pain au Chocolat', category: 'BREAD_AND_SWEET_BREADS', price: 4.00, unitType: 'piece' },
  { name: 'Muffin', category: 'BREAD_AND_SWEET_BREADS', price: 2.00, unitType: 'piece' },
  { name: 'Cinnamon Roll', category: 'BREAD_AND_SWEET_BREADS', price: 2.50, unitType: 'piece' },
  { name: 'Donut', category: 'BREAD_AND_SWEET_BREADS', price: 1.50, unitType: 'piece' },

  // CREAM_CAKES
  { name: 'Birthday Cake', category: 'CREAM_CAKES', price: 50.00, unitType: 'piece' },
  { name: 'Wedding Cake', category: 'CREAM_CAKES', price: 150.00, unitType: 'piece' },
  { name: 'Cream Roll', category: 'CREAM_CAKES', price: 5.00, unitType: 'piece' },
  { name: 'Eclairs', category: 'CREAM_CAKES', price: 4.00, unitType: 'piece' },
  { name: 'Cream Puff', category: 'CREAM_CAKES', price: 3.50, unitType: 'piece' },
  { name: 'Black Forest', category: 'CREAM_CAKES', price: 45.00, unitType: 'piece' },
  { name: 'Chocolate Mousse', category: 'CREAM_CAKES', price: 8.00, unitType: 'piece' },

  // SOFT_CAKES
  { name: 'Cupcake', category: 'SOFT_CAKES', price: 5.00, unitType: 'piece' },
  { name: 'Muffin (Sweet)', category: 'SOFT_CAKES', price: 3.00, unitType: 'piece' },
  { name: 'Sponge Cake', category: 'SOFT_CAKES', price: 15.00, unitType: 'piece' },
  { name: 'Pound Cake', category: 'SOFT_CAKES', price: 20.00, unitType: 'piece' },
  { name: 'Chiffon Cake', category: 'SOFT_CAKES', price: 25.00, unitType: 'piece' },
  { name: 'Swiss Roll', category: 'SOFT_CAKES', price: 6.00, unitType: 'piece' },

  // DRY_CAKES
  { name: 'Brownie', category: 'DRY_CAKES', price: 4.00, unitType: 'piece' },
  { name: 'Bars', category: 'DRY_CAKES', price: 3.00, unitType: 'piece' },
  { name: 'Cheesecake', category: 'DRY_CAKES', price: 15.00, unitType: 'piece' },
  { name: 'Tiramisu', category: 'DRY_CAKES', price: 12.00, unitType: 'piece' },
  { name: 'Carrot Cake', category: 'DRY_CAKES', price: 18.00, unitType: 'piece' },
  { name: 'Fruit Cake', category: 'DRY_CAKES', price: 20.00, unitType: 'piece' },

  // COOKIES
  { name: 'Chocolate Chip Cookies', category: 'COOKIES', price: 2.00, unitType: 'piece' },
  { name: 'Butter Cookies', category: 'COOKIES', price: 2.50, unitType: 'piece' },
  { name: 'Oatmeal Cookies', category: 'COOKIES', price: 2.00, unitType: 'piece' },
  { name: 'Sugar Cookies', category: 'COOKIES', price: 1.50, unitType: 'piece' },
  { name: 'Almond Cookies', category: 'COOKIES', price: 3.00, unitType: 'piece' },
  { name: 'Double Chocolate Cookies', category: 'COOKIES', price: 2.50, unitType: 'piece' },

  // FETIRE_AND_SNACKS
  { name: 'Fetire', category: 'FETIRE_AND_SNACKS', price: 8.00, unitType: 'piece' },
  { name: 'Fetire with Cheese', category: 'FETIRE_AND_SNACKS', price: 10.00, unitType: 'piece' },
  { name: 'Fetire with Honey', category: 'FETIRE_AND_SNACKS', price: 10.00, unitType: 'piece' },
  { name: 'Fetire Special', category: 'FETIRE_AND_SNACKS', price: 12.00, unitType: 'piece' },
  { name: 'Snack Pack Mix', category: 'FETIRE_AND_SNACKS', price: 15.00, unitType: 'pack' },
  { name: 'Baklava', category: 'FETIRE_AND_SNACKS', price: 8.00, unitType: 'piece' },
  { name: 'Kunafa', category: 'FETIRE_AND_SNACKS', price: 10.00, unitType: 'piece' },
  { name: 'Basbousa', category: 'FETIRE_AND_SNACKS', price: 3.00, unitType: 'piece' },

  // DRINKS_AND_RETAIL_ITEMS
  { name: 'Soft Drink - Cola', category: 'DRINKS_AND_RETAIL_ITEMS', price: 5.00, unitType: 'piece' },
  { name: 'Soft Drink - Orange', category: 'DRINKS_AND_RETAIL_ITEMS', price: 5.00, unitType: 'piece' },
  { name: 'Soft Drink - Lemon', category: 'DRINKS_AND_RETAIL_ITEMS', price: 5.00, unitType: 'piece' },
  { name: 'Water - Small', category: 'DRINKS_AND_RETAIL_ITEMS', price: 2.00, unitType: 'piece' },
  { name: 'Water - Large', category: 'DRINKS_AND_RETAIL_ITEMS', price: 3.00, unitType: 'piece' },
  { name: 'Orange Juice', category: 'DRINKS_AND_RETAIL_ITEMS', price: 8.00, unitType: 'piece' },
  { name: 'Mango Juice', category: 'DRINKS_AND_RETAIL_ITEMS', price: 10.00, unitType: 'piece' },
  { name: 'Coffee', category: 'DRINKS_AND_RETAIL_ITEMS', price: 5.00, unitType: 'piece' },
  { name: 'Tea', category: 'DRINKS_AND_RETAIL_ITEMS', price: 3.00, unitType: 'piece' },
  { name: '包装纸巾', category: 'DRINKS_AND_RETAIL_ITEMS', price: 2.00, unitType: 'piece' },
  { name: '一次性餐具', category: 'DRINKS_AND_RETAIL_ITEMS', price: 1.00, unitType: 'pack' },
];

async function main() {
  console.log('Seeding products...');

  let createdCount = 0;
  let skippedCount = 0;

  for (const product of PRODUCTS) {
    try {
      await prisma.product.upsert({
        where: { name: product.name },
        update: {
          category: product.category,
          price: product.price,
          unitType: product.unitType,
          isActive: true,
        },
        create: {
          name: product.name,
          category: product.category,
          price: product.price,
          unitType: product.unitType,
          isActive: true,
        },
      });
      createdCount++;
    } catch (error) {
      console.error(`Failed to create product ${product.name}:`, error.message);
      skippedCount++;
    }
  }

  console.log(`Products seeded: ${createdCount} created, ${skippedCount} skipped`);
  console.log('Product seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });