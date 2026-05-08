const authValidation = require('./auth.validation');
const userValidation = require('./user.validation');
const productValidation = require('./product.validation');
const branchValidation = require('./branch.validation');
const productionValidation = require('./production.validation');
const remainingValidation = require('./remaining.validation');
const { validate, validateQuery, validateParams } = require('./validate.middleware');

module.exports = {
  authValidation,
  userValidation,
  productValidation,
  branchValidation,
  productionValidation,
  remainingValidation,
  validate,
  validateQuery,
  validateParams
};