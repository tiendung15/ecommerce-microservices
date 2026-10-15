const repo = require('../infrastructure/shipmentRepository');
const { validateStatus, parseOrderCreated } = require('../domain/shipmentStatus');
const { notFound, forbidden } = require('../shared/errors');

const PRIVILEGED = ['ADMIN', 'SHIPMENT_STAFF'];

// Khách chỉ xem được Shipment của đơn mình; Admin / Shipment Staff xem được tất cả
function assertCanView(shipment, { requester_uid, requester_role }) {
  if (PRIVILEGED.includes(requester_role)) return;
  if (shipment.uid !== requester_uid) throw forbidden('You cannot access this shipment');
}

async function getShipment(req) {
  const s = await repo.findByShipid(req.shipid);
  if (!s) throw notFound('Shipment not found');
  assertCanView(s, req);
  return repo.view(s);
}

async function getShipmentByOrder(req) {
  const s = await repo.findByOid(req.oid);
  if (!s) throw notFound('Shipment not found');
  assertCanView(s, req);
  return repo.view(s);
}

async function updateShipmentStatus({ shipid, status }) {
  validateStatus(status);
  const s = await repo.updateStatus(shipid, status);
  if (!s) throw notFound('Shipment not found');
  return repo.view(s);
}

// Xử lý 1 message OrderCreated từ Kafka (TC-SHP-01, 02, 05). Không ném lỗi với dữ liệu xấu để consumer không kẹt.
async function handleOrderCreated(raw) {
  const parsed = parseOrderCreated(raw);
  if (parsed.error) {
    console.error(`[shipment] invalid OrderCreated event: ${parsed.error}`);
    await repo.logFailedEvent(parsed.error, raw);
    return { ok: false };
  }
  const { created, shipment } = await repo.createIfAbsent(parsed);
  console.log(created
    ? `[shipment] created shipment ${shipment.shipid} for order ${parsed.oid}`
    : `[shipment] duplicate event for order ${parsed.oid} ignored`);
  return { ok: true, created };
}

module.exports = { getShipment, getShipmentByOrder, updateShipmentStatus, handleOrderCreated };
