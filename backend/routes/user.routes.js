import express from 'express';
import { getUsers, createUser, updateUser, deleteUser, resetPassword, getRoles } from '../controllers/user.controller.js';
import { authMiddleware } from './auth.routes.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/',           getUsers);
router.get('/roles',      getRoles);
router.post('/',          createUser);
router.put('/:id',        updateUser);
router.delete('/:id',     deleteUser);
router.post('/:id/reset-password', resetPassword);

export default router;