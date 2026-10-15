const { pool } = require('./db');

async function ensureRole(rolename) {
  await pool.query('INSERT INTO roles (rolename) VALUES ($1) ON CONFLICT (rolename) DO NOTHING', [rolename]);
  const r = await pool.query('SELECT roleid FROM roles WHERE rolename = $1', [rolename]);
  return r.rows[0].roleid;
}

async function createUser({ username, passwordHash, roleid, email, phone }) {
  const r = await pool.query(
    'INSERT INTO users (username, password, roleid, email, phone) VALUES ($1,$2,$3,$4,$5) RETURNING uid',
    [username, passwordHash, roleid, email, phone]
  );
  return r.rows[0].uid;
}

async function findByUsername(username) {
  const r = await pool.query(
    'SELECT u.uid, u.username, u.password, r.rolename FROM users u JOIN roles r ON r.roleid = u.roleid WHERE u.username = $1',
    [username]
  );
  return r.rows[0] || null;
}

module.exports = { ensureRole, createUser, findByUsername };
