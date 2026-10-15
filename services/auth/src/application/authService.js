const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const repo = require('../infrastructure/userRepository');
const { validateRegister, validateLogin } = require('../domain/validators');
const { conflict, unauthenticated } = require('../shared/errors');

const ROLES = { ADMIN: 'ADMIN', CUSTOMER: 'CUSTOMER', SHIPMENT_STAFF: 'SHIPMENT_STAFF' };
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || '3600', 10);

// FR01 / UC01: đăng ký -> mật khẩu băm bằng bcrypt (theo ghi chú API-AUTH-01)
async function register(req) {
  const data = validateRegister(req);
  const roleid = await repo.ensureRole(ROLES.CUSTOMER);
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    const uid = await repo.createUser({ ...data, passwordHash, roleid });
    return { uid };
  } catch (e) {
    if (e.code === '23505') { // vi phạm UNIQUE
      throw conflict(e.constraint && e.constraint.includes('email') ? 'Email already exists' : 'Username already exists');
    }
    throw e;
  }
}

// FR02 / UC02: đăng nhập -> JWT chứa sub và role (theo ghi chú API-AUTH-02)
async function login(req) {
  const { username, password } = validateLogin(req);
  const user = await repo.findByUsername(username);
  // Cùng một thông báo cho "sai username" và "sai password" để không lộ tài khoản có tồn tại hay không
  if (!user || !(await bcrypt.compare(password, user.password))) throw unauthenticated('Invalid username or password');
  const token = jwt.sign({ sub: String(user.uid), role: user.rolename }, JWT_SECRET, { expiresIn: EXPIRES_IN });
  return { access_token: token, token_type: 'Bearer', expires_in: EXPIRES_IN };
}

// Gateway gọi để xác thực JWT (bước 2 trong sơ đồ luồng đặt hàng)
async function verifyToken({ token }) {
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return { uid: Number(p.sub), role: p.role, exp: p.exp };
  } catch (e) {
    throw unauthenticated('Invalid or expired token');
  }
}

// Tạo sẵn tài khoản Admin / Shipment Staff từ biến môi trường (API không có endpoint đăng ký cho 2 vai trò này)
async function seed() {
  const ids = {};
  for (const r of Object.values(ROLES)) ids[r] = await repo.ensureRole(r);
  const accounts = [
    [process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD, ROLES.ADMIN],
    [process.env.STAFF_USERNAME, process.env.STAFF_PASSWORD, ROLES.SHIPMENT_STAFF],
  ];
  for (const [username, password, role] of accounts) {
    if (!username || !password) continue;
    if (await repo.findByUsername(username)) continue;
    await repo.createUser({ username, passwordHash: await bcrypt.hash(password, 10), roleid: ids[role], email: null, phone: null });
    console.log(`[auth] seeded ${role} account "${username}"`);
  }
}

module.exports = { register, login, verifyToken, seed };
