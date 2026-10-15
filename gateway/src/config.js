module.exports = {
  port: parseInt(process.env.PORT || '8080', 10),
  addr: {
    auth: process.env.AUTH_ADDR || 'localhost:50051',
    customer: process.env.CUSTOMER_ADDR || 'localhost:50052',
    product: process.env.PRODUCT_ADDR || 'localhost:50053',
    order: process.env.ORDER_ADDR || 'localhost:50054',
    shipment: process.env.SHIPMENT_ADDR || 'localhost:50055',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),          // số request tối đa
    windowSec: parseInt(process.env.RATE_LIMIT_WINDOW_SEC || '60', 10), // trong mỗi cửa sổ (giây)
  },
  cacheTtlSec: parseInt(process.env.CACHE_TTL_SEC || '30', 10),       // cache danh sách / chi tiết sản phẩm
  tokenCacheMaxSec: 60,                                               // cache kết quả verify JWT tối đa 60s
};
