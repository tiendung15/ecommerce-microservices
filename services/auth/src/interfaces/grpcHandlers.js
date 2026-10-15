const { handle } = require('../shared/errors');
const authService = require('../application/authService');
const { pool } = require('../infrastructure/db');

module.exports = {
  Register: handle((req) => authService.register(req)),
  Login: handle((req) => authService.login(req)),
  VerifyToken: handle((req) => authService.verifyToken(req)),
  Health: handle(async () => { await pool.query('SELECT 1'); return { status: 'UP' }; }),
};
