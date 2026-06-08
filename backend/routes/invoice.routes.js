import express from 'express';
import { getInvoices, createInvoice, getInvoiceById, updateInvoice, deleteInvoice, getInvoicesByTenant, getNextInvoiceNo,approveInvoice } from '../controllers/invoice.controller.js';

const router = express.Router();

router.get('/', getInvoices);
router.get('/tenant/:tenantId', getInvoicesByTenant);
router.post('/', createInvoice);
router.get('/next-no', getNextInvoiceNo);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

// ── Approve Invoice (Digital Signature) ─────────────────────────────────────
router.post('/:id/approve', approveInvoice);

export default router;
