const { Kafka } = require('kafkajs');
const { sleep } = require('../shared/grpc');
const { handleOrderCreated } = require('../application/shipmentService');

const TOPIC = process.env.ORDER_CREATED_TOPIC || 'order-created';

async function startConsumer() {
  const kafka = new Kafka({
    clientId: 'shipment-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: { retries: 10 },
  });
  const consumer = kafka.consumer({ groupId: 'shipment-service' });

  for (let i = 1; ; i++) {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
      break;
    } catch (e) {
      console.log(`[shipment] waiting for Kafka (${i}): ${e.message}`);
      await sleep(3000);
    }
  }
  await consumer.run({
    eachMessage: async ({ message }) => {
      await handleOrderCreated(message.value ? message.value.toString() : '');
    },
  });
  console.log(`[shipment] consuming topic "${TOPIC}"`);
}

module.exports = { startConsumer };
