const { handle } = require('../shared/errors');
const svc = require('../application/productService');
const { getDb } = require('../infrastructure/db');

module.exports = {
  ListProducts: handle(() => svc.listProducts()),
  GetProduct: handle((r) => svc.getProduct(r)),
  CreateProduct: handle((r) => svc.createProduct(r)),
  UpdateProduct: handle((r) => svc.updateProduct(r)),
  DeleteProduct: handle((r) => svc.deleteProduct(r)),
  GetProductsByIds: handle((r) => svc.getProductsByIds(r)),
  DecreaseStock: handle((r) => svc.decreaseStock(r)),
  IncreaseStock: handle((r) => svc.increaseStock(r)),
  Health: handle(async () => { await getDb().command({ ping: 1 }); return { status: 'UP' }; }),
};
