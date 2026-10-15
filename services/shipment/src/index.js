const { loadProto, startServer } = require('./shared/grpc');
const { connect } = require('./infrastructure/db');
const { startConsumer } = require('./interfaces/kafkaConsumer');
const handlers = require('./interfaces/grpcHandlers');

async function main() {
  await connect();
  const proto = loadProto('shipment.proto');
  startServer(process.env.PORT || 50055, proto.shipment.ShipmentService.service, handlers, 'shipment-service');
  startConsumer().catch((e) => { console.error(e); process.exit(1); });
}
main().catch((e) => { console.error(e); process.exit(1); });
