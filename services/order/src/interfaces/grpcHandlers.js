const { handle } = require('../shared/errors');
const svc = require('../application/orderService');
const { pool } = require('../infrastructure/db');

module.exports = {
  CreateOrder: handle((r) => svc.createOrder(r)),
  ListOrders: handle((r) => svc.listOrders(r)),
  GetOrder: handle((r) => svc.getOrder(r)),
  Health: handle(async () => { await pool.query('SELECT 1'); return { status: 'UP' }; }),
};
