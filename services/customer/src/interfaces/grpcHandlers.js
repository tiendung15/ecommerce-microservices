const { handle } = require('../shared/errors');
const svc = require('../application/customerService');
const { pool } = require('../infrastructure/db');

module.exports = {
  CreateCustomer: handle((r) => svc.createCustomer(r)),
  GetCustomer: handle((r) => svc.getCustomer(r)),
  UpdateCustomer: handle((r) => svc.updateCustomer(r)),
  GetMembership: handle((r) => svc.getMembership(r)),
  Health: handle(async () => { await pool.query('SELECT 1'); return { status: 'UP' }; }),
};
