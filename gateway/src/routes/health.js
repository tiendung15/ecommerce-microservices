const router = require('express').Router();
const { rpc } = require('../grpcClients');
const { redis } = require('../redis');

// API-HEALTH-01: kiểm tra Redis + 5 service (mỗi service tự kiểm tra DB của nó). Có phụ thuộc lỗi -> 503
router.get('/', async (req, res) => {
  const deps = {};
  const check = async (name, fn) => { try { await fn(); deps[name] = 'UP'; } catch (e) { deps[name] = 'DOWN'; } };
  await Promise.all([
    check('redis', async () => { if ((await redis.ping()) !== 'PONG') throw new Error('bad ping'); }),
    check('auth-service', () => rpc('auth', 'Health', {}, 2000)),
    check('customer-service', () => rpc('customer', 'Health', {}, 2000)),
    check('product-service', () => rpc('product', 'Health', {}, 2000)),
    check('order-service', () => rpc('order', 'Health', {}, 2000)),
    check('shipment-service', () => rpc('shipment', 'Health', {}, 2000)),
  ]);
  const up = Object.values(deps).every((v) => v === 'UP');
  res.status(up ? 200 : 503).json({
    status: up ? 'UP' : 'DOWN',
    message: up ? 'E-commerce API is running' : 'One or more dependencies are unhealthy',
    dependencies: deps,
  });
});

module.exports = router;
