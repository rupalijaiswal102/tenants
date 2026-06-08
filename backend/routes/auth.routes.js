import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { login, getMe } from '../controllers/auth.controller.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'neoteric_jwt_secret_2026';

// ── Auth middleware ──
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.post('/login',   login);
router.get('/me',       authMiddleware, getMe);

export default router;
