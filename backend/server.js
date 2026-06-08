import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { createApp } from './src/app.js';
import { isUsingMockData } from './src/mockData.js';
import { Company } from './models/Company.js';
import { seedAdminUser } from './controllers/auth.controller.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
 cloudinary.config({
 cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
 api_key: process.env.CLOUDINARY_API_KEY,
 api_secret: process.env.CLOUDINARY_API_SECRET
 });
 console.log('✅ Cloudinary Configured');
}

const MONGODB_URI = process.env.MONGODB_URI?.trim();

async function seedCompanies() {
 if (isUsingMockData.value) return;
 try {
 const count = await Company.countDocuments();
 if (count === 0) {
 await Company.insertMany([
 'Swastik Grah Nirman Company','GLR Real Estate Pvt Ltd.',
 'Neoteric Properties Pvt Ltd.','Gravity Infrastructure Pvt. Ltd.',
 'Reyan Infrastructure Company','Rahul Gupta','Ramjidas Gupta',
 'Heaven Heights Pvt Ltd','Neoteric Housing India LLP',
 'Neoteric Recreational and Hospitality Service Pvt Ltd.'
 ].map(name => ({ companyName, status: true })));
 console.log('✅ Companies, seeded');
 }
 } catch (err) { console.error('Seed, companies, error:', err); }
}

// ── Drop old invoiceNo_1 index & create compound index ───────────────────────
async function migrateInvoiceIndex() {
 try {
 const db = mongoose.connection.db;
 if (!db) return;
 const col = db.collection('invoices');

 // Get all existing indexes
 const indexes = await col.indexes();
 console.log('📋 Existing invoice indexes:', indexes.map((i) => i.name));

 // Drop old global unique index on invoiceNo
 for (const idx of indexes) {
 const isOldUniqueIndex =
 idx.unique === true &&
 idx.key?.invoiceNo !== undefined &&
 idx.key?.companyId === undefined;

 if (isOldUniqueIndex) {
 try {
 if (idx.name) {
 await col.dropIndex(idx.name);
 } else {
 console.log('⚠️ Skipping dropIndex because index name is undefined', idx);
 }
 console.log(`✅ Dropped old, index{idx.name}`);
 } catch (e) {
 console.log(`⚠️ Could, not, drop ${idx.name}: ${e.message}`);
 }
 }
 }

 // Create compound unique index
 try {
 await col.createIndex(
   { companyId: 1, invoiceNo: 1 },
   { unique: true, sparse: true, name: 'company_invoice_unique' }
 );
 console.log('✅ Compound invoice index ready (companyId + invoiceNo)');
 } catch (e) {
 if (e.code === 85 || e.code === 86 || (e.message && e.message.includes('already exists'))) {
   console.log('✅ Compound invoice index already exists');
 } else {
   console.error('Index create error:', e.message);
 }
 }
 } catch (err) {
 console.error('migrateInvoiceIndex error:', err.message);
 }
}

async function startServer() {
 if (MONGODB_URI) {
 try {
 await mongoose.connect(MONGODB_URI, {
 serverSelectionTimeoutMS: 5000,
 connectTimeoutMS: 10000,
 });
 console.log('✅ Connected to MongoDB Atlas');
 isUsingMockData.value = false;
 await migrateInvoiceIndex(); // ← await so it runs before requests
 seedCompanies();
 seedAdminUser();
 } catch (err) {
 console.error('⚠️ MongoDB, Connection, Failed. Fallback, to, DEMO, MODE.');
 isUsingMockData.value = true;
 }
 } else {
 console.log('ℹ️  MONGODB_URI not found. Starting in DEMO MODE.');
 isUsingMockData.value = true;
 }

 const app = await createApp();
 app.listen(PORT, '0.0.0.0', () => {
 console.log(`🚀 Server running at http://localhost:${PORT}`);
 });
}

startServer();