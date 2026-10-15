const { redis } = require('../redis');
const config = require('../config');

// Rate limiting dùng Redis (fixed window): INCR key theo IP, key tự hết hạn sau windowSec.
module.exports = async function rateLimit(req, res, next) {
  const { max, windowSec } = config.rateLimit;
  try {
    const key = `ratelimit:${req.ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    const ttl = await redis.ttl(key);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    if (count > max) {
      res.set('Retry-After', String(Math.max(ttl, 1)));
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }
  } catch (e) { /* Redis lỗi -> bỏ qua giới hạn, không chặn người dùng */ }
  next();
};
