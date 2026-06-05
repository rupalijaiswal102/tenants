import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: false },
  otherPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'OtherParty', required: false },
  date:      { type: Date, required: true, default: Date.now },
  type:      { type: String, enum: ['OPENING_BALANCE','INVOICE','PAYMENT','TDS','ADJUSTMENT'], required: true },
  particular:{ type: String, required: true },
  refId:     { type: mongoose.Schema.Types.ObjectId },
  refNo:     { type: String },
  debit:     { type: Number, default: 0 },
  credit:    { type: Number, default: 0 },
  tds:       { type: Number, default: 0 },
  notes:     String,
}, { timestamps: true });

export const Ledger = mongoose.model('Ledger', ledgerSchema);