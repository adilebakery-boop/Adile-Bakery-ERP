function isInteger(value) {
  return Number.isInteger(Number(value));
}

function isDecimalAllowed(unitType) {
  return unitType === 'kg';
}

function validateQuantityForUnitType(quantity, unitType) {
  if (!isDecimalAllowed(unitType) && !isInteger(quantity)) {
    return {
      valid: false,
      message: `Quantity for "${unitType}" products must be a whole number (no decimals)`,
    };
  }
  return { valid: true };
}

module.exports = {
  isInteger,
  isDecimalAllowed,
  validateQuantityForUnitType,
};