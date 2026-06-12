import express from 'express';
import { getInvoices, createInvoice, getInvoiceById, updateInvoice, deleteInvoice, getInvoicesByTenant, getNextInvoiceNo,approveInvoice } from '../controllers/invoice.controller.js';
import { denyViewer } from './auth.routes.js';

const router = express.Router();

router.get('/', getInvoices);
router.get('/tenant/:tenantId', getInvoicesByTenant);
router.post('/',       denyViewer, createInvoice);
router.get('/next-no', getNextInvoiceNo);
router.get('/:id',     getInvoiceById);
router.put('/:id',     denyViewer, updateInvoice);
router.delete('/:id',  denyViewer, deleteInvoice);

// ── Approve Invoice (Digital Signature) ─────────────────────────────────────
router.post('/:id/approve', denyViewer, approveInvoice);

export default router;
