# E-commerce MVP – Microservices (Node.js, DDD, Database-per-Service)

Backend RESTful API cho hệ thống thương mại điện tử MVP, xây dựng theo tài liệu thiết kế
(Customer Requirement, Bounded Context, ERD, Microservice Architecture, Business Process, API Specification, Use Cases, 25 Test Cases).

## 1. Cấu trúc

```
ecommerce-microservices/
├── gateway/            # API Gateway (REST + Redis): routing, JWT, phân quyền, rate limit, cache, logging
├── services/
│   ├── auth/           # PostgreSQL: users, roles
│   ├── customer/       # PostgreSQL: customers, memberships
│   ├── product/        # MongoDB:    products
│   ├── order/          # PostgreSQL: orders, order_details, outbox_events (+ Kafka producer)
│   └── shipment/       # MongoDB:    shipments, trackings (+ Kafka consumer)
├── proto/              # file .proto dùng chung (hợp đồng gRPC)
├── infra/              # script khởi tạo hạ tầng (tạo topic Kafka)
├── tests/e2e.js        # kiểm thử end-to-end ánh xạ 25 test case
├── docker-compose.yml
├── .env
└── .gitignore
```
Mỗi service chia lớp DDD: `domain/` (luật nghiệp vụ) → `application/` (use case) → `infrastructure/` (DB, Kafka, gRPC client) → `interfaces/` (gRPC handler, Kafka consumer).

## 2. Kiến trúc (đúng sơ đồ thiết kế)

- Client → **API Gateway** bằng REST (HTTPS/JSON). Gateway → các service bằng **gRPC**. Order ↔ Customer, Order ↔ Product cũng bằng gRPC.
- **Redis** chỉ thuộc Gateway: cache token đã verify, cache sản phẩm, rate limiting.
- **Outbox + Kafka**: Order Service ghi `orders`, `order_details`, `outbox_events` trong **một transaction**; tiến trình nền đọc outbox rồi publish `OrderCreated` lên topic `order-created`; Shipment Service consume và tạo Shipment `PENDING`.
- Database-per-Service: 3 PostgreSQL (auth, customer, order) + 2 MongoDB (product, shipment). Không service nào đọc DB của service khác.

## 3. Chạy

```bash
# file .env có sẵn (giá trị dev), docker compose tự đọc, có thể sửa tùy ý
docker compose up -d --build
docker compose ps           # đợi các service Up (lần đầu kéo image Kafka, build khá lâu)
curl localhost:8080/api/health
node tests/e2e.js           # cần Node >= 18 trên máy host
```
Tài khoản mặc định (tạo lúc Auth Service khởi động, chỉ dùng cho dev): `admin / Admin@123` (ADMIN), `staff / Staff@123` (SHIPMENT_STAFF).
Dừng: `docker compose down` (thêm `-v` để xóa dữ liệu).

## 4. Hướng dẫn từng bước và cách kiểm tra

| Bước | Nội dung | Kiểm tra |
|---|---|---|
| 1 | Hạ tầng: 3 Postgres, 2 Mongo, Redis, Kafka, topic | `docker compose ps` → tất cả Up/healthy; `kafka-init` Exited (0) |
| 2 | Auth: đăng ký, đăng nhập, JWT | `curl -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' -d '{"username":"john","password":"P@ss123"}'` → 201 |
| 3 | Customer + Membership | Đăng nhập rồi `GET /api/customers/{uid}` → có `mid`, `membership.score` |
| 4 | Product (Admin CRUD) | Đăng nhập `admin`, `POST /api/products` → 201 |
| 5 | Order: discount, trừ kho, Outbox | `POST /api/orders` → 201, tồn kho giảm; `docker compose exec order-db psql -U postgres order_db -c "select id,status from outbox_events"` |
| 6 | Shipment qua Kafka | `GET /api/orders/{oid}` → `shipment.status = PENDING`; staff/admin `PATCH /api/shipments/{id}/status` |
| 7 | Gateway: rate limit, cache, health | gọi liên tục quá `RATE_LIMIT_MAX` → 429; `/api/health` → 200 |
| 8 | Toàn bộ | `node tests/e2e.js` |

Hai test case cần bắn event thủ công vào Kafka:
```bash
# TC-SHP-02: event thiếu oid -> không tạo Shipment, ghi vào collection failed_events
docker compose exec shipment-service node scripts/publish-test-event.js missing-oid
docker compose exec shipment-db mongosh shipment_db --quiet --eval "db.failed_events.countDocuments()"
# TC-SHP-05: cùng event 2 lần -> chỉ 1 Shipment (kết quả mong đợi: 1)
docker compose exec shipment-service node scripts/publish-test-event.js duplicate
docker compose exec shipment-db mongosh shipment_db --quiet --eval "db.shipments.countDocuments({oid:900001})"
```

## 5. Ánh xạ API Specification

| API ID | Endpoint | Ai gọi được |
|---|---|---|
| API-AUTH-01/02 | `POST /api/auth/register`, `/login` | Public |
| API-CUS-01/02 | `GET/PUT /api/customers/:uid` | Chính chủ hoặc ADMIN (đổi `mid` chỉ ADMIN) |
| API-PRO-01/02 | `GET /api/products`, `/:pid` | Đã đăng nhập |
| API-PRO-03/04/05 | `POST/PUT/DELETE /api/products` | ADMIN |
| API-ORD-01 | `POST /api/orders` | Đã đăng nhập |
| API-ORD-02/03 | `GET /api/orders`, `/:oid` | Chủ đơn; ADMIN xem tất cả |
| API-SHP-01 | `GET /api/shipments/:shipid` | Chủ đơn, ADMIN, SHIPMENT_STAFF |
| API-SHP-02 | `PATCH /api/shipments/:shipid/status` | SHIPMENT_STAFF, ADMIN |
| API-HEALTH-01 | `GET /api/health` | Public |

Lỗi trả dạng `{"message": "..."}` với mã 400/401/403/404/409/429/503 đúng cột "Error Cases".

## 6. Các điểm tài liệu KHÔNG quy định rõ (cần ghi vào báo cáo là giả định)

1. **Công thức giảm giá**: tài liệu chỉ nói "dựa trên score". Đang dùng bậc thang cấu hình được `DISCOUNT_TIERS=0:0,100:5,500:10,1000:15` (score ≥ mốc thì giảm % tương ứng). `Order.discount` lưu **số tiền giảm** (UC07: "discount amount").
2. **Danh sách hạng thành viên**: dữ liệu mẫu Bronze/Silver/Gold/Platinum với score 0/100/500/1000. Khách mới đăng ký nhận hạng có score thấp nhất.
3. **Email, phone khi đăng ký**: API-AUTH-01 có hai trường này nhưng ERD bảng User không có. Đã thêm cột `email` (UNIQUE), `phone` vào bảng `users` của Auth và để **tùy chọn** (TC-IAM-01 chỉ cần username + password).
4. **Tạo Customer**: không có API tạo Customer. Gateway gọi `CreateCustomer` (gRPC) ngay sau khi Auth đăng ký thành công, `fullname` mặc định = username. Nếu bước này lỗi, tài khoản đã được tạo nhưng chưa có hồ sơ Customer (chưa có cơ chế bù trừ).
5. **Admin / Shipment Staff**: không có API đăng ký cho hai vai trò này nên được seed từ biến môi trường.
6. **Phản hồi `POST /api/orders`**: spec mẫu có `shipment.shipid`, nhưng Shipment tạo bất đồng bộ (sơ đồ + ghi chú API) nên lúc trả về chưa có `shipid`. Response trả `shipment: {status: "PENDING"}`; `shipid` xem ở `GET /api/orders/:oid`. Có thêm `subtotal`, `total_amount` (sơ đồ luồng chính có `total_amount`).
7. **`GET /api/customers/:uid`** trả thêm `membership {mid, mname, score}` để đáp ứng TC-CUS-04.
8. **Shipment lưu thêm `uid`** (lấy từ event OrderCreated) để kiểm tra quyền xem; ERD chỉ có `shipid, oid, status`. Trạng thái hợp lệ: PENDING, SHIPPING, DELIVERED, CANCELLED, chưa ràng buộc thứ tự chuyển.
9. **Validation tự đặt**: password ≥ 6 ký tự. Chỉ ADMIN được đổi `mid` qua `PUT /api/customers/:uid` (khách đổi `mid` bị 403) để khách không tự nâng hạng nhằm được giảm giá nhiều hơn; khách vẫn tự sửa `fullname` được.
10. **Chưa có**: pagination, refresh token, thu hồi token, HTTPS, Kafka health trong `/api/health`.

## 7. Đã kiểm chứng gì, chưa kiểm chứng gì

Đã chạy thật bằng `docker compose up -d --build` (3 PostgreSQL, 2 MongoDB, Redis, Kafka, 5 service, gateway): `node tests/e2e.js` → 40/40 PASS. Hai case Kafka chạy tay đều đạt: TC-SHP-02 (event thiếu oid → ghi vào `failed_events`) và TC-SHP-05 (cùng event 2 lần → chỉ 1 Shipment). Đã kiểm tra khách đổi `mid` bị 403, khách sửa `fullname` được 200. Unit test (discount, validator, shipment status) chạy bằng `node --test`.
