const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const uploadRouter = require('./routes/upload');

const app = express();

// DB connect
if (String(process.env.DISABLE_DB || 'false').toLowerCase() !== 'true') {
  db.connect();
} else {
  console.warn('[db] disabled via DISABLE_DB');
}

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
if (String(process.env.DISABLE_AUTH || 'false').toLowerCase() !== 'true') {
  app.use('/api/auth', authRouter);
} else {
  console.warn('[route] /api/auth disabled via DISABLE_AUTH');
}
if (String(process.env.DISABLE_CHAT || 'false').toLowerCase() !== 'true') {
  app.use('/api/chat', chatRouter);
} else {
  console.warn('[route] /api/chat disabled via DISABLE_CHAT');
}
if (String(process.env.ENABLE_UPLOAD || 'false').toLowerCase() === 'true') {
  app.use('/api/upload', uploadRouter);
}

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
