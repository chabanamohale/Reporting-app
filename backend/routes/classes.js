/**
 * Classes Route — aggregates reports into class-level stats
 * GET /api/classes
 */
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/auth');

const pct = (p, g) => (g > 0 ? Math.round((p / g) * 100) : 0);

router.get('/', verifyToken, async (req, res) => {
  try {
    let q = db.collection('reports').orderBy('createdAt','desc');
    if (req.user.role === 'lecturer') {
      q = db.collection('reports')
        .where('lecturerId','==',req.user.uid)
        .orderBy('createdAt','desc');
    }

    const snap    = await q.get();
    const reports = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    // Aggregate by className + courseCode
    const classMap = {};
    reports.forEach(r => {
      const key = `${r.className}__${r.courseCode}`;
      if (!classMap[key]) {
        classMap[key] = {
          className:  r.className   || 'Unknown',
          courseCode: r.courseCode  || '',
          courseName: r.courseName  || '',
          faculty:    r.facultyName || '',
          lecturer:   r.lecturerName|| '',
          sessions:   0,
          totalP:     0,
          totalG:     0,
          lastDate:   r.dateOfLecture || '',
        };
      }
      classMap[key].sessions++;
      classMap[key].totalP += Number(r.studentsPresent    || 0);
      classMap[key].totalG += Number(r.registeredStudents || 0);
    });

    const classes = Object.values(classMap).map(c => ({
      ...c,
      avgAttendance: pct(c.totalP, c.totalG),
    }));

    res.json({ success:true, data:classes });
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
