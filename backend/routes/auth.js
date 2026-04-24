const express    = require('express');
const router     = express.Router();
const { db, auth } = require('../config/firebaseAdmin');
const { verifyToken, requireRole } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

router.post('/register', async (req, res) => {
  try {
    const { uid, email, name, role, faculty, department, staffId, studentId } = req.body;
    if (!uid)  return res.status(400).json({ success: false, message: 'Missing uid' });
    if (!name) return res.status(400).json({ success: false, message: 'Missing name' });
    if (!role) return res.status(400).json({ success: false, message: 'Missing role' });
    const profile = {
      uid, email: email || '', name, role,
      faculty: faculty || '', department: department || '',
      staffId: staffId || '', studentId: studentId || '',
      createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).set(profile, { merge: true });
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ success: false, message: 'idToken required' });
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const snap    = await db.collection('users').doc(decoded.uid).get();
    if (!snap.exists) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: snap.data() });
  } catch (err) {
    const expired = err.code === 'auth/id-token-expired';
    res.status(401).json({
      success: false,
      code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: err.message,
    });
  }
});

router.get('/profile', verifyToken, (req, res) => {
  res.json({ success: true, data: req.user });
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    ['name', 'faculty', 'department', 'staffId', 'studentId'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    await db.collection('users').doc(req.user.uid).update(updates);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', verifyToken, requireRole('pl', 'prl'), async (req, res) => {
  try {
    let ref = db.collection('users');
    if (req.query.role) ref = ref.where('role', '==', req.query.role);
    const snap = await ref.get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;