import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { login, getMe } from '../controllers/auth.controller.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'neoteric_jwt_secret_2026';

// ── Auth middleware ───────────────────────────────────────────────────────────
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    // ✅ req.user set karo — workflow controller ispe depend karta hai
    req.user = {
      _id:  decoded.id,
      id:   decoded.id,
      name: decoded.name || decoded.email || 'User',
      role: decoded.role || 'Admin',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Viewer block middleware ───────────────────────────────────────────────────
export const denyViewer = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(); // no auth = legacy pass-through
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'Viewer') {
      return res.status(403).json({ error: 'Access denied: View-only account cannot perform this action.' });
    }
  } catch { /* invalid token — let route handle it */ }
  next();
};

router.post('/login', login);
router.get('/me',     authMiddleware, getMe);

export default router;