
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

if (!admin.apps.length) {
  let credential;

  try {
    const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
    credential = admin.credential.cert(serviceAccount);
  } catch (e) {
    console.error('❌ serviceAccountKey.json not found in backend/config/');
    console.error('   Download it from Firebase Console → Project Settings → Service accounts');
    console.error('   Save it as: backend/config/serviceAccountKey.json');
    process.exit(1);
  }

  admin.initializeApp({
    credential,
    projectId: "luct-repoting-system",
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };