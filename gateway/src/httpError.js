const { grpc } = require('./shared/grpc');

// Mã lỗi gRPC -> HTTP status (khớp cột "Error Cases" trong API Specification)
const MAP = {
  [grpc.status.INVALID_ARGUMENT]: 400,
  [grpc.status.UNAUTHENTICATED]: 401,
  [grpc.status.PERMISSION_DENIED]: 403,
  [grpc.status.NOT_FOUND]: 404,
  [grpc.status.ALREADY_EXISTS]: 409,
  [grpc.status.FAILED_PRECONDITION]: 409,
  [grpc.status.UNAVAILABLE]: 503,
  [grpc.status.DEADLINE_EXCEEDED]: 503,
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function toHttp(err) {
  if (err instanceof HttpError) return { status: err.status, message: err.message };
  if (typeof err.code === 'number' && MAP[err.code]) {
    const unavailable = MAP[err.code] === 503;
    return { status: MAP[err.code], message: unavailable ? 'Service temporarily unavailable' : (err.details || err.message) };
  }
  return { status: 500, message: 'Internal server error' };
}

// Express 4 không tự bắt lỗi async -> bọc lại
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, toHttp, wrap };
