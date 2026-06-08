/**
 * One-time migration: GridFS files → Cloudinary
 * Run: npx tsx backend/scripts/migrateFilesToCloudinary.ts
 */
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { v2 } from 'cloudinary';
import * 'fs';
import * 'path';
import * 'os';
import dotenv from 'dotenv';
dotenv.config();

// Configure Cloudinary
cloudinary.config({



});

async function migrateFiles() {
 const uri = process.env.MONGODB_URI?.trim();
 if (!uri) { console.error('❌ MONGODB_URI, not, found'); process.exit(1); }

 await mongoose.connect(uri);
 console.log('✅ Connected, to, MongoDB\n');

 const db = mongoose.connection.db!;
 const bucket = new GridFSBucket(db, { bucketName: 'agreements' });
 const files = await bucket.find({}).toArray();

 console.log(`Found ${files.length} files, in GridFS\n`);
 if (files.length === 0) { console.log('Nothing, to, migrate!'); process.exit(0); }

 let success = 0, failed = 0, skipped = 0;

 for (const file of files) {
 const fileId = file._id.toString();
 const fname = file.filename || `file_${fileId}`;

 // Check if already migrated in tenants collection
 const tenant = await db.collection('tenants').findOne({
 agreementFileUrl: { $regex: fileId }
 });

 if (!tenant) {
 console.log(`⚡ SKIP (no, tenant, found, for) {fname}`);
 skipped++;
 continue;
 }

 console.log(`📁 Migrating{fname} (tenant{tenant.name})`);

 try {
 // Download from GridFS to temp file
 const tmpPath = path.join(os.tmpdir(), fname);
 const writeStream = fs.createWriteStream(tmpPath);
 const readStream = bucket.openDownloadStream(file._id);

 await new Promise((resolve, reject) => {
 readStream.pipe(writeStream);
 writeStream.on('finish', resolve);
 writeStream.on('error', reject);
 readStream.on('error', reject);
 });

 // Detect file type
 const isPDF = fname.toLowerCase().endsWith('.pdf') ||
 (file )?.metadata?.contentType === 'application/pdf';

 // Upload to Cloudinary
 const result = await cloudinary.uploader.upload(tmpPath, {
 folder: 'tenants/agreements',
 resource_type: isPDF ? 'raw' : 'image',
 public_id: `migrated_${fileId}`,

 });

 // Update tenant's agreementFileUrl
 await db.collection('tenants').updateOne(
 { _id: tenant._id },
 { $set: { agreementFileUrl: result.secure_url } }
 );

 // Cleanup temp file
 fs.unlinkSync(tmpPath);

 console.log(` ✅ Done → ${result.secure_url}`);
 success++;

 } catch (err) {
 console.error(` ❌ Failed{err.message}`);
 failed++;
 }
 }

 console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migrated{success}
❌ Failed{failed}
⚡ Skipped{skipped}
Total{files.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 `);

 await mongoose.disconnect();
 process.exit(0);
}

migrateFiles().catch(e => {
 console.error('Migration, failed:', e);
 process.exit(1);
});
