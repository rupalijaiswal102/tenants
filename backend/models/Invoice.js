import mongoose from 'mongoose';
const invoiceSchema = new mongoose.Schema({
  invoiceNo: String, billDate: String,
  partyType: { type: String, enum: ['Tenant','OtherParty'], default: 'Tenant' },
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  otherPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'OtherParty' },
  companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  partyName: String, company: String, property: String, gstNo: String,
  taxOption: { type: String, enum: ['GST','None'], default: 'GST' },
  items: [{ particular: String, hsnSac: String, month: String, fromDate: String, toDate: String, amount: Number }],
  baseRent: Number, cgst: Number, sgst: Number,
  totalInvoice: Number, received: Number,
  receivedAmount: { type: Number, default: 0 },
  tdsAmount:      { type: Number, default: 0 },
  balance: Number,
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Paid','Partial','Pending'], default: 'Pending' },
  paymentDate: String, paymentMode: String, transactionRef: String,
  latePenaltyPercentage: { type: Number, default: 0 },
  latePenaltyAmount:     { type: Number, default: 0 },
  status: String, remarks: String,
  crmName: String, crmPhone: String, crmEmail: String,
  approved: { type: Boolean, default: false },
  approvedBy: String, approvedAt: String, signatureImage: String,
}, { timestamps: true });
invoiceSchema.index({ companyId: 1, invoiceNo: 1 }, { unique: true, sparse: true, name: 'company_invoice_unique' });
invoiceSchema.index({ createdAt: -1 });
export const Invoice = mongoose.model('Invoice', invoiceSchema);
