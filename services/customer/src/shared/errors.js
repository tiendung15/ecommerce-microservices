const grpc = require('@grpc/grpc-js');

// Lỗi nghiệp vụ -> gateway sẽ đổi thành HTTP status tương ứng
class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const invalid = (m) => new AppError(grpc.status.INVALID_ARGUMENT, m);           // 400
const unauthenticated = (m) => new AppError(grpc.status.UNAUTHENTICATED, m);     // 401
const forbidden = (m) => new AppError(grpc.status.PERMISSION_DENIED, m);         // 403
const notFound = (m) => new AppError(grpc.status.NOT_FOUND, m);                  // 404
const conflict = (m) => new AppError(grpc.status.ALREADY_EXISTS, m);             // 409 (trùng dữ liệu)
const stockConflict = (m) => new AppError(grpc.status.FAILED_PRECONDITION, m);   // 409 (hết hàng)

// Bọc handler: bắt lỗi, trả đúng mã gRPC. Lỗi từ service khác (đã có code gRPC) được chuyển tiếp nguyên vẹn.
function handle(fn) {
  return async (call, callback) => {
    try {
      callback(null, await fn(call.request));
    } catch (e) {
      const isGrpcErr = typeof e.code === 'number' && e.code >= 1 && e.code <= 16;
      if (e instanceof AppError) return callback({ code: e.code, message: e.message });
      if (isGrpcErr && e.details) return callback({ code: e.code, message: e.details });
      console.error('[internal error]', e);
      callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
    }
  };
}

module.exports = { AppError, invalid, unauthenticated, forbidden, notFound, conflict, stockConflict, handle };
