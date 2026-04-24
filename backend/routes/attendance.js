
const express        = require('express');
const router         = express.Router();
const { db }         = require('../config/firebaseAdmin');
const { verifyToken, requireRole } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

// POST /api/attendance/bulk
router.post('/bulk', verifyToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success:false, message:'records array required' });
    }
    const batch = db.batch();
    records.forEach(r => {
      const ref = db.collection('attendance').doc();
      batch.set(ref, {
        studentId:    r.studentId,
        studentName:  r.studentName,
        courseCode:   r.courseCode,
        date:         r.date,
        present:      Boolean(r.present),
        markedBy:     req.user.uid,
        markedByName: req.user.name,
        markedAt:     FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    res.status(201).json({ success:true, message:`${records.length} records saved` });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/attendance/my  — student's own attendance
router.get('/my', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const snap = await db.collection('attendance')
      .where('studentId', '==', req.user.uid)
      .orderBy('markedAt', 'desc')
      .get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/attendance  — all attendance, optionally filtered
router.get('/', verifyToken, async (req, res) => {
  try {
    let q = db.collection('attendance').orderBy('markedAt', 'desc');
    if (req.query.courseCode) q = q.where('courseCode', '==', req.query.courseCode);
    if (req.query.studentId)  q = q.where('studentId',  '==', req.query.studentId);
    const snap = await q.get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
