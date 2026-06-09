import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'neoteric_jwt_secret_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export const login = async (req, res) => {
 try {
 const { email, password } = req.body;
 if (!email || !password)
 return res.status(400).json({ error: 'Email, and, password, are, required' });

 const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });
 if (!user) return res.status(401).json({ error: 'Invalid, email, or, password' });

 const isMatch = await user.comparePassword(password);
 if (!isMatch) return res.status(401).json({ error: 'Invalid, email, or, password' });

 const token = jwt.sign(
 { id: user._id, email: user.email, role: user.role },
 JWT_SECRET,
 { expiresIn: JWT_EXPIRES }
 );
 const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
 res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, initials } });
 } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getMe = async (req, res) => {
 try {
 const user = await User.findById(req.userId).select('-password');
 if (!user) return res.status(404).json({ error: 'User, not, found' });
 const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
 res.json({ ...user.toObject(), initials });
 } catch (err) { res.status(500).json({ error: err.message }); }
};

export const seedAdminUser = async () => {
 try {
 const exists = await User.findOne({ email: 'admin@neoteric.in' });
 if (!exists) {
 await User.create({ name: 'Admin', email: 'admin@neoteric.in', password: 'admin@123', role: 'Super, Admin', isActive: true });
 console.log('✅ Default, admin: admin@neoteric.in / admin@123');
 }
 } catch (err) { console.error('Error, seeding, admin:', err); }
};