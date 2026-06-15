export async function uploadInvoicePDFToSlack({ pdfBase64, invoiceNo, partyName, totalInvoice, billDate }) {
  const BOT_TOKEN  = process.env.SLACK_BOT_TOKEN;
  const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!BOT_TOKEN || !CHANNEL_ID) {
    console.log('[SlackFiles] BOT_TOKEN or CHANNEL_ID not set, skipping PDF upload');
    return;
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const filename  = `Invoice_${invoiceNo}.pdf`;

    console.log('[SlackFiles] Buffer size:', pdfBuffer.length, 'filename:', filename);

    // Step 1 — Get upload URL (form-encoded — Slack Web API standard)
    const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${BOT_TOKEN}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ filename, length: String(pdfBuffer.length) }),
    });
    const urlJson = await urlRes.json();
    console.log('[SlackFiles] getUploadURL response:', JSON.stringify(urlJson));
    const { ok: urlOk, upload_url, file_id, error: urlErr } = urlJson;
    if (!urlOk) { console.error('[SlackFiles] getUploadURL failed:', urlErr); return; }

    // Step 2 — Upload the PDF bytes
    const uploadRes = await fetch(upload_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body:    pdfBuffer,
    });
    console.log('[SlackFiles] Upload status:', uploadRes.status);

    // Step 3 — Complete upload and post to channel
    const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${BOT_TOKEN}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        files:           JSON.stringify([{ id: file_id, title: `Invoice ${invoiceNo}` }]),
        channel_id:      CHANNEL_ID,
        initial_comment: `📎 Invoice *#${invoiceNo}* | ${partyName || '-'} | Rs. ${Math.round(totalInvoice || 0).toLocaleString('en-IN')} | ${billDate}`,
      }),
    });
    const completeJson = await completeRes.json();
    console.log('[SlackFiles] Complete response:', JSON.stringify(completeJson));
    const { ok, error } = completeJson;
    console.log('[SlackFiles] Upload result:', ok ? 'success' : error);
  } catch (err) {
    console.error('[SlackFiles] Upload error:', err.message);
  }
}
