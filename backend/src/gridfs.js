import { v2 as cloudinary } from 'cloudinary';
import { existsSync, unlinkSync } from 'fs';

const cleanup = (filePath) => {
  try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}
};

export const uploadToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const isPDF = file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');

      cloudinary.uploader.upload(file.path, {
        folder: 'tenants/agreements',
        resource_type: isPDF ? 'raw' : 'image',
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.[^/.]+$/, '')}`,
      }, (err, result) => {
        cleanup(file.path);
        if (err) return reject(new Error(err.message));
        if (!result?.secure_url) return reject(new Error('No URL returned from Cloudinary'));
        console.log(`Cloudinary upload success: ${result.secure_url}`);
        resolve(result.secure_url);
      });

    } catch (err) {
      cleanup(file.path);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};

export const deleteFromGridFS = async (fileUrl) => {
  try {
    if (!fileUrl?.includes('cloudinary.com')) return;
    const parts = fileUrl.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return;
    const afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0]?.startsWith('v')) afterUpload.shift();
    const publicId = afterUpload.join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId, {
      resource_type: fileUrl.includes('/raw/') ? 'raw' : 'image'
    });
  } catch (err) {
    console.error('Cloudinary delete error:', err instanceof Error ? err.message : err);
  }
};