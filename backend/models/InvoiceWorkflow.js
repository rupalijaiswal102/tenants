import mongoose from 'mongoose';

// ── Workflow Steps ──────────────────────────────────────────────────────────
export const WORKFLOW_STEPS = {
  GENERATED:        { order: 1, label: 'Invoice Generated',        role: 'MDO'      },
  APPROVED:         { order: 2, label: 'Approved & Signed',         role: 'Accounts' },
  TALLY_ENTRY:      { order: 3, label: 'Tally Entry Completed',     role: 'Accounts' },
  EMAIL_SENT:       { order: 4, label: 'Email Sent',                role: 'MDO'      },
  DISPATCHED:       { order: 5, label: 'Hard Copy Dispatched',      role: 'CRM'      },
  FILING:           { order: 6, label: 'Filing Done',               role: 'MDO'      },
  PAYMENT_RECEIVED: { order: 7, label: 'Payment Received',          role: 'MDO'      },
  TALLY_RECEIPT:    { order: 8, label: 'Tally Receipt Posted',      role: 'Accounts' },
};

// ── Role Permissions ─────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  MDO:      ['GENERATED', 'EMAIL_SENT', 'FILING', 'PAYMENT_RECEIVED'],
  Accounts: ['APPROVED',  'TALLY_ENTRY', 'TALLY_RECEIPT'],
  CRM:      ['DISPATCHED'],
  Admin:    Object.keys(WORKFLOW_STEPS), // Admin can do everything
};

// ── Invoice Status based on workflow ─────────────────────────────────────────
export const getInvoiceStatus = (completedSteps = []) => {
  if (!completedSteps.length)                           return 'Draft';
  if (completedSteps.includes('TALLY_RECEIPT'))         return 'Paid';
  if (completedSteps.includes('PAYMENT_RECEIVED'))      return 'Partially Paid';
  if (completedSteps.includes('FILING'))                return 'Filed';
  if (completedSteps.includes('DISPATCHED'))            return 'Dispatched';
  if (completedSteps.includes('EMAIL_SENT'))            return 'Email Sent';
  if (completedSteps.includes('TALLY_ENTRY'))           return 'Tally Pending';
  if (completedSteps.includes('APPROVED'))              return 'Approved';
  if (completedSteps.includes('GENERATED'))             return 'Pending Approval';
  return 'Draft';
};

// ── Audit Log Entry ───────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  step:       { type: String, enum: Object.keys(WORKFLOW_STEPS), required: true },
  stepLabel:  { type: String },
  completedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  userName:   { type: String },
  userRole:   { type: String },
  completedAt:{ type: Date, default: Date.now },
  notes:      { type: String, default: '' },
  undone:     { type: Boolean, default: false },
  undoneBy:   { type: String },
  undoneAt:   { type: Date },
}, { _id: true });

// ── Main Workflow Schema ──────────────────────────────────────────────────────
const invoiceWorkflowSchema = new mongoose.Schema({
  invoiceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, unique: true },
  currentStatus:  { type: String, default: 'Draft' },
  completedSteps: [{ type: String, enum: Object.keys(WORKFLOW_STEPS) }],
  auditLog:       [auditLogSchema],
  signatureImage: { type: String },   // base64 or URL
  tallyVoucherId: { type: String },   // optional tally reference
  emailSentTo:    { type: String },
  dispatchMode:   { type: String },   // courier, hand, post
  dispatchRef:    { type: String },   // courier tracking number
  paymentRef:     { type: String },   // UTR / cheque number
  tallyReceiptId: { type: String },
}, { timestamps: true });

// Auto-update currentStatus before save
invoiceWorkflowSchema.pre('save', async function() {
  this.currentStatus = getInvoiceStatus(this.completedSteps);
});

export const InvoiceWorkflow = mongoose.model('InvoiceWorkflow', invoiceWorkflowSchema);