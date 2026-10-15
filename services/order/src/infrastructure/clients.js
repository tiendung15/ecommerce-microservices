const { grpc, loadProto, call } = require('../shared/grpc');

const customerProto = loadProto('customer.proto');
const productProto = loadProto('product.proto');
const creds = grpc.credentials.createInsecure();

const customer = new customerProto.customer.CustomerService(process.env.CUSTOMER_ADDR || 'localhost:50052', creds);
const product = new productProto.product.ProductService(process.env.PRODUCT_ADDR || 'localhost:50053', creds);

module.exports = {
  customer: {
    getCustomer: (uid) => call(customer, 'GetCustomer', { uid }),
    getMembership: (mid) => call(customer, 'GetMembership', { mid }),
  },
  product: {
    getByIds: (pids) => call(product, 'GetProductsByIds', { pids }),
    decreaseStock: (items) => call(product, 'DecreaseStock', { items }),
    increaseStock: (items) => call(product, 'IncreaseStock', { items }),
  },
};
