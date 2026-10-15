const { loadProto, startServer } = require('./shared/grpc');
const { waitForDb, initSchema } = require('./infrastructure/db');
const authService = require('./application/authService');
const handlers = require('./interfaces/grpcHandlers');

async function main() {
  await waitForDb();
  await initSchema();
  await authService.seed();
  const proto = loadProto('auth.proto');
  startServer(process.env.PORT || 50051, proto.auth.AuthService.service, handlers, 'auth-service');
}
main().catch((e) => { console.error(e); process.exit(1); });
