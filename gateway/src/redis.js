const Redis = require('ioredis');
const config = require('./config');

// Redis chỉ phục vụ Cache + Rate limiting. Redis lỗi thì gateway vẫn chạy (bỏ qua cache / không giới hạn tốc độ).
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
let lastLog = 0;
redis.on('error', (e) => {
  if (Date.now() - lastLog > 10000) { console.error('[gateway] Redis error:', e.message); lastLog = Date.now(); }
});

const cache = {
  async get(key) {
    try { const v = await redis.get(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  },
  async set(key, value, ttlSec) {
    try { await redis.set(key, JSON.stringify(value), 'EX', ttlSec); } catch (e) { /* bỏ qua */ }
  },
  async delByPrefix(prefix) {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== '0');
    } catch (e) { /* bỏ qua */ }
  },
};

module.exports = { redis, cache };
