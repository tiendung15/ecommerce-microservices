const { Kafka } = require('kafkajs');
const { pool } = require('./db');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { retries: 3 },
});
const producer = kafka.producer();
let connected = false;
let running = false;

async function ensureConnected() {
  if (connected) return;
  await producer.connect();
  connected = true;
}

// Mỗi vòng: lấy tối đa 20 event PENDING (khóa dòng bằng SKIP LOCKED), gửi Kafka, thành công mới đánh dấu PUBLISHED.
async function publishPending() {
  if (running) return;
  running = true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "SELECT id, topic, event_key, payload FROM outbox_events WHERE status = 'PENDING' ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED");
    if (!rows.length) { await client.query('COMMIT'); return; }
    await ensureConnected();
    for (const e of rows) {
      try {
        await producer.send({ topic: e.topic, messages: [{ key: e.event_key, value: JSON.stringify(e.payload) }] });
        await client.query("UPDATE outbox_events SET status='PUBLISHED', published_at=now() WHERE id=$1", [e.id]);
      } catch (err) {
        connected = false; // thử kết nối lại ở vòng sau
        await client.query('UPDATE outbox_events SET attempts = attempts + 1 WHERE id=$1', [e.id]);
        console.error(`[order] Kafka publish failed for outbox ${e.id}: ${err.message} (will retry)`);
        break; // giữ thứ tự: dừng vòng này, event còn lại vẫn PENDING
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[order] outbox loop error:', err.message);
  } finally {
    client.release();
    running = false;
  }
}

function startOutboxPublisher(intervalMs = 2000) {
  setInterval(publishPending, intervalMs);
  console.log('[order] outbox publisher started');
}

module.exports = { startOutboxPublisher, publishPending };
