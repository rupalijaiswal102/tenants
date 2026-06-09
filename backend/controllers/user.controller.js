import bcrypt from 'bcryptjs';
import { User, ROLES } from '../models/User.js';

// Only Super Admin can manage users
const requireSuperAdmin = (req, res) => {
  if (req.user?.role !== 'Super Admin' && req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Only Admin can manage users' });
    return false;
  }
  return true;
};

// GET all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users.map(u => ({ ...u.toObject(), id: u._id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET roles list (for dropdown)
export const getRoles = async (req, res) => {
  res.json(Object.entries(ROLES).map(([key, val]) => ({
    value: key,
    label: val.label,
    color: val.color,
    bg:    val.bg,
    description: val.description,
    permissions: val.permissions,
  })));
};

// CREATE user
export const createUser = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { name, email, password, role, phone, department } = req.body;

    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (!ROLES[role]) return res.status(400).json({ error: `Invalid role: ${role}` });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({
      name, email, password, role: role || 'Viewer',
      phone: phone || '', department: department || '',
      createdBy: req.user?.name || 'Admin',
      isActive: true,
    });

    const { password: _, ...safeUser } = user.toObject();
    res.status(201).json({ ...safeUser, id: user._id });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// UPDATE user
export const updateUser = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { name, email, role, phone, department, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent self-deactivation
    if (req.user?.id === String(user._id) && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    if (name)       user.name       = name;
    if (email)      user.email      = email.toLowerCase();
    if (role)       user.role       = role;
    if (phone !== undefined)      user.phone       = phone;
    if (department !== undefined) user.department  = department;
    if (isActive !== undefined)   user.isActive    = isActive;
    if (password && password.length >= 6) user.password = password;

    await user.save();
    const { password: _, ...safeUser } = user.toObject();
    res.json({ ...safeUser, id: user._id });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// DELETE user
export const deleteUser = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;

    // Prevent deleting yourself
    if (req.user?.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Soft delete — just deactivate
    user.isActive = false;
    await user.save();
    res.json({ success: true, message: `${user.name} deactivated` });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// RESET password
export const resetPassword = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: `Password reset for ${user.name}` });
  } catch (err) { res.status(400).json({ error: err.message }); }
};