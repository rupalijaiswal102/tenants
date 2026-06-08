import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join('/tmp', 'tenant_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, uploadDir); },
  filename:    (_req, file,  cb) => { cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`); }
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and images allowed'));
  }
});
