// Kiểm thử end-to-end qua API Gateway, ánh xạ trực tiếp với "25 Test Cases" trong tài liệu thiết kế.
// Chạy:  node tests/e2e.js            (Node >= 18, hệ thống đã chạy bằng docker compose up)
// Biến môi trường tùy chọn: BASE_URL (mặc định http://localhost:8080), ADMIN_USERNAME, ADMIN_PASSWORD
// Hai test case cần bắn event thủ công vào Kafka (TC-SHP-02, TC-SHP-05) được hướng dẫn trong README.
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN = { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'Admin@123' };

let pass = 0, fail = 0;
const failures = [];
function check(id, desc, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${id.padEnd(10)} ${desc}`); }
  else { fail++; failures.push(id); console.log(`  FAIL  ${id.padEnd(10)} ${desc} ${extra}`); }
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch (e) { /* không có body */ }
  return { status: res.status, json };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const section = (t) => console.log(`\n== ${t}`);

(async () => {
  const stamp = Date.now();
  const user = { username: `user${stamp}`, password: 'P@ss123', email: `user${stamp}@example.com`, phone: '0900000000' };

  section('System');
  let r = await api('GET', '/api/health');
  check('HEALTH-01', 'GET /api/health -> 200 UP', r.status === 200 && r.json.status === 'UP', JSON.stringify(r.json));

  section('Identity & Access');
  r = await api('POST', '/api/auth/register', user);
  check('TC-IAM-01', 'Đăng ký hợp lệ -> 201', r.status === 201 && Number.isInteger(r.json.uid), JSON.stringify(r));
  const uid = r.json && r.json.uid;
  r = await api('POST', '/api/auth/register', { username: user.username, password: 'P@ss123' });
  check('TC-IAM-02', 'Đăng ký username đã tồn tại -> 409', r.status === 409, `got ${r.status}`);
  r = await api('POST', '/api/auth/register', { username: `nopass${stamp}`, password: '' });
  check('TC-IAM-03', 'Đăng ký thiếu password -> 400', r.status === 400, `got ${r.status}`);
  r = await api('POST', '/api/auth/login', { username: user.username, password: user.password });
  const token = r.json && r.json.accessToken;
  check('TC-IAM-04', 'Đăng nhập đúng -> 200 + JWT', r.status === 200 && !!token && r.json.tokenType === 'Bearer' && r.json.expiresIn === 3600, JSON.stringify(r));
  r = await api('POST', '/api/auth/login', { username: user.username, password: 'wrong-password' });
  check('TC-IAM-05', 'Đăng nhập sai password -> 401', r.status === 401, `got ${r.status}`);

  r = await api('POST', '/api/auth/login', ADMIN);
  const adminToken = r.json && r.json.accessToken;
  check('SETUP', 'Đăng nhập tài khoản Admin (seed)', !!adminToken, JSON.stringify(r));
  if (!token || !adminToken) { console.log('\nKhông có token, dừng test.'); process.exit(1); }

  section('Product');
  r = await api('POST', '/api/products', { pname: 'Laptop', price: 100, quantity: 10 }, adminToken);
  const pid = r.json && r.json.pid;
  check('TC-PRO-04', 'Admin tạo Product -> 201', r.status === 201 && Number.isInteger(pid), JSON.stringify(r));
  r = await api('POST', '/api/products', { pname: 'Hack', price: 1, quantity: 1 }, token);
  check('AUTHZ-01', 'Customer tạo Product -> 403', r.status === 403, `got ${r.status}`);
  r = await api('GET', '/api/products', undefined, token);
  check('TC-PRO-01', 'Lấy danh sách Product -> 200', r.status === 200 && Array.isArray(r.json.items) && r.json.items.some((p) => p.pid === pid), JSON.stringify(r));
  r = await api('GET', `/api/products/${pid}`, undefined, token);
  check('TC-PRO-02', 'Lấy Product tồn tại -> 200', r.status === 200 && r.json.pid === pid && r.json.quantity === 10, JSON.stringify(r));
  r = await api('GET', '/api/products/99999999', undefined, token);
  check('TC-PRO-03', 'Lấy Product không tồn tại -> 404', r.status === 404, `got ${r.status}`);
  r = await api('PUT', `/api/products/${pid}`, { quantity: 20 }, adminToken);
  let r2 = await api('GET', `/api/products/${pid}`, undefined, token);
  check('TC-PRO-05', 'Cập nhật tồn kho -> quantity = 20', r.status === 200 && r2.json.quantity === 20, JSON.stringify(r2));
  r = await api('POST', '/api/products', { pname: 'Bad', price: -5, quantity: 1 }, adminToken);
  check('PRO-400', 'Tạo Product price âm -> 400', r.status === 400, `got ${r.status}`);

  section('Customer & Membership');
  r = await api('GET', `/api/customers/${uid}`, undefined, token);
  check('TC-CUS-01', 'Lấy Customer tồn tại -> 200', r.status === 200 && r.json.uid === uid && 'fullname' in r.json && 'mid' in r.json, JSON.stringify(r));
  r = await api('GET', '/api/customers/99999999', undefined, adminToken);
  check('TC-CUS-02', 'Lấy Customer không tồn tại -> 404', r.status === 404, `got ${r.status}`);
  r = await api('PUT', `/api/customers/${uid}`, { fullname: 'John Smith' }, token);
  r2 = await api('GET', `/api/customers/${uid}`, undefined, token);
  check('TC-CUS-03', 'Cập nhật fullname', r.status === 200 && r2.json.fullname === 'John Smith', JSON.stringify(r2));
  check('TC-CUS-04', 'Customer có mid -> trả mname và score', r2.json.membership && typeof r2.json.membership.mname === 'string' && Number.isInteger(r2.json.membership.score), JSON.stringify(r2.json));
  r = await api('GET', `/api/customers/${uid}`);
  check('TC-CUS-05', 'Không có token -> 401', r.status === 401, `got ${r.status}`);
  r = await api('GET', '/api/customers/1', undefined, token);
  check('AUTHZ-02', 'Customer xem hồ sơ người khác -> 403', uid === 1 ? true : r.status === 403, `got ${r.status}`);

  section('Order');
  r = await api('POST', '/api/orders', { items: [{ pid, qty: 1 }] });
  check('TC-ORD-02', 'Tạo Order không có JWT -> 401', r.status === 401, `got ${r.status}`);
  r = await api('POST', '/api/orders', { items: [{ pid, qty: 9999 }] }, token);
  check('TC-ORD-03', 'Đặt vượt tồn kho -> 409, không tạo Order', r.status === 409, `got ${r.status}`);
  r2 = await api('GET', `/api/products/${pid}`, undefined, token);
  check('TC-ORD-03b', 'Tồn kho không đổi sau đơn bị từ chối', r2.json.quantity === 20, JSON.stringify(r2.json));
  r = await api('POST', '/api/orders', { items: [{ pid: 99999999, qty: 1 }] }, token);
  check('ORD-404', 'Đặt sản phẩm không tồn tại -> 404', r.status === 404, `got ${r.status}`);
  r = await api('POST', '/api/orders', { items: [] }, token);
  check('ORD-400', 'Đặt hàng items rỗng -> 400', r.status === 400, `got ${r.status}`);

  r = await api('POST', '/api/orders', { items: [{ pid, qty: 2 }] }, token);
  const oid = r.json && r.json.oid;
  check('TC-ORD-01', 'Tạo Order hợp lệ -> 201 + OrderDetail (unit_price lấy từ Product)',
    r.status === 201 && Number.isInteger(oid) && r.json.uid === uid && r.json.items[0].qty === 2 && r.json.items[0].unit_price === 100, JSON.stringify(r));
  check('TC-ORD-04a', 'Hạng mặc định (score 0) -> discount 0', r.json && r.json.discount === 0, JSON.stringify(r.json));
  r2 = await api('GET', `/api/products/${pid}`, undefined, token);
  check('FR09', 'Tồn kho giảm sau khi đặt (20 -> 18)', r2.json.quantity === 18, JSON.stringify(r2.json));

  // Nâng hạng lên mid=3 (Gold, score 500). Với DISCOUNT_TIERS mặc định (GIẢ ĐỊNH) -> 10% của 200 = 20
  await api('PUT', `/api/customers/${uid}`, { mid: 3 }, adminToken);
  r = await api('POST', '/api/orders', { items: [{ pid, qty: 2 }] }, token);
  check('TC-ORD-04b', 'Customer có score 500 -> discount theo chính sách (200 x 10% = 20)', r.status === 201 && r.json.discount === 20 && r.json.total_amount === 180, JSON.stringify(r.json));

  r = await api('GET', '/api/orders', undefined, token);
  check('API-ORD-02', 'Liệt kê đơn của tôi -> có 2 đơn', r.status === 200 && r.json.items.length === 2, JSON.stringify(r.json));
  r = await api('GET', `/api/orders/${oid}`, undefined, adminToken);
  check('API-ORD-03', 'Admin xem được đơn của khách -> 200', r.status === 200 && r.json.oid === oid, JSON.stringify(r.json));
  r = await api('GET', '/api/orders/99999999', undefined, token);
  check('API-ORD-03b', 'Đơn không tồn tại -> 404', r.status === 404, `got ${r.status}`);

  section('Order -> Kafka -> Shipment (bất đồng bộ)');
  let shipment = null;
  for (let i = 0; i < 30 && !shipment; i++) {
    r = await api('GET', `/api/orders/${oid}`, undefined, token);
    shipment = r.json && r.json.shipment;
    if (!shipment) await sleep(1000);
  }
  check('TC-ORD-05', 'Order lưu + OrderCreated được phát qua Outbox/Kafka', !!shipment, 'Shipment chưa xuất hiện sau 30s');
  check('TC-SHP-01', 'Shipment được tạo (PENDING) khi nhận OrderCreated', !!shipment && shipment.status === 'PENDING' && Number.isInteger(shipment.shipid), JSON.stringify(shipment));
  if (shipment) {
    const shipid = shipment.shipid;
    r = await api('GET', `/api/shipments/${shipid}`, undefined, token);
    check('API-SHP-01', 'Chủ đơn xem Shipment -> 200', r.status === 200 && r.json.oid === oid && r.json.status === 'PENDING', JSON.stringify(r.json));
    r = await api('PATCH', `/api/shipments/${shipid}/status`, { status: 'SHIPPING' }, token);
    check('AUTHZ-03', 'Customer cập nhật Shipment -> 403', r.status === 403, `got ${r.status}`);
    r = await api('PATCH', `/api/shipments/${shipid}/status`, { status: 'SHIPPING' }, adminToken);
    check('TC-SHP-03', 'Cập nhật status = SHIPPING -> 200', r.status === 200 && r.json.status === 'SHIPPING', JSON.stringify(r.json));
    r = await api('PATCH', `/api/shipments/${shipid}/status`, { status: 'FLYING' }, adminToken);
    check('SHP-400', 'Status không hợp lệ -> 400', r.status === 400, `got ${r.status}`);
    r = await api('GET', `/api/orders/${oid}`, undefined, token);
    check('FR12', 'Khách thấy trạng thái giao hàng mới (SHIPPING) trong đơn', r.json.shipment && r.json.shipment.status === 'SHIPPING', JSON.stringify(r.json.shipment));
  }
  r = await api('PATCH', '/api/shipments/99999999/status', { status: 'SHIPPING' }, adminToken);
  check('TC-SHP-04', 'Cập nhật Shipment không tồn tại -> 404', r.status === 404, `got ${r.status}`);

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL${fail ? '  -> ' + failures.join(', ') : ''}`);
  console.log('Chưa kiểm tra tự động (cần bắn event Kafka thủ công, xem README): TC-SHP-02, TC-SHP-05');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('E2E crashed:', e); process.exit(1); });
