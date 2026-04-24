const { auth, db } = require('../config/firebaseAdmin');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = await auth.verifyIdToken(header.split('Bearer ')[1]);
    const snap    = await db.collection('users').doc(decoded.uid).get();
    req.user = snap.exists
      ? { uid: decoded.uid, ...snap.data() }
      : { uid: decoded.uid, email: decoded.email || '', name: '', role: '' };
    next();
  } catch (err) {
    const expired = err.code === 'auth/id-token-expired';
    res.status(401).json({
      success: false,
      code:    expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: expired ? 'Session expired. Please log in again.' : 'Invalid token: ' + err.message,
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your role: ' + req.user.role,
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };