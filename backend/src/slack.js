const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-GB'); }
  catch { return String(d || ''); }
};

const fmtAmt = (n) =>
  `Rs. ${Math.round(n || 0).toLocaleString('en-IN')}.00`;

export async function notifyInvoiceCreated(invoice) {
  // Read at call-time so dotenv has already loaded them
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  const N8N_WEBHOOK_URL   = process.env.N8N_WEBHOOK_URL;

  console.log('[Slack] notifyInvoiceCreated called for invoice:', invoice.invoiceNo);
  console.log('[Slack] SLACK_WEBHOOK_URL set:', !!SLACK_WEBHOOK_URL);
  console.log('[Slack] N8N_WEBHOOK_URL set:', !!N8N_WEBHOOK_URL);

  const promises = [];

  // ── Direct Slack (Incoming Webhook) ───────────────────────────────────────
  if (SLACK_WEBHOOK_URL) {
    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🧾 New Invoice Generated', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Tenant / Party:*\n${invoice.partyName || '-'}` },
            { type: 'mrkdwn', text: `*Invoice No:*\n${invoice.invoiceNo || '-'}` },
            { type: 'mrkdwn', text: `*Total Amount:*\n${fmtAmt(invoice.totalInvoice)}` },
            { type: 'mrkdwn', text: `*Date:*\n${fmtDate(invoice.billDate)}` },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Company: *${invoice.company || '-'}*  |  Status: *${invoice.paymentStatus || 'Pending'}*`,
            },
          ],
        },
        { type: 'divider' },
      ],
    };
    promises.push(
      fetch(SLACK_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
        .then(async r => {
          const text = await r.text();
          console.log('[Slack] Direct response:', r.status, text);
        })
        .catch(err => console.error('[Slack] Direct fetch error:', err.message))
    );
  }

  // ── n8n Webhook ──────────────────────────────────────────────────────────
  if (N8N_WEBHOOK_URL) {
    const body = {
      partyName:     invoice.partyName     || '-',
      invoiceNo:     invoice.invoiceNo     || '-',
      totalInvoice:  invoice.totalInvoice  || 0,
      billDate:      fmtDate(invoice.billDate),
      company:       invoice.company       || '-',
      paymentStatus: invoice.paymentStatus || 'Pending',
    };
    promises.push(
      fetch(N8N_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
        .then(async r => {
          const text = await r.text();
          console.log('[n8n] Webhook response:', r.status, text);
        })
        .catch(err => console.error('[n8n] Webhook error:', err.message))
    );
  }

  await Promise.allSettled(promises);
}
