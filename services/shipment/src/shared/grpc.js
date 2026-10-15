const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// PROTO_DIR được set trong Docker; chạy local thì lấy thư mục proto/ ở gốc repo
function loadProto(file) {
  const dir = process.env.PROTO_DIR || path.join(__dirname, '../../../../proto');
  const def = protoLoader.loadSync(path.join(dir, file), {
    keepCase: true, longs: Number, enums: String, defaults: true, oneofs: true,
  });
  return grpc.loadPackageDefinition(def);
}

function startServer(port, serviceDef, impl, name) {
  const server = new grpc.Server();
  server.addService(serviceDef, impl);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) { console.error(err); process.exit(1); }
    console.log(`[${name}] gRPC server listening on :${port}`);
  });
  return server;
}

// Gọi gRPC client dạng Promise, có deadline để không treo khi service đích chết
function call(client, method, request, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    client[method](request, { deadline: Date.now() + timeoutMs }, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { grpc, loadProto, startServer, call, sleep };
