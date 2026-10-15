const { Pool } = require('pg');
const { sleep } = require('../shared/grpc');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log(`[customer] waiting for database (${i}/${retries})...`); await sleep(2000); }
  }
  throw new Error('Cannot connect to database');
}

// Theo ERD: Membership(mid, mname, score) và Customer(uid, fullname, mid)
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      mid   SERIAL PRIMARY KEY,
      mname VARCHAR(50) NOT NULL,
      score INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS customers (
      uid      INT PRIMARY KEY,  -- tham chiếu logic tới User.uid của Auth Service (database-per-service nên không có FK liên DB)
      fullname VARCHAR(100) NOT NULL,
      mid      INT NOT NULL REFERENCES memberships(mid)
    );
  `);
}

module.exports = { pool, waitForDb, initSchema };
