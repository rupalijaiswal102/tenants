import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNo:   { type: String },   // ← NO unique here
  billDate:    String,
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  partyName:   String,
  company:     String,
  property:    String,
  gstNo:       String,
  taxOption:   { type: String, enum: ['GST', 'None'], default: 'GST' },
  items: [{
    particular: String,
    hsnSac:     String,
    month:      String,
    fromDate:   String,
    toDate:     String,
    amount:     Number
  }],
  baseRent:              Number,
  cgst:                  Number,
  sgst:                  Number,
  totalInvoice:          Number,
  received:              Number,
  receivedAmount:        { type: Number, default: 0 },
  tdsAmount:             { type: Number, default: 0 },
  balance:               Number,
  balanceAmount:         { type: Number, default: 0 },
  paymentStatus:         { type: String, enum: ['Paid','Partial','Pending'], default: 'Pending' },
  paymentDate:           String,
  paymentMode:           String,
  transactionRef:        String,
  latePenaltyPercentage: { type: Number, default: 0 },
  latePenaltyAmount:     { type: Number, default: 0 },
  status:                String,
  remarks:               String,
}, { timestamps: true });

// ── Compound unique: same invoiceNo allowed for DIFFERENT companies ───────────
// GLR: 202627001 ✅  +  Gravity: 202627001 ✅  =  No conflict
invoiceSchema.index(
  { companyId: 1, invoiceNo: 1 },
  { unique: true, sparse: true, name: 'company_invoice_unique' }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
