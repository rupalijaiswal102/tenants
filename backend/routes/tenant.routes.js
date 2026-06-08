import express from 'express';
import {
  getTenants, createTenant, getTenantById,
  updateTenant, deleteTenant, getTenantDetails,
  getNextTenantCode
} from '../controllers/tenant.controller.js';
import { upload } from '../middleware/multer.js';

const router = express.Router();

const tenantUpload = (req, res, next) => {
  upload.single('agreementFile')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `File upload error: ${err.message}` });
    next();
  });
};

// ── IMPORTANT: specific routes before /:id ──
router.get('/next-code', getNextTenantCode);  // ← GET /api/tenants/next-code

router.get('/',              getTenants);
router.post('/',             tenantUpload, createTenant);
router.get('/:id',           getTenantById);
router.get('/:id/details',   getTenantDetails);
router.put('/:id',           tenantUpload, updateTenant);
router.delete('/:id',        deleteTenant);

export default router;
