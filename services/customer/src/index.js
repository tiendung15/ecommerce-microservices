const { loadProto, startServer } = require('./shared/grpc');
const { waitForDb, initSchema } = require('./infrastructure/db');
const repo = require('./infrastructure/customerRepository');
const handlers = require('./interfaces/grpcHandlers');

async function main() {
  await waitForDb();
  await initSchema();
  await repo.seedMemberships();
  const proto = loadProto('customer.proto');
  startServer(process.env.PORT || 50052, proto.customer.CustomerService.service, handlers, 'customer-service');
}
main().catch((e) => { console.error(e); process.exit(1); });
