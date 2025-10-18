const { Router } = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const User = require('../models/User');

const router = Router();

// POST /api/auth/login - verify token and return user profile
router.post('/login', verifyFirebaseToken, async (req, res) => {
  if (!req.user) return res.status(200).json({ user: null });
  const doc = await User.findOne({ uid: req.user.uid }).lean();
  return res.json({ user: doc || { uid: req.user.uid, email: req.user.email, name: req.user.name } });
});

// POST /api/auth/signup - same as login for Firebase-based signup
router.post('/signup', verifyFirebaseToken, async (req, res) => {
  if (!req.user) return res.status(400).json({ error: 'Invalid token' });
  const doc = await User.findOneAndUpdate(
    { uid: req.user.uid },
    { $setOnInsert: { email: req.user.email, name: req.user.name || '', createdAt: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return res.json({ user: doc });
});

module.exports = router;
