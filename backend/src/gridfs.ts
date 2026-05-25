import { v2 as cloudinary } from 'cloudinary';
import { existsSync, unlinkSync } from 'fs';

interface UploadedFile {
  path:         string;
  originalname: string;
  mimetype:     string;
}

const cleanup = (filePath: string) => {
  try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}
};

export const uploadToGridFS = (file: UploadedFile): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const isPDF        = file.mimetype === 'application/pdf' ||
                           file.originalname.toLowerCase().endsWith('.pdf');
      const resourceType = isPDF ? 'raw' : 'image';

      cloudinary.uploader.upload(file.path, {
        folder:        'tenants/agreements',
        resource_type: resourceType,
        public_id:     `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/\.[^/.]+$/, '')}`,
        use_filename:  true,
        overwrite:     false,
      }, (err, result) => {
        cleanup(file.path);
        if (err)               return reject(new Error(err.message));
        if (!result?.secure_url) return reject(new Error('No URL returned'));
        console.log(`✅ Cloudinary upload: ${result.secure_url}`);
        resolve(result.secure_url);
      });

    } catch (err: unknown) {
      cleanup(file.path);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};

export const deleteFromGridFS = async (fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl?.includes('cloudinary.com')) return;
    const parts     = fileUrl.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return;
    const afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0]?.startsWith('v')) afterUpload.shift();
    const publicId = afterUpload.join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId, {
      resource_type: fileUrl.includes('/raw/') ? 'raw' : 'image'
    });
  } catch (err: unknown) {
    console.error('Cloudinary delete error:', err instanceof Error ? err.message : err);
  }
};
