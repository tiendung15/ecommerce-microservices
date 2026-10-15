const router = require('express').Router();
const { rpc } = require('../grpcClients');
const { cache } = require('../redis');
const config = require('../config');
const authorize = require('../middleware/authorize');
const { wrap, HttpError } = require('../httpError');
const { isInt, intParam, bodyObject } = require('../validate');

const PREFIX = 'cache:products';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const dto = (p) => ({ pid: p.pid, pname: p.pname, price: p.price, quantity: p.quantity });
const invalidate = () => cache.delByPrefix(PREFIX);

function checkFields(b, requireAll) {
  if (requireAll || b.pname !== undefined) if (typeof b.pname !== 'string') throw new HttpError(400, 'pname must be a string');
  if (requireAll || b.price !== undefined) if (!isNum(b.price)) throw new HttpError(400, 'price must be a number');
  if (requireAll || b.quantity !== undefined) if (!isInt(b.quantity)) throw new HttpError(400, 'quantity must be an integer');
}

// API-PRO-01 (cache Redis)
router.get('/', wrap(async (req, res) => {
  const key = `${PREFIX}:list`;
  let data = await cache.get(key);
  if (!data) {
    const r = await rpc('product', 'ListProducts', {});
    data = { items: r.items.map(dto) };
    await cache.set(key, data, config.cacheTtlSec);
  }
  res.json(data);
}));

// API-PRO-02 (cache Redis)
router.get('/:pid', wrap(async (req, res) => {
  const pid = intParam(req.params.pid, 'pid');
  const key = `${PREFIX}:${pid}`;
  let data = await cache.get(key);
  if (!data) {
    data = dto(await rpc('product', 'GetProduct', { pid }));
    await cache.set(key, data, config.cacheTtlSec);
  }
  res.json(data);
}));

// API-PRO-03 (Admin)
router.post('/', authorize('ADMIN'), wrap(async (req, res) => {
  const b = bodyObject(req);
  checkFields(b, true);
  const p = await rpc('product', 'CreateProduct', { pname: b.pname, price: b.price, quantity: b.quantity });
  await invalidate();
  res.status(201).json(dto(p));
}));

// API-PRO-04 (Admin)
router.put('/:pid', authorize('ADMIN'), wrap(async (req, res) => {
  const pid = intParam(req.params.pid, 'pid');
  const b = bodyObject(req);
  checkFields(b, false);
  const r = await rpc('product', 'UpdateProduct', {
    pid,
    has_pname: b.pname !== undefined, pname: b.pname || '',
    has_price: b.price !== undefined, price: b.price || 0,
    has_quantity: b.quantity !== undefined, quantity: b.quantity || 0,
  });
  await invalidate();
  res.json({ message: 'Product updated successfully', pid: r.pid });
}));

// API-PRO-05 (Admin)
router.delete('/:pid', authorize('ADMIN'), wrap(async (req, res) => {
  const pid = intParam(req.params.pid, 'pid');
  const r = await rpc('product', 'DeleteProduct', { pid });
  await invalidate();
  res.json({ message: 'Product deleted successfully', pid: r.pid });
}));

module.exports = { router, invalidate };
