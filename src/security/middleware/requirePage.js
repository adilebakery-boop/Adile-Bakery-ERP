const { getPagesForRole } = require('../mappings/role-pages');
const { PAGES } = require('../mappings/role-pages');
const { forbiddenResponse } = require('../errors/responses');

const requirePage = (page) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedPages = getPagesForRole(req.user.role);

    if (!allowedPages.includes(page)) {
      return res.status(403).json(
        forbiddenResponse(`Access denied. Page '${page}' is not accessible for your role.`)
      );
    }

    next();
  };
};

const requireAnyPage = (...pages) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedPages = getPagesForRole(req.user.role);
    const hasAccess = pages.some(page => allowedPages.includes(page));

    if (!hasAccess) {
      return res.status(403).json(
        forbiddenResponse('Access denied to requested pages.')
      );
    }

    next();
  };
};

const requireDashboard = () => requirePage(PAGES.DASHBOARD);
const requireProduction = () => requirePage(PAGES.PRODUCTION);
const requireRemaining = () => requirePage(PAGES.REMAINING);
const requireReports = () => requirePage(PAGES.REPORTS);
const requireProducts = () => requirePage(PAGES.PRODUCTS);
const requireBranches = () => requirePage(PAGES.BRANCHES);
const requireUsers = () => requirePage(PAGES.USERS);
const requireProfile = () => requirePage(PAGES.PROFILE);

module.exports = {
  requirePage,
  requireAnyPage,
  requireDashboard,
  requireProduction,
  requireRemaining,
  requireReports,
  requireProducts,
  requireBranches,
  requireUsers,
  requireProfile,
  PAGES
};