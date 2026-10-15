const { MongoClient } = require('mongodb');
const { sleep } = require('../shared/grpc');

const client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 3000 });
let db;

async function connect(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await client.connect();
      db = client.db(process.env.MONGO_DB || 'shipment_db');
      await db.command({ ping: 1 });
      // unique oid -> chống tạo Shipment trùng khi nhận cùng event 2 lần (TC-SHP-05)
      await db.collection('shipments').createIndex({ oid: 1 }, { unique: true });
      await db.collection('shipments').createIndex({ shipid: 1 }, { unique: true });
      await db.collection('trackings').createIndex({ shipid: 1, at: 1 });
      return;
    } catch (e) { console.log(`[shipment] waiting for MongoDB (${i}/${retries})...`); await sleep(2000); }
  }
  throw new Error('Cannot connect to MongoDB');
}

const getDb = () => db;
module.exports = { connect, getDb };
