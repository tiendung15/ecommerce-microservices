const { invalid } = require('../shared/errors');

// API-SHP-02: "Example statuses: PENDING, SHIPPING, DELIVERED, CANCELLED"
// Tài liệu không quy định luồng chuyển trạng thái nên chỉ kiểm tra giá trị hợp lệ.
const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

function validateStatus(status) {
  if (!STATUSES.includes(status)) throw invalid(`status must be one of: ${STATUSES.join(', ')}`);
  return status;
}

// TC-SHP-02: event thiếu oid (hoặc uid) thì không tạo Shipment
function parseOrderCreated(raw) {
  let evt;
  try { evt = JSON.parse(raw); } catch (e) { return { error: 'Invalid JSON' }; }
  if (!evt || !Number.isInteger(evt.oid) || evt.oid <= 0) return { error: 'Missing or invalid oid' };
  if (!Number.isInteger(evt.uid) || evt.uid <= 0) return { error: 'Missing or invalid uid' };
  return { oid: evt.oid, uid: evt.uid };
}

module.exports = { STATUSES, validateStatus, parseOrderCreated };
