import { Router } from 'express';
import { uploadInvoicePDFToSlack } from '../src/slackFiles.js';

const router = Router();

router.post('/upload-pdf', async (req, res) => {
  const { pdfBase64, invoiceNo, partyName, totalInvoice, billDate } = req.body;
  if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 required' });

  // Non-blocking upload
  uploadInvoicePDFToSlack({ pdfBase64, invoiceNo, partyName, totalInvoice, billDate })
    .catch(err => console.error('[SlackFiles] route error:', err.message));

  res.json({ ok: true });
});

export default router;
