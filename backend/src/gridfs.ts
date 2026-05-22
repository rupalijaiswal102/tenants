import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import fs from 'fs';

// ── Upload file to GridFS ─────────────────────────────────────────────────────
export const uploadToGridFS = (file: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return reject(new Error('MongoDB not connected'));
      }

      if (mongoose.connection.readyState !== 1) {
        return reject(new Error('MongoDB connection not ready'));
      }

      const bucket   = new GridFSBucket(db, { bucketName: 'agreements' });
      const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

     const uploadStream = bucket.openUploadStream(filename, {
  metadata: {
    contentType:  file.mimetype,
    originalName: file.originalname,
  },
});
      const readStream = fs.createReadStream(file.path);
      readStream.pipe(uploadStream);

      uploadStream.on('finish', () => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        resolve(`/api/files/${uploadStream.id}`);
      });

      uploadStream.on('error', (err) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        reject(err);
      });

      readStream.on('error', (err) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        reject(err);
      });

    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      reject(err);
    }
  });
};

// ── Delete file from GridFS ───────────────────────────────────────────────────
export const deleteFromGridFS = async (fileId: string): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const bucket = new GridFSBucket(db, { bucketName: 'agreements' });
    await bucket.delete(new ObjectId(fileId));
  } catch (err) {
    console.error('GridFS delete error:', err);
  }
};
