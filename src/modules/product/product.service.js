const prisma = require('../../config/prisma');

const productService = {
  async create(data) {
    const existingProduct = await prisma.product.findUnique({
      where: { name: data.name },
    });

    if (existingProduct) {
      const error = new Error('Product name already exists');
      error.code = 'P2002';
      throw error;
    }

    return prisma.product.create({
      data: {
        name: data.name,
        name_am: data.name_am || null,
        category: data.category,
        price: data.price,
        unitType: data.unitType,
        isActive: true,
      },
    });
  },

  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      sortBy = 'id',
      sortOrder = 'desc',
    } = options;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { isActive: true };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      const isActiveBool = isActive === true || isActive === 'true' || isActive === true;
      where.isActive = isActiveBool;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      const error = new Error('Product not found');
      error.code = 'P2025';
      throw error;
    }

    return product;
  },

  async update(id, data) {
    const existing = await this.findById(id);

    if (data.name) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: data.name, NOT: { id } },
      });

      if (existingProduct) {
        const error = new Error('Product name already exists');
        error.code = 'P2002';
        throw error;
      }
    }

    const priceChanged = data.price !== undefined && Number(data.price) !== Number(existing.price);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          name_am: data.name_am !== undefined ? (data.name_am || null) : undefined,
          category: data.category,
          price: data.price,
          unitType: data.unitType,
          isActive: data.isActive,
        },
      });

      if (priceChanged) {
        const now = new Date();
        await tx.productPriceHistory.updateMany({
          where: { productId: id, validTo: null },
          data: { validTo: now },
        });
        await tx.productPriceHistory.create({
          data: { productId: id, price: data.price, validFrom: now, validTo: null },
        });
      }

      return updated;
    });

    return result;
  },

  async delete(id) {
    await this.findById(id);

    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async restore(id) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      const error = new Error('Product not found');
      error.code = 'P2025';
      throw error;
    }

    return prisma.product.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async getCategories() {
    return [
      { value: 'BREAD_AND_SWEET_BREADS', label: 'Bread & Sweet Breads' },
      { value: 'CREAM_CAKES', label: 'Cream Cakes' },
      { value: 'SOFT_CAKES', label: 'Soft Cakes' },
      { value: 'DRY_CAKES', label: 'Dry Cakes' },
      { value: 'DRINKS_AND_RETAIL_ITEMS', label: 'Drinks & Retail Items' },
      { value: 'FETIRE_AND_SNACKS', label: 'Fetir & Snacks' },
      { value: 'COOKIES', label: 'Cookies' },
    ];
  },

  async getDeleted(options = {}) {
    const { page = 1, limit = 10, search } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = { isActive: false };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};

module.exports = productService;