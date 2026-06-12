import express from 'express';
import {
  getOtherParties, getNextOtherPartyCode, getOtherPartyById,
  getOtherPartyDetails, createOtherParty, updateOtherParty, deleteOtherParty,
} from '../controllers/otherParty.controller.js';
import { upload } from '../middleware/multer.js';
import { denyViewer } from './auth.routes.js';

const router = express.Router();

const partyUpload = (req, res, next) => {
  upload.single('agreementFile')(req, res, (err) => {
    if (err) return res.status(400).json({ error: `File upload error: ${err.message}` });
    next();
  });
};

router.get('/next-code',    getNextOtherPartyCode);
router.get('/',             getOtherParties);
router.post('/',            denyViewer, partyUpload, createOtherParty);
router.get('/:id',          getOtherPartyById);
router.get('/:id/details',  getOtherPartyDetails);
router.put('/:id',          denyViewer, partyUpload, updateOtherParty);
router.delete('/:id',       denyViewer, deleteOtherParty);

export default router;
