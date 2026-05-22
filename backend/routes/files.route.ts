import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

const router = Router();

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { id } = req.params;

    // ── Valid ObjectId check ──
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket  = new GridFSBucket(db, { bucketName: 'agreements' });
    const fileId  = new ObjectId(id);

    const files   = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file        = files[0];
    const contentType = (file as any).metadata?.contentType 
                        || 'application/octet-stream';

    res.set('Content-Type',        contentType);
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    res.set('Cache-Control',       'public, max-age=31536000');

    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ error: 'Stream error' });
    });

    downloadStream.pipe(res);

  } catch (err: any) {
    if (!res.headersSent) res.status(400).json({ error: err.message });
  }
});

export default router;