const { HttpError } = require('./httpError');

// Kiểm tra kiểu dữ liệu ở biên (400). Quy tắc nghiệp vụ nằm trong từng service.
const str = (v) => (typeof v === 'string' ? v : '');
const isInt = (v) => Number.isInteger(v) && v <= 2147483647;

function intParam(value, name) {
  if (!/^[0-9]+$/.test(String(value))) throw new HttpError(400, `${name} must be a positive integer`);
  const n = Number(value);
  if (!isInt(n) || n <= 0) throw new HttpError(400, `${name} must be a positive integer`);
  return n;
}

function bodyObject(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new HttpError(400, 'Request body must be a JSON object');
  return req.body;
}

module.exports = { str, isInt, intParam, bodyObject };
