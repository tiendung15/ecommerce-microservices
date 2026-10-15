const { HttpError } = require('../httpError');

// Authorization theo role trong JWT (FR13 / UC13): role không đủ quyền -> 403
module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden: insufficient role'));
  next();
};
