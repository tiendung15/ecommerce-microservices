const { invalid } = require('../shared/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{6,20}$/;

// API-AUTH-01: username + password bắt buộc; email, phone tùy chọn (TC-IAM-01 chỉ yêu cầu username + password)
function validateRegister({ username, password, email, phone }) {
  username = (username || '').trim();
  if (!username) throw invalid('username is required');
  if (username.length > 50) throw invalid('username must be at most 50 characters');
  if (!password) throw invalid('password is required');
  if (password.length < 6) throw invalid('password must be at least 6 characters');
  if (password.length > 72) throw invalid('password must be at most 72 characters'); // giới hạn của bcrypt
  email = (email || '').trim();
  phone = (phone || '').trim();
  if (email && (!EMAIL_RE.test(email) || email.length > 100)) throw invalid('email is invalid');
  if (phone && !PHONE_RE.test(phone)) throw invalid('phone is invalid');
  return { username, password, email: email || null, phone: phone || null };
}

function validateLogin({ username, password }) {
  if (!username || !password) throw invalid('username and password are required');
  return { username: username.trim(), password };
}

module.exports = { validateRegister, validateLogin };
