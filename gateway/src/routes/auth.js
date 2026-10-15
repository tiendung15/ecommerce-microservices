const router = require('express').Router();
const { rpc } = require('../grpcClients');
const { wrap } = require('../httpError');
const { str, bodyObject } = require('../validate');

// API-AUTH-01: đăng ký (public)
router.post('/register', wrap(async (req, res) => {
  const b = bodyObject(req);
  const { uid } = await rpc('auth', 'Register', {
    username: str(b.username), password: str(b.password), email: str(b.email), phone: str(b.phone),
  });
  // Tạo hồ sơ Customer (hạng thành viên mặc định) cho tài khoản mới ở Customer Service
  await rpc('customer', 'CreateCustomer', { uid, fullname: str(b.username).trim() });
  res.status(201).json({ message: 'User registered successfully', uid });
}));

// API-AUTH-02: đăng nhập (public)
router.post('/login', wrap(async (req, res) => {
  const b = bodyObject(req);
  const r = await rpc('auth', 'Login', { username: str(b.username), password: str(b.password) });
  res.status(200).json({ accessToken: r.access_token, tokenType: r.token_type, expiresIn: r.expires_in });
}));

module.exports = router;
