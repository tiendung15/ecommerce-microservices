const { pool } = require('./db');

// Dữ liệu mẫu: tài liệu thiết kế không cho biết danh sách hạng thành viên -> đây là GIẢ ĐỊNH, ghi rõ trong README
const DEFAULT_MEMBERSHIPS = [['Bronze', 0], ['Silver', 100], ['Gold', 500], ['Platinum', 1000]];

async function seedMemberships() {
  const r = await pool.query('SELECT COUNT(*)::int AS n FROM memberships');
  if (r.rows[0].n > 0) return;
  for (const [mname, score] of DEFAULT_MEMBERSHIPS) {
    await pool.query('INSERT INTO memberships (mname, score) VALUES ($1,$2)', [mname, score]);
  }
  console.log('[customer] seeded default memberships');
}

async function getMembership(mid) {
  const r = await pool.query('SELECT mid, mname, score FROM memberships WHERE mid = $1', [mid]);
  return r.rows[0] || null;
}

async function getDefaultMembership() {
  const r = await pool.query('SELECT mid, mname, score FROM memberships ORDER BY score ASC, mid ASC LIMIT 1');
  return r.rows[0] || null;
}

async function insertCustomer(uid, fullname, mid) {
  await pool.query('INSERT INTO customers (uid, fullname, mid) VALUES ($1,$2,$3) ON CONFLICT (uid) DO NOTHING', [uid, fullname, mid]);
}

async function findCustomer(uid) {
  const r = await pool.query(
    `SELECT c.uid, c.fullname, c.mid, m.mname, m.score
       FROM customers c JOIN memberships m ON m.mid = c.mid WHERE c.uid = $1`, [uid]);
  return r.rows[0] || null;
}

async function updateCustomer(uid, { fullname, mid }) {
  const sets = []; const vals = [];
  if (fullname !== undefined) { vals.push(fullname); sets.push(`fullname = $${vals.length}`); }
  if (mid !== undefined) { vals.push(mid); sets.push(`mid = $${vals.length}`); }
  vals.push(uid);
  const r = await pool.query(`UPDATE customers SET ${sets.join(', ')} WHERE uid = $${vals.length}`, vals);
  return r.rowCount > 0;
}

module.exports = { seedMemberships, getMembership, getDefaultMembership, insertCustomer, findCustomer, updateCustomer };
