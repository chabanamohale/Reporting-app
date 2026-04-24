/**
 * Ratings Routes
 * POST /api/ratings               → Submit a rating
 * GET  /api/ratings               → All ratings
 * GET  /api/ratings/target/:uid   → Ratings for a specific lecturer
 * GET  /api/ratings/my            → Ratings I submitted
 */
const express        = require('express');
const router         = express.Router();
const { db }         = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

router.post('/', verifyToken, async (req, res) => {
  try {
    const { targetId, targetName, score, category, comment } = req.body;
    if (!targetId || !score || !category) {
      return res.status(400).json({ success:false, message:'targetId, score and category are required' });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ success:false, message:'score must be between 1 and 5' });
    }
    const ref = await db.collection('ratings').add({
      targetId,
      targetName:      targetName      || '',
      score:           Number(score),
      category,
      comment:         comment         || '',
      submittedBy:     req.user.uid,
      submittedByName: req.user.name,
      submitterRole:   req.user.role,
      submittedAt:     FieldValue.serverTimestamp(),
    });
    res.status(201).json({ success:true, data:{ id:ref.id } });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.get('/target/:uid', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('ratings')
      .where('targetId', '==', req.params.uid)
      .orderBy('submittedAt', 'desc').get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('ratings')
      .where('submittedBy', '==', req.user.uid)
      .orderBy('submittedAt', 'desc').get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('ratings').orderBy('submittedAt','desc').get();
    res.json({ success:true, data: snap.docs.map(d => ({ id:d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
