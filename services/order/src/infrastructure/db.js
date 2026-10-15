const { Pool } = require('pg');
const { sleep } = require('../shared/grpc');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log(`[order] waiting for database (${i}/${retries})...`); await sleep(2000); }
  }
  throw new Error('Cannot connect to database');
}

// Order, OrderDetail theo ERD (đặt tên số nhiều vì "order" là từ khóa SQL) + bảng outbox_events cho Outbox Pattern
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      oid      SERIAL PRIMARY KEY,
      uid      INT NOT NULL,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS order_details (
      oid        INT NOT NULL REFERENCES orders(oid),
      pid        INT NOT NULL,
      qty        INT NOT NULL CHECK (qty > 0),
      unit_price DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (oid, pid)
    );
    CREATE TABLE IF NOT EXISTS outbox_events (
      id           BIGSERIAL PRIMARY KEY,
      event_type   VARCHAR(100) NOT NULL,
      topic        VARCHAR(100) NOT NULL,
      event_key    VARCHAR(100) NOT NULL,
      payload      JSONB NOT NULL,
      status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      attempts     INT NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (status, id);
  `);
}

module.exports = { pool, waitForDb, initSchema };
