const { getDb } = require('./db');

const shipments = () => getDb().collection('shipments');
const trackings = () => getDb().collection('trackings');
const view = (d) => (d ? { shipid: d.shipid, oid: d.oid, status: d.status } : null);

async function nextShipid() {
  const r = await getDb().collection('counters').findOneAndUpdate(
    { _id: 'shipid' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return r.seq;
}

// Idempotent: oid đã có Shipment thì bỏ qua. Trả về { created, shipment }
async function createIfAbsent({ oid, uid }) {
  const existing = await shipments().findOne({ oid });
  if (existing) return { created: false, shipment: existing };
  const doc = { shipid: await nextShipid(), oid, uid, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() };
  try {
    await shipments().insertOne(doc);
  } catch (e) {
    if (e.code === 11000) return { created: false, shipment: await shipments().findOne({ oid }) }; // 2 event song song
    throw e;
  }
  await trackings().insertOne({ shipid: doc.shipid, status: 'PENDING', at: new Date() });
  return { created: true, shipment: doc };
}

const findByShipid = (shipid) => shipments().findOne({ shipid });
const findByOid = (oid) => shipments().findOne({ oid });

async function updateStatus(shipid, status) {
  const r = await shipments().findOneAndUpdate(
    { shipid }, { $set: { status, updatedAt: new Date() } }, { returnDocument: 'after' });
  if (r) await trackings().insertOne({ shipid, status, at: new Date() });
  return r;
}

// TC-SHP-02: ghi nhận event lỗi
const logFailedEvent = (reason, raw) => getDb().collection('failed_events').insertOne({ reason, raw, at: new Date() });

module.exports = { createIfAbsent, findByShipid, findByOid, updateStatus, logFailedEvent, view };
