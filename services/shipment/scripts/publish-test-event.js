// Dùng: docker compose exec shipment-service node scripts/publish-test-event.js <valid|missing-oid|duplicate>
const { Kafka } = require('kafkajs');

const mode = process.argv[2] || 'valid';
const topic = process.env.ORDER_CREATED_TOPIC || 'order-created';
const kafka = new Kafka({ clientId: 'test-publisher', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });

const base = { eventType: 'OrderCreated', oid: 900001, uid: 1, discount: 0, items: [{ pid: 1, qty: 1, unit_price: 10 }] };

(async () => {
  const producer = kafka.producer();
  await producer.connect();
  let events;
  if (mode === 'missing-oid') { const { oid, ...noOid } = base; events = [noOid]; }   // TC-SHP-02
  else if (mode === 'duplicate') events = [base, base];                                // TC-SHP-05 (cùng event 2 lần)
  else events = [{ ...base, oid: 900000 + Math.floor(Math.random() * 90000) }];       // TC-SHP-01
  for (const e of events) await producer.send({ topic, messages: [{ key: String(e.oid), value: JSON.stringify(e) }] });
  console.log(`Published ${events.length} event(s), mode=${mode}`);
  await producer.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
