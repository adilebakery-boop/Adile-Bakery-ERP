function isInteger(value) {
  const num = Number(value);
  return Math.abs(num - Math.round(num)) < 1e-9;
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