const mongoose = require('mongoose');

let isConnected = false;

async function connect() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI not set. App will run without DB.');
    return;
  }
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
    isConnected = true;
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] connection error', err.message);
  }
}

module.exports = { connect };
