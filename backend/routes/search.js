/**
 * Search Route
 * GET /api/search?q=query&type=reports|courses|users|attendance|ratings
 */
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/auth');

function matches(obj, q) {
  const lower = q.toLowerCase();
  return Object.values(obj).some(v => typeof v === 'string' && v.toLowerCase().includes(lower));
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success:false, message:'Search query must be at least 2 characters' });
    }

    const role    = req.user.role;
    const uid     = req.user.uid;
    const results = {};

    // Reports
    if (!type || type === 'reports') {
      let ref = db.collection('reports');
      if (role === 'lecturer') ref = ref.where('lecturerId','==',uid);
      const snap = await ref.get();
      results.reports = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(r => matches({
          courseName:      r.courseName,
          courseCode:      r.courseCode,
          topicTaught:     r.topicTaught,
          lecturerName:    r.lecturerName,
          className:       r.className,
          weekOfReporting: r.weekOfReporting,
          venue:           r.venue,
        }, q));
    }

    // Courses
    if (!type || type === 'courses') {
      const snap = await db.collection('courses').get();
      results.courses = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(c => matches({ name:c.name, code:c.code, faculty:c.faculty, assignedLecturerName:c.assignedLecturerName||'' }, q));
    }

    // Users (PRL/PL only)
    if ((!type || type === 'users') && (role === 'pl' || role === 'prl')) {
      const snap = await db.collection('users').get();
      results.users = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(u => matches({ name:u.name, email:u.email, staffId:u.staffId||'', studentId:u.studentId||'', department:u.department||'' }, q));
    }

    // Attendance
    if (!type || type === 'attendance') {
      let ref = db.collection('attendance');
      if (role === 'student') ref = ref.where('studentId','==',uid);
      const snap = await ref.get();
      results.attendance = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(a => matches({ studentName:a.studentName, courseCode:a.courseCode, date:a.date }, q));
    }

    // Ratings
    if (!type || type === 'ratings') {
      const snap = await db.collection('ratings').get();
      results.ratings = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(r => matches({ targetName:r.targetName, submittedByName:r.submittedByName, category:r.category, comment:r.comment||'' }, q));
    }

    const total = Object.values(results).reduce((s,v) => s+(v?.length||0), 0);
    res.json({ success:true, query:q, totalFound:total, data:results });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
