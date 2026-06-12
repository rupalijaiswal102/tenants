import express from 'express';
import { getCompanies, createCompany, getCompanyById, updateCompany, deleteCompany } from '../controllers/company.controller.js';
import { upload } from '../middleware/multer.js';
import { denyViewer } from './auth.routes.js';

const router = express.Router();

// Accept both logoFile and sealFile in one request
const companyUpload = upload.fields([
  { name: 'logoFile', maxCount: 1 },
  { name: 'sealFile', maxCount: 1 },
]);

router.get('/',       getCompanies);
router.post('/',      denyViewer, companyUpload, createCompany);
router.get('/:id',    getCompanyById);
router.put('/:id',    denyViewer, companyUpload, updateCompany);
router.delete('/:id', denyViewer, deleteCompany);

export default router;
