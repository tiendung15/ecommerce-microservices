const repo = require('../infrastructure/orderRepository');
const clients = require('../infrastructure/clients');
const { calculateDiscount, round2 } = require('../domain/discountPolicy');
const { normalizeItems } = require('../domain/orderValidator');
const { notFound, forbidden, stockConflict } = require('../shared/errors');

const TOPIC = process.env.ORDER_CREATED_TOPIC || 'order-created';
const ADMIN = 'ADMIN';

const subtotalOf = (items) => round2(items.reduce((s, i) => s + i.qty * i.unit_price, 0));
const withTotals = (o) => {
  const subtotal = subtotalOf(o.items);
  return { ...o, subtotal, total_amount: round2(subtotal - o.discount) };
};

// UC06 – luồng đặt hàng (các bước tương ứng sơ đồ "Luồng chính")
async function createOrder({ uid, items }) {
  const lines = normalizeItems(items);

  // Bước 3-4: lấy Customer rồi lấy score hạng thành viên (gRPC sang Customer Service). Customer không có -> 404
  const customer = await clients.customer.getCustomer(uid);
  const membership = await clients.customer.getMembership(customer.mid);

  // Bước 6: kiểm tra sản phẩm tồn tại + đủ hàng, lấy đơn giá từ Product Service (không tin giá client gửi)
  const { items: products } = await clients.product.getByIds(lines.map((l) => l.pid));
  const byPid = new Map(products.map((p) => [p.pid, p]));
  for (const l of lines) {
    const p = byPid.get(l.pid);
    if (!p) throw notFound(`Product ${l.pid} not found`);
    if (p.quantity < l.qty) throw stockConflict(`Insufficient stock for product ${l.pid}`);
  }
  const detail = lines.map((l) => ({ pid: l.pid, qty: l.qty, unit_price: byPid.get(l.pid).price }));
  const subtotal = subtotalOf(detail);

  // Bước 5: tính giảm giá theo score
  const discount = calculateDiscount(subtotal, membership.score);

  // Bước 7: trừ tồn kho (Product Service kiểm tra lại điều kiện nguyên tử, 409 nếu có đơn khác vừa lấy hết hàng)
  await clients.product.decreaseStock(lines);

  // Bước 8: lưu Order + OrderDetail + OutboxEvent trong 1 transaction. Lỗi -> hoàn kho để không lệch dữ liệu.
  let oid;
  try {
    oid = await repo.createOrderWithOutbox({ uid, discount, items: detail, subtotal, topic: TOPIC });
  } catch (e) {
    await clients.product.increaseStock(lines).catch((err) => console.error('[order] COMPENSATION FAILED', err.message));
    throw e;
  }
  // Bước 9 (publish Kafka) do outbox publisher chạy nền đảm nhiệm.
  return withTotals({ oid, uid, discount, items: detail });
}

// UC10 / API-ORD-02
async function listOrders({ requester_uid, requester_role }) {
  return { items: await repo.listOrders(requester_role === ADMIN ? null : requester_uid) };
}

// UC10 / API-ORD-03: chủ đơn hoặc Admin
async function getOrder({ oid, requester_uid, requester_role }) {
  const order = await repo.findOrder(oid);
  if (!order) throw notFound('Order not found');
  if (requester_role !== ADMIN && order.uid !== requester_uid) throw forbidden('You cannot access this order');
  return withTotals(order);
}

module.exports = { createOrder, listOrders, getOrder };
