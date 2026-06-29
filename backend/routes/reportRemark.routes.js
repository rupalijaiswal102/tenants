import { Router } from 'express';
import { getRemarks, createRemark, deleteRemark, getRemarkCounts } from '../controllers/reportRemark.controller.js';

const router = Router();
router.post('/counts',  getRemarkCounts);   // must be before /:id
router.get('/',         getRemarks);
router.post('/',        createRemark);
router.delete('/:id',   deleteRemark);
export default router;
