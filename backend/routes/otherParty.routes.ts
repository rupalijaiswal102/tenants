import express from 'express';
import {
  getOtherParties, getNextOtherPartyCode, getOtherPartyById,
  getOtherPartyDetails, createOtherParty, updateOtherParty, deleteOtherParty,
} from '../controllers/otherParty.controller';
import { upload } from '../middleware/multer';

const router = express.Router();

const partyUpload = (req: any, res: any, next: any) => {
  upload.single('agreementFile')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `File upload error: ${err.message}` });
    next();
  });
};

router.get('/next-code',    getNextOtherPartyCode);
router.get('/',             getOtherParties);
router.post('/',            partyUpload, createOtherParty);
router.get('/:id',          getOtherPartyById);
router.get('/:id/details',  getOtherPartyDetails);
router.put('/:id',          partyUpload, updateOtherParty);
router.delete('/:id',       deleteOtherParty);

export default router;
