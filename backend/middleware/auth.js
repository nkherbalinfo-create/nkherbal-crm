const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid' });
  }
};

// Guest users can read but not write
const readOnly = (req, res, next) => {
  if (req.user?.role === 'guest') {
    return res.status(403).json({ message: 'View-only access — changes are disabled in guest mode' });
  }
  next();
};

module.exports = { protect, readOnly };
