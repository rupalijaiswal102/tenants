import express from 'express';
import { getCompanies, createCompany, getCompanyById, updateCompany, deleteCompany } from '../controllers/company.controller';
import { upload } from '../middleware/multer';

const router = express.Router();

// Accept both logoFile and sealFile in one request
const companyUpload = upload.fields([
  { name: 'logoFile', maxCount: 1 },
  { name: 'sealFile', maxCount: 1 },
]);

router.get('/',     getCompanies);
router.post('/',    companyUpload, createCompany);
router.get('/:id',  getCompanyById);
router.put('/:id',  companyUpload, updateCompany);
router.delete('/:id', deleteCompany);

export default router;
