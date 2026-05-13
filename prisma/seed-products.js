const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = [
    // BREAD_AND_SWEET_BREADS
    { name: 'Arabic Bread', category: 'BREAD_AND_SWEET_BREADS', price: 0.50, unitType: 'piece' },
    { name: 'Baguette', category: 'BREAD_AND_SWEET_BREADS', price: 1.50, unitType: 'piece' },
    { name: 'Burger Buns', category: 'BREAD_AND_SWEET_BREADS', price: 0.75, unitType: 'piece' },
    { name: 'Hot Dog Buns', category: 'BREAD_AND_SWEET_BREADS', price: 0.75, unitType: 'piece' },
    { name: 'Croissant', category: 'BREAD_AND_SWEET_BREADS', price: 2.00, unitType: 'piece' },
    { name: 'Danish', category: 'BREAD_AND_SWEET_BREADS', price: 2.50, unitType: 'piece' },
    
    // CREAM_CAKES
    { name: 'Birthday Cake', category: 'CREAM_CAKES', price: 50.00, unitType: 'piece' },
    { name: 'Wedding Cake', category: 'CREAM_CAKES', price: 200.00, unitType: 'piece' },
    { name: 'Cream Roll', category: 'CREAM_CAKES', price: 3.00, unitType: 'piece' },
    
    // SOFT_CAKES
    { name: 'Cupcake', category: 'SOFT_CAKES', price: 2.50, unitType: 'piece' },
    { name: 'Muffin', category: 'SOFT_CAKES', price: 3.00, unitType: 'piece' },
    { name: 'Sponge Cake', category: 'SOFT_CAKES', price: 25.00, unitType: 'piece' },
    
    // DRY_CAKES
    { name: 'Brownie', category: 'DRY_CAKES', price: 2.00, unitType: 'piece' },
    { name: 'Cookies', category: 'DRY_CAKES', price: 1.50, unitType: 'piece' },
    
    // COOKIES
    { name: 'Chocolate Chip Cookies', category: 'COOKIES', price: 5.00, unitType: 'kg' },
    { name: 'Butter Cookies', category: 'COOKIES', price: 6.00, unitType: 'kg' },
    { name: 'Oatmeal Cookies', category: 'COOKIES', price: 5.50, unitType: 'kg' },
    
    // FETIRE_AND_SNACKS
    { name: 'Fetire', category: 'FETIRE_AND_SNACKS', price: 1.00, unitType: 'piece' },
    { name: 'Fetire with Cheese', category: 'FETIRE_AND_SNACKS', price: 2.00, unitType: 'piece' },
    { name: 'Snack Pack', category: 'FETIRE_AND_SNACKS', price: 5.00, unitType: 'piece' },
    
    // DRINKS_AND_RETAIL_ITEMS
    { name: 'Soft Drink', category: 'DRINKS_AND_RETAIL_ITEMS', price: 1.50, unitType: 'piece' },
    { name: 'Water', category: 'DRINKS_AND_RETAIL_ITEMS', price: 0.50, unitType: 'piece' },
    { name: 'Juice', category: 'DRINKS_AND_RETAIL_ITEMS', price: 2.00, unitType: 'piece' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: {
        name: product.name,
        category: product.category,
        price: product.price,
        unitType: product.unitType,
        isActive: true,
      },
    });
  }
  
  console.log(`${products.length} products created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());