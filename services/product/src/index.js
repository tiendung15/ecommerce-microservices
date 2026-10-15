const { loadProto, startServer } = require('./shared/grpc');
const { connect } = require('./infrastructure/db');
const handlers = require('./interfaces/grpcHandlers');

async function main() {
  await connect();
  const proto = loadProto('product.proto');
  startServer(process.env.PORT || 50053, proto.product.ProductService.service, handlers, 'product-service');
}
main().catch((e) => { console.error(e); process.exit(1); });
