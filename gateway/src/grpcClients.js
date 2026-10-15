const { grpc, loadProto, call } = require('./shared/grpc');
const config = require('./config');

const creds = grpc.credentials.createInsecure();
const mk = (file, pkg, svc, addr) => new (loadProto(file)[pkg][svc])(addr, creds);

const clients = {
  auth: mk('auth.proto', 'auth', 'AuthService', config.addr.auth),
  customer: mk('customer.proto', 'customer', 'CustomerService', config.addr.customer),
  product: mk('product.proto', 'product', 'ProductService', config.addr.product),
  order: mk('order.proto', 'order', 'OrderService', config.addr.order),
  shipment: mk('shipment.proto', 'shipment', 'ShipmentService', config.addr.shipment),
};

// rpc('product', 'GetProduct', { pid: 1 })
const rpc = (service, method, req, timeoutMs) => call(clients[service], method, req, timeoutMs);

module.exports = { clients, rpc };
