const { invalid } = require('../shared/errors');

// Kiểm tra items và gộp các dòng trùng pid
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw invalid('items must be a non-empty array');
  const map = new Map();
  for (const it of items) {
    if (!Number.isInteger(it.pid) || it.pid <= 0) throw invalid('pid must be a positive integer');
    if (!Number.isInteger(it.qty) || it.qty <= 0) throw invalid('qty must be a positive integer');
    map.set(it.pid, (map.get(it.pid) || 0) + it.qty);
  }
  return [...map].map(([pid, qty]) => ({ pid, qty }));
}

module.exports = { normalizeItems };
