const { randomUUID } = require('crypto');
const { pool } = require('./db');

const num = (v) => Number(v);

// UC09: Order + OrderDetail + OutboxEvent được ghi trong CÙNG MỘT transaction.
// Lỗi DB -> ROLLBACK toàn bộ; Kafka lỗi sau COMMIT -> event vẫn nằm PENDING để gửi lại.
async function createOrderWithOutbox({ uid, discount, items, subtotal, topic }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const o = await client.query('INSERT INTO orders (uid, discount) VALUES ($1,$2) RETURNING oid', [uid, discount]);
    const oid = o.rows[0].oid;
    for (const it of items) {
      await client.query('INSERT INTO order_details (oid, pid, qty, unit_price) VALUES ($1,$2,$3,$4)', [oid, it.pid, it.qty, it.unit_price]);
    }
    const total_amount = Math.round((subtotal - discount) * 100) / 100;
    const payload = {
      eventId: randomUUID(), eventType: 'OrderCreated', oid, uid, discount, subtotal, total_amount,
      items: items.map(({ pid, qty, unit_price }) => ({ pid, qty, unit_price })),
      createdAt: new Date().toISOString(),
    };
    await client.query(
      'INSERT INTO outbox_events (event_type, topic, event_key, payload) VALUES ($1,$2,$3,$4)',
      ['OrderCreated', topic, String(oid), payload]
    );
    await client.query('COMMIT');
    return oid;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function findOrder(oid) {
  const o = await pool.query('SELECT oid, uid, discount FROM orders WHERE oid = $1', [oid]);
  if (!o.rows[0]) return null;
  const d = await pool.query('SELECT pid, qty, unit_price FROM order_details WHERE oid = $1 ORDER BY pid', [oid]);
  return {
    oid: o.rows[0].oid, uid: o.rows[0].uid, discount: num(o.rows[0].discount),
    items: d.rows.map((r) => ({ pid: r.pid, qty: r.qty, unit_price: num(r.unit_price) })),
  };
}

async function listOrders(uid) { // uid = null -> tất cả (Admin)
  const r = uid == null
    ? await pool.query('SELECT oid, uid, discount FROM orders ORDER BY oid DESC')
    : await pool.query('SELECT oid, uid, discount FROM orders WHERE uid = $1 ORDER BY oid DESC', [uid]);
  return r.rows.map((x) => ({ oid: x.oid, uid: x.uid, discount: num(x.discount) }));
}

module.exports = { createOrderWithOutbox, findOrder, listOrders };
