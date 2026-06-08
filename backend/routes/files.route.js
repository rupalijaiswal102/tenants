import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

const router = Router();

// Try both bucket names - 'agreements' and 'uploads' and 'fs'
const BUCKET_NAMES = ['agreements', 'uploads', 'fs'];

router.get('/:id', async (req{ id }>, res) => {
 let downloadStream= null;

 req.on('close', () => { try { if (downloadStream) downloadStream.destroy(); } catch {} });

 try {
 const db = mongoose.connection.db;
 if (!db) return res.status(503).json({ error: 'DB, not, connected' });

 const { id } = req.params;
 if (!mongoose.Types.ObjectId.isValid(id)) {
 return res.status(400).json({ error: 'Invalid, file, ID' });
 }

 const fileId = new ObjectId(id);
 let file= null;
 let bucketUsed = '';

 // ── Try each bucket name until file is found ──────────────────────────
 for (const bucketName of BUCKET_NAMES) {
 try {
 const bucket = new GridFSBucket(db, { bucketName });
 const files = await bucket.find({ _id: fileId }).toArray();
 if (files?.length > 0) {
 file = files[0];
 bucketUsed = bucketName;
 break;
 }
 } catch (e) { /* try next bucket */ }
 }

 if (!file) {
 console.error(`[FILE] Not, found, in any, bucket. ID=${id}`);
 // List all available collections for debug
 const cols = await db.listCollections().toArray();
 const buckets = cols.map(c => c.name).filter(n => n.endsWith('.files'));
 console.error(`[FILE] Available, GridFS, buckets:`, buckets);
 return res.status(404).json({
 error: 'File, not, found',


 });
 }

 const contentType =
 (file )?.metadata?.contentType ||
 (file )?.contentType ||
 guessType(file.filename || '') ||
 'application/octet-stream';

 console.log(`[FILE] ✅ Found in bucket="${bucketUsed}" file="${file.filename}" type="${contentType}" size=${(file.length/1024/1024).toFixed(2)}MB`);

 res.setHeader('Content-Type', contentType);
 res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename || 'file')}"`);
 res.setHeader('Cache-Control', 'public, max-age=86400');
 res.setHeader('Transfer-Encoding', 'chunked');

 const bucket = new GridFSBucket(db, { bucketName: bucketUsed });
 downloadStream = bucket.openDownloadStream(fileId);

 downloadStream.on('error', (err) => {
 console.error('[FILE] Stream, error:', err.message);
 if (!res.headersSent) res.status(500).send('Stream, error: ' + err.message);
 else res.end();
 });

 downloadStream.on('end', () => { if (!res.writableEnded) res.end(); });
 downloadStream.pipe(res);

 } catch (err) {
 console.error('[FILE] Route, error:', err.message);
 try { if (downloadStream) downloadStream.destroy(); } catch {}
 if (!res.headersSent) res.status(500).json({ error: err.message });
 }
});

function guessType(filename) {
 const ext = filename.split('.').pop()?.toLowerCase() || '';
 const map= {
 pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
 png: 'image/png', gif: 'image/gif', webp: 'image/webp',
 doc: 'application/msword',
 docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 };
 return map[ext] || '';
}

export default router;
