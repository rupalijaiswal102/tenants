import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  code:                 { type: String, unique: true, sparse: true },
  name:                 { type: String, required: true },
  company:              String,
  property:             String,
  contactPerson:        String,
  designation:          String,           // ← added
  mobile:               String,
  email:                String,
  alternateContactPerson: String,
  rentalPurpose:        String,

  // Lease details
  leaseStart:           String,
  leaseEnd:             String,
  tenure:               Number,
  lockIn:               Number,
  noticePeriod:         Number,
  escalationPercent:    Number,
  nextEscalationDate:   String,
  referenceDate:        String,           // ← added

  // Financial
  securityDeposit:      Number,
  currentRent:          { type: Number, default: 0 },
  rentFreePeriodDays:   { type: Number, default: 0 },

  // GST / Legal
  gstNo:                String,
  panNumber:            String,           // ← added
  legalName:            String,
  billingAddress:       String,
  state:                String,
  pincode:              String,

  // Agreement
  agreementStatus:      { type: String, enum: ['Active','Expired','Pending'], default: 'Pending' },
  agreementFileUrl:     String,
  agreementFileType:    String,

  // Opening Balance
  openingBalanceAmount: { type: Number, default: 0 },
  openingBalanceType:   { type: String, enum: ['Debit','Credit'], default: 'Debit' },
  openingBalanceDate:   { type: String, default: () => new Date().toISOString().split('T')[0] },
  openingBalanceNotes:  String,
}, { timestamps: true, strict: false }); // strict:false allows any extra fields

export const Tenant = mongoose.model('Tenant', tenantSchema);
