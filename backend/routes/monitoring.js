/**
 * Monitoring Routes
 * GET /api/monitoring/overview   → PRL/PL system-wide stats
 * GET /api/monitoring/lecturer   → Lecturer's own stats
 * GET /api/monitoring/student    → Student's own stats
 */
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebaseAdmin');
const { verifyToken, requireRole } = require('../middleware/auth');

const pct = (p, g) => (g > 0 ? Math.round((p / g) * 100) : 0);

// GET /api/monitoring/overview (PRL + PL)
router.get('/overview', verifyToken, requireRole('prl','pl'), async (req, res) => {
  try {
    const [rSnap, cSnap, uSnap] = await Promise.all([
      db.collection('reports').get(),
      db.collection('courses').get(),
      db.collection('users').get(),
    ]);

    const reports   = rSnap.docs.map(d => d.data());
    const users     = uSnap.docs.map(d => d.data());
    const totalP    = reports.reduce((s,r) => s + Number(r.studentsPresent   || 0), 0);
    const totalG    = reports.reduce((s,r) => s + Number(r.registeredStudents|| 0), 0);

    // Weekly breakdown
    const weekly = reports.reduce((acc, r) => {
      const wk = r.weekOfReporting || '?';
      const ex = acc.find(x => x.week === wk);
      if (ex) { ex.p += Number(r.studentsPresent||0); ex.g += Number(r.registeredStudents||0); ex.count++; }
      else acc.push({ week:wk, count:1, p:Number(r.studentsPresent||0), g:Number(r.registeredStudents||0) });
      return acc;
    }, []).map(w => ({ ...w, pct: pct(w.p, w.g) }))
      .sort((a,b) => parseInt(a.week.replace('Week','')) - parseInt(b.week.replace('Week','')));

    res.json({ success:true, data:{
      totalReports:    reports.length,
      totalCourses:    cSnap.size,
      totalLecturers:  users.filter(u => u.role === 'lecturer').length,
      totalStudents:   users.filter(u => u.role === 'student').length,
      avgAttendance:   pct(totalP, totalG),
      reviewed:        reports.filter(r => r.status === 'reviewed').length,
      pending:         reports.filter(r => r.status === 'submitted').length,
      weekly,
    }});
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/monitoring/lecturer
router.get('/lecturer', verifyToken, requireRole('lecturer'), async (req, res) => {
  try {
    const [rSnap, ratSnap] = await Promise.all([
      db.collection('reports').where('lecturerId','==',req.user.uid).get(),
      db.collection('ratings').where('targetId','==',req.user.uid).get(),
    ]);
    const reports = rSnap.docs.map(d => d.data());
    const ratings = ratSnap.docs.map(d => d.data());
    const totalP  = reports.reduce((s,r) => s + Number(r.studentsPresent   ||0), 0);
    const totalG  = reports.reduce((s,r) => s + Number(r.registeredStudents||0), 0);
    const avgRat  = ratings.length
      ? (ratings.reduce((s,r) => s + (r.score||0), 0) / ratings.length).toFixed(1)
      : null;

    const weekly = reports.reduce((acc,r) => {
      const wk = r.weekOfReporting||'?';
      const ex = acc.find(x => x.week===wk);
      if(ex){ex.sessions++;ex.p+=Number(r.studentsPresent||0);ex.g+=Number(r.registeredStudents||0);}
      else acc.push({week:wk,sessions:1,p:Number(r.studentsPresent||0),g:Number(r.registeredStudents||0)});
      return acc;
    },[]).map(w=>({...w,pct:pct(w.p,w.g)}))
      .sort((a,b)=>parseInt(a.week.replace('Week',''))-parseInt(b.week.replace('Week','')));

    res.json({ success:true, data:{
      totalReports:   reports.length,
      avgAttendance:  pct(totalP, totalG),
      avgRating:      avgRat,
      reviewed:       reports.filter(r=>r.status==='reviewed').length,
      pending:        reports.filter(r=>r.status==='submitted').length,
      weekly,
    }});
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/monitoring/student
router.get('/student', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const snap = await db.collection('attendance')
      .where('studentId','==',req.user.uid).get();
    const recs = snap.docs.map(d => d.data());

    const courses = [...new Set(recs.map(r => r.courseCode))].filter(Boolean)
      .map(code => {
        const cr = recs.filter(r => r.courseCode === code);
        const p  = cr.filter(r => r.present).length;
        return { code, total:cr.length, present:p, pct:pct(p,cr.length) };
      });

    res.json({ success:true, data:{
      totalSessions: recs.length,
      present:       recs.filter(r=>r.present).length,
      courses,
    }});
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
