import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  reportType: { type: String, required: true },
  invoiceId:  { type: String, default: null },
  text:       { type: String, required: true },
}, { timestamps: true });
schema.index({ reportType: 1, createdAt: -1 });
schema.index({ invoiceId: 1, createdAt: -1 });
export const ReportRemark = mongoose.model('ReportRemark', schema);
