const { MongoClient } = require('mongodb');
const { sleep } = require('../shared/grpc');

const client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 3000 });
let db;

async function connect(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await client.connect();
      db = client.db(process.env.MONGO_DB || 'product_db');
      await db.command({ ping: 1 });
      await db.collection('products').createIndex({ pid: 1 }, { unique: true });
      return;
    } catch (e) { console.log(`[product] waiting for MongoDB (${i}/${retries})...`); await sleep(2000); }
  }
  throw new Error('Cannot connect to MongoDB');
}

const getDb = () => db;
module.exports = { connect, getDb };
