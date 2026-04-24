/**
 * Reports Routes
 * POST   /api/reports                              → Lecturer submits
 * GET    /api/reports                              → Get reports (role-filtered)
 * GET    /api/reports/registered/:courseCode       → Auto-fill registered students
 * PUT    /api/reports/:id                          → Update / add feedback
 * DELETE /api/reports/:id                          → Delete
 */
const express        = require('express');
const router         = express.Router();
const { db }         = require('../config/firebaseAdmin');
const { verifyToken, requireRole } = require('../middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

// POST /api/reports  — Lecturer submits a report (all 15 fields)
router.post('/', verifyToken, requireRole('lecturer'), async (req, res) => {
  try {
    const required = [
      'facultyName','className','weekOfReporting','dateOfLecture',
      'courseName','courseCode','lecturerName',
      'studentsPresent','registeredStudents',
      'venue','scheduledTime','topicTaught','learningOutcomes',
    ];
    const missing = required.filter(k => !req.body[k] && req.body[k] !== 0);
    if (missing.length) {
      return res.status(400).json({ success:false, message:`Missing fields: ${missing.join(', ')}` });
    }

    const data = {
      facultyName:        req.body.facultyName,
      className:          req.body.className,
      weekOfReporting:    req.body.weekOfReporting,
      dateOfLecture:      req.body.dateOfLecture,
      courseName:         req.body.courseName,
      courseCode:         req.body.courseCode,
      lecturerName:       req.body.lecturerName || req.user.name,
      lecturerId:         req.user.uid,
      studentsPresent:    Number(req.body.studentsPresent),
      registeredStudents: Number(req.body.registeredStudents),
      venue:              req.body.venue,
      scheduledTime:      req.body.scheduledTime,
      topicTaught:        req.body.topicTaught,
      learningOutcomes:   req.body.learningOutcomes,
      recommendations:    req.body.recommendations || '',
      status:    'submitted',
      feedback:  '',
      feedbackBy:'',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('reports').add(data);
    res.status(201).json({ success:true, message:'Report saved', data:{ id:ref.id } });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/reports — Lecturer sees own; PRL/PL see all
router.get('/', verifyToken, async (req, res) => {
  try {
    let q = db.collection('reports').orderBy('createdAt', 'desc');
    if (req.user.role === 'lecturer') {
      q = db.collection('reports')
        .where('lecturerId', '==', req.user.uid)
        .orderBy('createdAt', 'desc');
    }
    if (req.query.status) {
      q = q.where('status', '==', req.query.status);
    }
    const snap = await q.get();
    const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    res.json({ success:true, data });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/reports/registered/:courseCode — auto-fill registered students
router.get('/registered/:courseCode', verifyToken, requireRole('lecturer'), async (req, res) => {
  try {
    const snap = await db.collection('reports')
      .where('lecturerId', '==', req.user.uid)
      .where('courseCode', '==', req.params.courseCode)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return res.json({ success:true, data:null });
    res.json({ success:true, data:{ registeredStudents: snap.docs[0].data().registeredStudents }});
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// PUT /api/reports/:id — Lecturer edits own; PRL/PL add feedback
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('reports').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success:false, message:'Report not found' });

    let updates = { updatedAt: FieldValue.serverTimestamp() };

    if (req.user.role === 'prl' || req.user.role === 'pl') {
      if (!req.body.feedback) {
        return res.status(400).json({ success:false, message:'Feedback text is required' });
      }
      updates.feedback   = req.body.feedback;
      updates.feedbackBy = req.user.name;
      updates.feedbackAt = FieldValue.serverTimestamp();
      updates.status     = 'reviewed';
    } else if (req.user.role === 'lecturer') {
      if (doc.data().lecturerId !== req.user.uid) {
        return res.status(403).json({ success:false, message:'Cannot edit another lecturer\'s report' });
      }
      const allowed = ['facultyName','className','weekOfReporting','dateOfLecture',
        'courseName','courseCode','studentsPresent','registeredStudents',
        'venue','scheduledTime','topicTaught','learningOutcomes','recommendations'];
      allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    } else {
      return res.status(403).json({ success:false, message:'Access denied' });
    }

    await db.collection('reports').doc(req.params.id).update(updates);
    res.json({ success:true, message:'Updated' });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('reports').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success:false, message:'Not found' });
    if (req.user.role === 'lecturer' && doc.data().lecturerId !== req.user.uid) {
      return res.status(403).json({ success:false, message:'Access denied' });
    }
    await db.collection('reports').doc(req.params.id).delete();
    res.json({ success:true, message:'Deleted' });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
