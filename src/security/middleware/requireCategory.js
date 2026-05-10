const { getCategoriesForRole } = require('../mappings/role-categories');
const { CATEGORIES } = require('../constants/categories');
const { forbiddenResponse } = require('../errors/responses');

const requireCategory = (category) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedCategories = getCategoriesForRole(req.user.role);

    if (!allowedCategories.includes(category)) {
      return res.status(403).json(
        forbiddenResponse(`Access denied. Category '${category}' is not accessible for your role.`)
      );
    }

    next();
  };
};

const requireAnyCategory = (...categories) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedCategories = getCategoriesForRole(req.user.role);
    const hasAccess = categories.some(cat => allowedCategories.includes(cat));

    if (!hasAccess) {
      return res.status(403).json(
        forbiddenResponse('Access denied to requested categories.')
      );
    }

    next();
  };
};

const breadAndSweetBreads = () => requireCategory(CATEGORIES.BREAD_AND_SWEET_BREADS);
const creamCakes = () => requireCategory(CATEGORIES.CREAM_CAKES);
const softCakes = () => requireCategory(CATEGORIES.SOFT_CAKES);
const dryCakes = () => requireCategory(CATEGORIES.DRY_CAKES);
const drinksAndRetailItems = () => requireCategory(CATEGORIES.DRINKS_AND_RETAIL_ITEMS);
const fetire = () => requireCategory(CATEGORIES.FETIRE);

module.exports = {
  requireCategory,
  requireAnyCategory,
  breadAndSweetBreads,
  creamCakes,
  softCakes,
  dryCakes,
  drinksAndRetailItems,
  fetire,
  CATEGORIES
};