const { invalid } = require('../shared/errors');

const MAX_INT32 = 2147483647;

function validatePname(v) {
  const s = (v || '').trim();
  if (!s) throw invalid('pname must not be empty');
  if (s.length > 100) throw invalid('pname must be at most 100 characters');
  return s;
}
function validatePrice(v) {
  if (!Number.isFinite(v) || v < 0) throw invalid('price must be a number >= 0');
  return Math.round(v * 100) / 100; // DECIMAL(10,2)
}
function validateQuantity(v) {
  if (!Number.isInteger(v) || v < 0 || v > MAX_INT32) throw invalid('quantity must be an integer >= 0');
  return v;
}

module.exports = { validatePname, validatePrice, validateQuantity };
