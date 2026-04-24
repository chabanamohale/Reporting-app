/**
 * Excel Export Routes
 * GET /api/excel/reports      → Download reports as .xlsx
 * GET /api/excel/attendance   → Download attendance as .xlsx
 * GET /api/excel/ratings      → Download ratings as .xlsx
 * GET /api/excel/courses      → Download courses list as .xlsx
 */
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/auth');
const XLSX    = require('xlsx');

const pct = (p, g) => (g > 0 ? Math.round((p / g) * 100) : 0);

function sendExcel(res, rows, sheetName, fileName) {
  const ws  = XLSX.utils.json_to_sheet(rows);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType:'xlsx', type:'buffer' });
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}_${new Date().toISOString().slice(0,10)}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

// GET /api/excel/reports
router.get('/reports', verifyToken, async (req, res) => {
  try {
    let q = db.collection('reports').orderBy('createdAt','desc');
    if (req.user.role === 'lecturer') q = q.where('lecturerId','==',req.user.uid);
    const snap = await q.get();
    const rows = snap.docs.map(d => {
      const r = d.data();
      return {
        'Faculty Name':        r.facultyName         || '',
        'Class Name':          r.className            || '',
        'Week of Reporting':   r.weekOfReporting      || '',
        'Date of Lecture':     r.dateOfLecture        || '',
        'Course Name':         r.courseName           || '',
        'Course Code':         r.courseCode           || '',
        "Lecturer's Name":     r.lecturerName         || '',
        'Students Present':    r.studentsPresent      || 0,
        'Registered Students': r.registeredStudents   || 0,
        'Attendance %':        `${pct(r.studentsPresent, r.registeredStudents)}%`,
        'Venue':               r.venue                || '',
        'Scheduled Time':      r.scheduledTime        || '',
        'Topic Taught':        r.topicTaught          || '',
        'Learning Outcomes':   r.learningOutcomes     || '',
        'Recommendations':     r.recommendations      || '',
        'Status':              r.status               || '',
        'Feedback':            r.feedback             || '',
        'Feedback By':         r.feedbackBy           || '',
      };
    });
    sendExcel(res, rows, 'Lecture Reports', 'LUCT_Reports');
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/excel/attendance
router.get('/attendance', verifyToken, async (req, res) => {
  try {
    let q = db.collection('attendance').orderBy('markedAt','desc');
    if (req.user.role === 'student') q = q.where('studentId','==',req.user.uid);
    const snap = await q.get();
    const rows = snap.docs.map(d => {
      const a = d.data();
      return {
        'Student Name': a.studentName   || '',
        'Student ID':   a.studentId     || '',
        'Course Code':  a.courseCode    || '',
        'Date':         a.date          || '',
        'Status':       a.present ? 'Present' : 'Absent',
        'Marked By':    a.markedByName  || '',
      };
    });
    sendExcel(res, rows, 'Attendance', 'LUCT_Attendance');
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/excel/ratings
router.get('/ratings', verifyToken, async (req, res) => {
  try {
    let q = db.collection('ratings').orderBy('submittedAt','desc');
    if (req.user.role === 'lecturer') q = q.where('targetId','==',req.user.uid);
    const snap = await q.get();
    const rows = snap.docs.map(d => {
      const r = d.data();
      return {
        'Target Name':    r.targetName      || '',
        'Submitted By':   r.submittedByName || '',
        'Role':           r.submitterRole   || '',
        'Category':       r.category        || '',
        'Score':          r.score           || 0,
        'Comment':        r.comment         || '',
      };
    });
    sendExcel(res, rows, 'Ratings', 'LUCT_Ratings');
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

// GET /api/excel/courses
router.get('/courses', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('courses').orderBy('createdAt','desc').get();
    const rows = snap.docs.map(d => {
      const c = d.data();
      return {
        'Course Code':     c.code                   || '',
        'Course Name':     c.name                   || '',
        'Faculty':         c.faculty                || '',
        'Credits':         c.credits                || 3,
        'Schedule':        c.schedule               || '',
        'Venue':           c.venue                  || '',
        'Assigned Lecturer':c.assignedLecturerName  || 'Unassigned',
        'Description':     c.description            || '',
      };
    });
    sendExcel(res, rows, 'Courses', 'LUCT_Courses');
  } catch (err) {
    res.status(500).json({ success:false, message:err.message });
  }
});

module.exports = router;
