import fs from 'fs';
import { OtherParty } from '../models/OtherParty.js';
import { Invoice }    from '../models/Invoice.js';
import { Ledger }     from '../models/Ledger.js';
import { uploadToGridFS } from '../src/gridfs.js';

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
};

const parseNumericFields = (data) => {
  ['currentRent','securityDeposit','escalationPercent','tenure',
   'lockIn','noticePeriod','rentFreePeriodDays','openingBalanceAmount']
    .forEach(f => { if (data[f] !== undefined) data[f] = parseNum(data[f]); });
};

// ── File upload helper ────────────────────────────────────────────────────────
const handleFileUpload = async (file, data, res) => {
  try {
    const stats = fs.statSync(file.path);
    if (stats.size > 20 * 1024 * 1024) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({ error: `File too large! Max 20MB. Got: ${(stats.size / 1024 / 1024).toFixed(1)}MB` });
      return false;
    }
    const fileUrl          = await uploadToGridFS(file);
    data.agreementFileUrl  = fileUrl;
    data.agreementFileType = file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE';
    return true;
  } catch (err) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: 'File upload failed: ' + err.message });
    return false;
  }
};

// ── Opening Balance ───────────────────────────────────────────────────────────
const addOpeningBalance = async (party) => {
  if (party.openingBalanceAmount > 0) {
    await new Ledger({
      otherPartyId: party._id,
      date:         party.openingBalanceDate || new Date(),
      type:         'OPENING_BALANCE',
      particular:   'Opening Balance',
      debit:        party.openingBalanceType === 'Debit'  ? party.openingBalanceAmount : 0,
      credit:       party.openingBalanceType === 'Credit' ? party.openingBalanceAmount : 0,
      notes:        party.openingBalanceNotes,
    }).save();
  }
};

// GET ALL
export const getOtherParties = async (req, res) => {
  try {
    const parties = await OtherParty.find().sort({ createdAt: -1 });
    res.json(parties.map(p => ({ ...p.toObject(), id: p._id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// NEXT CODE
export const getNextOtherPartyCode = async (req, res) => {
  try {
    const count = await OtherParty.countDocuments();
    let num = count + 1;
    let code = `OP${String(num).padStart(3, '0')}`;
    let exists = await OtherParty.findOne({ code });
    while (exists) { num++; code = `OP${String(num).padStart(3, '0')}`; exists = await OtherParty.findOne({ code }); }
    res.json({ code });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET BY ID
export const getOtherPartyById = async (req, res) => {
  try {
    const party = await OtherParty.findById(req.params.id);
    if (!party) return res.status(404).json({ error: 'Other Party not found' });
    res.json({ ...party.toObject(), id: party._id });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// GET DETAILS
export const getOtherPartyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const party = await OtherParty.findById(id);
    if (!party) return res.status(404).json({ error: 'Other Party not found' });

    const invoices      = await Invoice.find({
      $or: [{ otherPartyId: id }, { tenantId: id }]
    }).sort({ billDate: -1 });
    const ledgerEntries = await Ledger.find({ tenantId: id }).sort({ date: 1 });

    const totalInvoiced  = ledgerEntries.reduce((s, e) => s + (e.debit  || 0), 0);
    const totalReceived  = ledgerEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const totalTds       = ledgerEntries.reduce((s, e) => s + (e.tds    || 0), 0);
    const closingBalance = totalInvoiced - (totalReceived + totalTds);

    res.json({
      tenant:         { ...party.toObject(), id: party._id },
      invoices:       invoices.map(i => ({ ...i.toObject(), id: i._id })),
      paymentSummary: { totalInvoiced, totalReceived, totalTds, pendingBalance: closingBalance },
      analytics: {
        monthlyTrend: invoices.slice(0, 12).map(inv => ({
          month:    inv.billDate ? new Date(inv.billDate).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'N/A',
          invoiced: inv.totalInvoice || 0,
          received: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0),
        })).reverse(),
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// CREATE
export const createOtherParty = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id; delete data.id;

    // ── Handle file upload ──
    if (req.file) {
      const ok = await handleFileUpload(req.file, data, res);
      if (!ok) return;
    }

    if (!data.code || data.code === '' || data.code === 'Loading...') {
      const count = await OtherParty.countDocuments();
      let num = count + 1;
      let code = `OP${String(num).padStart(3, '0')}`;
      let exists = await OtherParty.findOne({ code });
      while (exists) { num++; code = `OP${String(num).padStart(3, '0')}`; exists = await OtherParty.findOne({ code }); }
      data.code = code;
    }
    parseNumericFields(data);

    const party = new OtherParty(data);
    await party.save();
    await addOpeningBalance(party);
    res.status(201).json({ ...party.toObject(), id: party._id });
  } catch (err) {
    let message = err.message;
    if (err.code === 11000) message = 'Duplicate code.';
    res.status(400).json({ error: message });
  }
};

// UPDATE
export const updateOtherParty = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id; delete data.id;
    if (data.code === '') delete data.code;

    // ── Handle file upload ──
    if (req.file) {
      const ok = await handleFileUpload(req.file, data, res);
      if (!ok) return;
    }

    parseNumericFields(data);

    // Remove undefined values so they don't overwrite existing DB fields with null
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );

    const party = await OtherParty.findByIdAndUpdate(
      req.params.id,
      { $set: cleanData },
      { new: true }
    );
    if (!party) return res.status(404).json({ error: 'Other Party not found' });

    if (data.openingBalanceAmount !== undefined) {
      await Ledger.deleteMany({ tenantId: party._id, type: 'OPENING_BALANCE' });
      await addOpeningBalance(party);
    }
    res.json({ ...party.toObject(), id: party._id });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// DELETE
export const deleteOtherParty = async (req, res) => {
  try {
    await OtherParty.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};