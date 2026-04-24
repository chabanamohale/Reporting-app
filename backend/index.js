/**
 * LUCT Faculty System — Backend Server
 * ─────────────────────────────────────
 
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: '*',   // Allow all origins (tighten in production)
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.use(morgan('dev'));

// ── Health check ────────────────────────────────────────────────
app.get('/',         (req, res) => res.json({ message:'LUCT Backend running ✅', status:'OK' }));
app.get('/api/health',(req, res) => res.json({ status:'OK', time:new Date().toISOString() }));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/courses',    require('./routes/courses'));
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/ratings',    require('./routes/ratings'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/search',     require('./routes/search'));
app.use('/api/excel',      require('./routes/excel'));

// ── 404 ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route ${req.method} ${req.path} not found` });
});

// ── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success:false, message:err.message });
});

// ── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;
