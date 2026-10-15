const { Pool } = require('pg');
const { sleep } = require('../shared/grpc');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// PostgreSQL có thể chưa sẵn sàng lúc container vừa khởi động -> thử lại
async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log(`[auth] waiting for database (${i}/${retries})...`); await sleep(2000); }
  }
  throw new Error('Cannot connect to database');
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      roleid   SERIAL PRIMARY KEY,
      rolename VARCHAR(50) UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      uid      SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      roleid   INT NOT NULL REFERENCES roles(roleid),
      email    VARCHAR(100) UNIQUE,
      phone    VARCHAR(20)
    );
  `);
}

module.exports = { pool, waitForDb, initSchema };
