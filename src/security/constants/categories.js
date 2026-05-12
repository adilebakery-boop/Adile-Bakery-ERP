const CATEGORIES = {
  BREAD_AND_SWEET_BREADS: 'BREAD_AND_SWEET_BREADS',
  CREAM_CAKES: 'CREAM_CAKES',
  SOFT_CAKES: 'SOFT_CAKES',
  DRY_CAKES: 'DRY_CAKES',
  DRINKS_AND_RETAIL_ITEMS: 'DRINKS_AND_RETAIL_ITEMS',
  FETIRE_AND_SNACKS: 'FETIRE_AND_SNACKS',
  COOKIES: 'COOKIES'
};

const CATEGORY_LIST = Object.values(CATEGORIES);

const isValidCategory = (category) => CATEGORY_LIST.includes(category);

const getCategoryLabel = (category) => {
  const labels = {
    [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread & Sweet Breads',
    [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
    [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
    [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
    [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks & Retail Items',
    [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetire & Snacks',
    [CATEGORIES.COOKIES]: 'Cookies'
  };
  return labels[category] || category;
};

module.exports = {
  CATEGORIES,
  CATEGORY_LIST,
  isValidCategory,
  getCategoryLabel
};