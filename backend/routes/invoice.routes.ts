import express from 'express';
import { getInvoices, createInvoice, getInvoiceById, updateInvoice, deleteInvoice, getInvoicesByTenant, getNextInvoiceNo } from '../controllers/invoice.controller';

const router = express.Router();

router.get('/', getInvoices);
router.get('/tenant/:tenantId', getInvoicesByTenant);
router.post('/', createInvoice);
router.get('/next-no', getNextInvoiceNo);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

export default router;
