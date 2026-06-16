import express from 'express';
import {
  getTenants, createTenant, getTenantById,
  updateTenant, deleteTenant, getTenantDetails,
  getNextTenantCode,
  uploadElectricityBill, deleteElectricityBill,
} from '../controllers/tenant.controller.js';
import { upload } from '../middleware/multer.js';
import { denyViewer } from './auth.routes.js';

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
router.post('/',             denyViewer, tenantUpload, createTenant);
router.get('/:id',           getTenantById);
router.get('/:id/details',   getTenantDetails);
router.put('/:id',           denyViewer, tenantUpload, updateTenant);
router.delete('/:id',        denyViewer, deleteTenant);

const ebUpload = (req, res, next) => {
  upload.single('billFile')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `File upload error: ${err.message}` });
    next();
  });
};
router.post('/:id/electricity-bills',        denyViewer, ebUpload, uploadElectricityBill);
router.delete('/:id/electricity-bills/:index', denyViewer, deleteElectricityBill);

export default router;
