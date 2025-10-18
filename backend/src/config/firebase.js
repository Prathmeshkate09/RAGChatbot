const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      return admin;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      initialized = true;
      return admin;
    }
  } catch (e) {
    console.warn('[firebase] init warning:', e.message);
  }

  // Fallback: initialize without credentials (token verification will fail)
  try {
    admin.initializeApp();
    initialized = true;
  } catch (e) {
    console.warn('[firebase] unable to initialize admin:', e.message);
  }
  return admin;
}

module.exports = { initFirebase };
