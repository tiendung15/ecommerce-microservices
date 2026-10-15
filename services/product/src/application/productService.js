const repo = require('../infrastructure/productRepository');
const { validatePname, validatePrice, validateQuantity } = require('../domain/validators');
const { invalid, notFound, stockConflict } = require('../shared/errors');

const listProducts = async () => ({ items: await repo.list() });

async function getProduct({ pid }) {
  const p = await repo.findByPid(pid);
  if (!p) throw notFound('Product not found');
  return p;
}

async function createProduct({ pname, price, quantity }) {
  return repo.create({ pname: validatePname(pname), price: validatePrice(price), quantity: validateQuantity(quantity) });
}

async function updateProduct(r) {
  const fields = {};
  if (r.has_pname) fields.pname = validatePname(r.pname);
  if (r.has_price) fields.price = validatePrice(r.price);
  if (r.has_quantity) fields.quantity = validateQuantity(r.quantity);
  if (!Object.keys(fields).length) throw invalid('Nothing to update');
  if (!(await repo.update(r.pid, fields))) throw notFound('Product not found');
  return { pid: r.pid };
}

async function deleteProduct({ pid }) {
  if (!(await repo.remove(pid))) throw notFound('Product not found');
  return { pid };
}

// Order Service dùng để kiểm tra giá + tồn kho (bước 6)
async function getProductsByIds({ pids }) { return { items: await repo.findByPids(pids) }; }

// UC08 / FR09: trừ kho. Nhiều sản phẩm -> nếu 1 sản phẩm lỗi thì hoàn lại các sản phẩm đã trừ (bù trừ)
async function decreaseStock({ items }) {
  const done = [];
  for (const { pid, qty } of items) {
    if (qty <= 0) { await rollback(done); throw invalid('qty must be > 0'); }
    if (await repo.decrease(pid, qty)) { done.push({ pid, qty }); continue; }
    await rollback(done);
    if (!(await repo.findByPid(pid))) throw notFound(`Product ${pid} not found`);
    throw stockConflict(`Insufficient stock for product ${pid}`);
  }
  return { success: true };
}

async function rollback(done) { for (const { pid, qty } of done) await repo.increase(pid, qty); }

async function increaseStock({ items }) {
  for (const { pid, qty } of items) await repo.increase(pid, qty);
  return { success: true };
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductsByIds, decreaseStock, increaseStock };
