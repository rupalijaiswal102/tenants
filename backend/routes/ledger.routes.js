import express from 'express';
import {
  getLedgerByTenant,
  getLedgerByOtherParty,
  getAllTenantsOutstandingDues,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
} from '../controllers/ledger.controller.js';

const router = express.Router();

router.get('/outstanding-dues',           getAllTenantsOutstandingDues);
router.get('/tenant/:tenantId',           getLedgerByTenant);
router.get('/other-party/:otherPartyId',  getLedgerByOtherParty);
router.post('/entry',           createLedgerEntry);
router.put('/entry/:id',        updateLedgerEntry);   // ← NEW
router.delete('/entry/:id',     deleteLedgerEntry);   // ← NEW

export default router;
