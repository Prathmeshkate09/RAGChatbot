const { initFirebase } = require('../config/firebase');
const User = require('../models/User');

const admin = initFirebase();

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null; // allow session-only mode
    return next();
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null };
    // Ensure user exists in DB
    if (req.user.email) {
      await User.findOneAndUpdate(
        { uid: req.user.uid },
        { $setOnInsert: { email: req.user.email, name: req.user.name || '', createdAt: new Date() } },
        { upsert: true, new: true }
      );
    }
    return next();
  } catch (e) {
    // Invalid token -> treat as anonymous session
    req.user = null;
    return next();
  }
}

module.exports = { verifyFirebaseToken };
