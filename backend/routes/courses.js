/**
 * Courses Routes
 * POST   /api/courses           → PL creates course
 * GET    /api/courses           → All authenticated users view
 * PUT    /api/courses/:id       → PL updates / assigns lecturer
 * DELETE /api/courses/:id       → PL deletes
 */
const express        = require('express');
const router         = express.Router();
const { db }         = require('../config/firebaseAdmin');
const { verifyToken, requireRole } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

router.post('/', verifyToken, requireRole('pl'), async (req, res) => {
  try {
    const { name, code, faculty, credits, description, schedule, venue } = req.body;
    if (!name || !code || !faculty) {
      return res.status(400).json({ success:false, message:'name, code and faculty are required' });
    }
    const ref = await db.collection('courses').add({
      name, code, faculty,
      credits:     Number(credits) || 3,
      description: description || '',
      schedule:    schedule    || '',
      venue:       venue       || '',
      assignedLecturerId:   '',
      assignedLecturerName: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json({ success:true, data:{ id:ref.id } });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('courses').orderBy('createdAt','desc').get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.put('/:id', verifyToken, requireRole('pl','prl'), async (req, res) => {
  try {
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    ['name','code','faculty','credits','description','schedule','venue',
     'assignedLecturerId','assignedLecturerName'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    await db.collection('courses').doc(req.params.id).update(updates);
    res.json({ success:true, message:'Course updated' });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.delete('/:id', verifyToken, requireRole('pl'), async (req, res) => {
  try {
    await db.collection('courses').doc(req.params.id).delete();
    res.json({ success:true, message:'Deleted' });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
