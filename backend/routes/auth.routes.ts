import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { login, getMe } from '../controllers/auth.controller';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'neoteric_jwt_secret_2026';

// ── Auth middleware ──
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    (req as any).userId = decoded.id;
    (req as any).userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.post('/login',   login);
router.get('/me',       authMiddleware, getMe);

export default router;
