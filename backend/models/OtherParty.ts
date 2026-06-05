import mongoose from 'mongoose';

// OtherParty schema — same structure as Tenant (strict:false allows all fields)
// Reuses TenantDetailsView, TenantFormPage via mode='otherParty' prop
const otherPartySchema = new mongoose.Schema({
  code:                 { type: String, unique: true, sparse: true },
  name:                 { type: String, required: true },
  company:              String,
  property:             String,
  contactPerson:        String,
  designation:          String,
  mobile:               String,
  email:                String,
  alternateContactPerson: String,
  rentalPurpose:        String,

  // Optional lease (may not apply to all other parties)
  leaseStart:           String,
  leaseEnd:             String,
  tenure:               Number,
  lockIn:               Number,
  noticePeriod:         Number,
  escalationPercent:    Number,
  nextEscalationDate:   String,
  referenceDate:        String,

  // Financial
  securityDeposit:      Number,
  currentRent:          { type: Number, default: 0 },
  rentFreePeriodDays:   { type: Number, default: 0 },

  // GST / Legal
  gstNo:                String,
  panNumber:            String,
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
}, { timestamps: true, strict: false });

export const OtherParty = mongoose.model('OtherParty', otherPartySchema);
