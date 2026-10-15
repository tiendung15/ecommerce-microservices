const { loadProto, startServer } = require('./shared/grpc');
const { waitForDb, initSchema } = require('./infrastructure/db');
const { startOutboxPublisher } = require('./infrastructure/outboxPublisher');
const handlers = require('./interfaces/grpcHandlers');

async function main() {
  await waitForDb();
  await initSchema();
  const proto = loadProto('order.proto');
  startServer(process.env.PORT || 50054, proto.order.OrderService.service, handlers, 'order-service');
  startOutboxPublisher();
}
main().catch((e) => { console.error(e); process.exit(1); });
