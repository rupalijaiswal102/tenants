import express from 'express';
import {
  getLedgerByTenant,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
} from '../controllers/ledger.controller.js';

const router = express.Router();

router.get('/tenant/:tenantId', getLedgerByTenant);
router.post('/entry',           createLedgerEntry);
router.put('/entry/:id',        updateLedgerEntry);   // ← NEW
router.delete('/entry/:id',     deleteLedgerEntry);   // ← NEW

export default router;
