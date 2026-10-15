const repo = require('../infrastructure/customerRepository');
const { validateFullname } = require('../domain/validators');
const { invalid, notFound } = require('../shared/errors');

const toDto = (row) => ({
  uid: row.uid, fullname: row.fullname, mid: row.mid,
  membership: { mid: row.mid, mname: row.mname, score: row.score },
});

// Gateway gọi sau khi Auth đăng ký thành công. Idempotent: gọi lại không tạo trùng.
async function createCustomer({ uid, fullname }) {
  if (!Number.isInteger(uid) || uid <= 0) throw invalid('uid is invalid');
  const name = validateFullname(fullname);
  const def = await repo.getDefaultMembership();
  if (!def) throw invalid('No membership configured');
  await repo.insertCustomer(uid, name, def.mid);
  return toDto(await repo.findCustomer(uid));
}

// API-CUS-01
async function getCustomer({ uid }) {
  const row = await repo.findCustomer(uid);
  if (!row) throw notFound('Customer not found');
  return toDto(row);
}

// API-CUS-02
async function updateCustomer({ uid, has_fullname, fullname, has_mid, mid }) {
  if (!has_fullname && !has_mid) throw invalid('Nothing to update: provide fullname and/or mid');
  const changes = {};
  if (has_fullname) changes.fullname = validateFullname(fullname);
  if (has_mid) {
    if (!(await repo.getMembership(mid))) throw invalid('mid does not exist');
    changes.mid = mid;
  }
  if (!(await repo.updateCustomer(uid, changes))) throw notFound('Customer not found');
  return { uid };
}

// Order Service gọi để lấy score (bước 4 trong sơ đồ luồng đặt hàng)
async function getMembership({ mid }) {
  const m = await repo.getMembership(mid);
  if (!m) throw notFound('Membership not found');
  return m;
}

module.exports = { createCustomer, getCustomer, updateCustomer, getMembership };
