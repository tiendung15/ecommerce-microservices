const { getDb } = require('./db');

const col = () => getDb().collection('products');
const strip = (d) => (d ? { pid: d.pid, pname: d.pname, price: d.price, quantity: d.quantity } : null);

// pid kiểu INT theo ERD -> tự tăng bằng collection counters
async function nextPid() {
  const r = await getDb().collection('counters').findOneAndUpdate(
    { _id: 'pid' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return r.seq;
}

async function list() { return (await col().find({}).sort({ pid: 1 }).toArray()).map(strip); }
async function findByPid(pid) { return strip(await col().findOne({ pid })); }
async function findByPids(pids) { return (await col().find({ pid: { $in: pids } }).toArray()).map(strip); }

async function create({ pname, price, quantity }) {
  const pid = await nextPid();
  await col().insertOne({ pid, pname, price, quantity });
  return { pid, pname, price, quantity };
}

async function update(pid, fields) {
  const r = await col().updateOne({ pid }, { $set: fields });
  return r.matchedCount > 0;
}

async function remove(pid) {
  const r = await col().deleteOne({ pid });
  return r.deletedCount > 0;
}

// Trừ kho nguyên tử cho từng sản phẩm: điều kiện quantity >= qty nằm ngay trong câu update
// nên 2 đơn đặt cùng lúc không thể làm tồn kho âm.
async function decrease(pid, qty) {
  const r = await col().updateOne({ pid, quantity: { $gte: qty } }, { $inc: { quantity: -qty } });
  return r.modifiedCount > 0;
}
async function increase(pid, qty) {
  const r = await col().updateOne({ pid }, { $inc: { quantity: qty } });
  return r.matchedCount > 0;
}

module.exports = { list, findByPid, findByPids, create, update, remove, decrease, increase };
