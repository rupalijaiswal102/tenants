import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
export const ROLES = {
  'Super Admin': {
    label:'Super Admin', color:'#ef4444', bg:'#fff1f2',
    description:'Full system access — all modules',
    permissions:['*'],
  },
  'Admin': {
    label:'Admin', color:'#f97316', bg:'#fff7ed',
    description:'Full access except user management settings',
    permissions:['tenants','other_parties','invoices','companies','reports','ledger','workflow_all'],
  },
  'MDO': {
    label:'MDO', color:'#6366f1', bg:'#eef2ff',
    description:'Invoice generation, email, payment tracking',
    permissions:['tenants:read','invoices:create','invoices:read','workflow:GENERATED','workflow:EMAIL_SENT','workflow:PAYMENT_RECEIVED'],
  },
  'Accounts': {
    label:'Accounts', color:'#10b981', bg:'#f0fdf4',
    description:'Approve invoices, tally entry, receipts',
    permissions:['tenants:read','invoices:read','ledger:read','workflow:APPROVED','workflow:TALLY_ENTRY','workflow:TALLY_RECEIPT'],
  },
  'CRM': {
    label:'CRM', color:'#0ea5e9', bg:'#eff6ff',
    description:'Hard copy dispatch, tenant communication',
    permissions:['tenants:read','invoices:read','workflow:DISPATCHED'],
  },
  'Viewer': {
    label:'Viewer', color:'#94a3b8', bg:'#f8fafc',
    description:'Read-only access to all modules',
    permissions:['tenants:read','invoices:read','ledger:read','reports:read'],
  },
};

const UserSchema = new Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, default: 'Viewer', enum: Object.keys(ROLES) },
  isActive:   { type: Boolean, default: true },
  phone:      { type: String, default: '' },
  department: { type: String, default: '' },
  lastLogin:  { type: Date },
  createdBy:  { type: String, default: 'System' },
}, { timestamps: true });
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
UserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};
export const User = mongoose.model('User', UserSchema);