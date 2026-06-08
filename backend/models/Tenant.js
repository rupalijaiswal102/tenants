import mongoose from 'mongoose';
const tenantSchema = new mongoose.Schema({
  code: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  company: String, property: String, contactPerson: String, designation: String,
  mobile: String, email: String, alternateContactPerson: String, rentalPurpose: String,
  leaseStart: String, leaseEnd: String,
  tenure: Number, lockIn: Number, noticePeriod: Number, escalationPercent: Number,
  nextEscalationDate: String, referenceDate: String,
  securityDeposit: Number,
  currentRent: { type: Number, default: 0 },
  rentFreePeriodDays: { type: Number, default: 0 },
  gstNo: String, panNumber: String, legalName: String, billingAddress: String,
  state: String, pincode: String,
  agreementStatus: { type: String, enum: ['Active','Expired','Pending'], default: 'Pending' },
  agreementFileUrl: String, agreementFileType: String,
  openingBalanceAmount: { type: Number, default: 0 },
  openingBalanceType: { type: String, enum: ['Debit','Credit'], default: 'Debit' },
  openingBalanceDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  openingBalanceNotes: String,
}, { timestamps: true, strict: false });
export const Tenant = mongoose.model('Tenant', tenantSchema);
