const crypto = require('crypto');
const { rpc } = require('../grpcClients');
const { cache } = require('../redis');
const config = require('../config');
const { HttpError, wrap } = require('../httpError');

// Authentication: Bearer JWT -> Auth Service xác thực (VerifyToken). Kết quả được cache trong Redis để giảm tải.
// 401 khi thiếu / sai / hết hạn token. Gắn req.user = { uid, role }.
module.exports = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Missing or invalid token');

  const key = `token:${crypto.createHash('sha256').update(token).digest('hex')}`;
  let user = await cache.get(key);
  if (!user) {
    const v = await rpc('auth', 'VerifyToken', { token }); // lỗi UNAUTHENTICATED -> 401
    user = { uid: v.uid, role: v.role };
    const ttl = Math.min(config.tokenCacheMaxSec, v.exp - Math.floor(Date.now() / 1000));
    if (ttl > 0) await cache.set(key, user, ttl);
  }
  req.user = user;
  next();
});
