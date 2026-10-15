const router = require('express').Router();
const { rpc } = require('../grpcClients');
const { wrap, HttpError } = require('../httpError');
const { isInt, intParam, bodyObject } = require('../validate');
const { invalidate } = require('./products');

const itemsDto = (items) => items.map((i) => ({ pid: i.pid, qty: i.qty, unit_price: i.unit_price }));

// API-ORD-01: đặt hàng. Backend tự tính discount và lấy unit_price (client chỉ gửi pid + qty).
router.post('/', wrap(async (req, res) => {
  const b = bodyObject(req);
  if (!Array.isArray(b.items) || b.items.length === 0) throw new HttpError(400, 'items must be a non-empty array');
  const items = b.items.map((i) => {
    if (!i || !isInt(i.pid) || !isInt(i.qty)) throw new HttpError(400, 'each item needs integer pid and qty');
    return { pid: i.pid, qty: i.qty };
  });
  const o = await rpc('order', 'CreateOrder', { uid: req.user.uid, items }, 15000);
  await invalidate(); // tồn kho đã đổi -> xóa cache sản phẩm
  res.status(201).json({
    oid: o.oid, uid: o.uid, discount: o.discount, subtotal: o.subtotal, total_amount: o.total_amount,
    items: itemsDto(o.items),
    // Shipment được tạo BẤT ĐỒNG BỘ qua Kafka nên lúc này chưa có shipid; xem shipid ở GET /api/orders/:oid
    shipment: { status: 'PENDING' },
  });
}));

// API-ORD-02: đơn của người dùng hiện tại (Admin xem tất cả)
router.get('/', wrap(async (req, res) => {
  const r = await rpc('order', 'ListOrders', { requester_uid: req.user.uid, requester_role: req.user.role });
  res.json({ items: r.items.map((o) => ({ oid: o.oid, uid: o.uid, discount: o.discount })) });
}));

// API-ORD-03: chi tiết đơn (chủ đơn / Admin) + trạng thái giao hàng nếu Shipment đã được tạo
router.get('/:oid', wrap(async (req, res) => {
  const oid = intParam(req.params.oid, 'oid');
  const who = { requester_uid: req.user.uid, requester_role: req.user.role };
  const o = await rpc('order', 'GetOrder', { oid, ...who });
  let shipment = null;
  try {
    const s = await rpc('shipment', 'GetShipmentByOrder', { oid, ...who });
    shipment = { shipid: s.shipid, status: s.status };
  } catch (e) { /* chưa có Shipment (event chưa xử lý xong) hoặc Shipment Service tạm lỗi -> trả null */ }
  res.json({
    oid: o.oid, uid: o.uid, discount: o.discount, subtotal: o.subtotal, total_amount: o.total_amount,
    items: itemsDto(o.items), shipment,
  });
}));

module.exports = router;
