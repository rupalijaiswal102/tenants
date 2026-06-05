import { Request, Response } from 'express';
import { OtherParty } from '../models/OtherParty';
import { Invoice }    from '../models/Invoice';
import { Ledger }     from '../models/Ledger';

const parseNum = (val: any) => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
};

const parseNumericFields = (data: any) => {
  ['currentRent','securityDeposit','escalationPercent','tenure',
   'lockIn','noticePeriod','rentFreePeriodDays','openingBalanceAmount']
    .forEach(f => { if (data[f] !== undefined) data[f] = parseNum(data[f]); });
};

const addOpeningBalance = async (party: any) => {
  if (party.openingBalanceAmount > 0) {
    await new Ledger({
      tenantId:   party._id,   // reuse tenantId field in Ledger for simplicity
      date:       party.openingBalanceDate || new Date(),
      type:       'OPENING_BALANCE',
      particular: 'Opening Balance',
      debit:      party.openingBalanceType === 'Debit'  ? party.openingBalanceAmount : 0,
      credit:     party.openingBalanceType === 'Credit' ? party.openingBalanceAmount : 0,
      notes:      party.openingBalanceNotes,
    }).save();
  }
};

// GET ALL
export const getOtherParties = async (req: Request, res: Response) => {
  try {
    const parties = await OtherParty.find().sort({ createdAt: -1 });
    res.json(parties.map(p => ({ ...p.toObject(), id: p._id })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// NEXT CODE
export const getNextOtherPartyCode = async (req: Request, res: Response) => {
  try {
    const count = await OtherParty.countDocuments();
    let num = count + 1;
    let code = `OP${String(num).padStart(3, "0")}`;
    let exists = await OtherParty.findOne({ code });
    while (exists) { num++; code = `OP${String(num).padStart(3, "0")}`; exists = await OtherParty.findOne({ code }); }
    res.json({ code });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// GET BY ID
export const getOtherPartyById = async (req: Request, res: Response) => {
  try {
    const party = await OtherParty.findById(req.params.id);
    if (!party) return res.status(404).json({ error: 'Other Party not found' });
    res.json({ ...party.toObject(), id: party._id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// GET DETAILS
export const getOtherPartyDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const party = await OtherParty.findById(id);
    if (!party) return res.status(404).json({ error: 'Other Party not found' });

    // Invoices linked via tenantId (same field, different collection context)
    const invoices = await Invoice.find({ tenantId: id }).sort({ billDate: -1 });
    const ledgerEntries = await Ledger.find({ tenantId: id }).sort({ date: 1 });

    const totalInvoiced  = ledgerEntries.reduce((s: number, e: any) => s + (e.debit  || 0), 0);
    const totalReceived  = ledgerEntries.reduce((s: number, e: any) => s + (e.credit || 0), 0);
    const totalTds       = ledgerEntries.reduce((s: number, e: any) => s + (e.tds    || 0), 0);
    const closingBalance = totalInvoiced - (totalReceived + totalTds);

    res.json({
      tenant:         { ...party.toObject(), id: party._id },
      invoices:       invoices.map((i: any) => ({ ...i.toObject(), id: i._id })),
      paymentSummary: { totalInvoiced, totalReceived, totalTds, pendingBalance: closingBalance, pendingAmount: closingBalance },
      analytics: {
        monthlyTrend: invoices.slice(0, 12).map((inv: any) => ({
          month:    inv.billDate ? new Date(inv.billDate).toLocaleString("default", { month: "short", year: "2-digit" }) : "N/A",
          invoiced: inv.totalInvoice || 0,
          received: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0),
        })).reverse(),
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// CREATE
export const createOtherParty = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    delete data._id; delete data.id;

    if (!data.code || data.code === "" || data.code === "Loading...") {
      const count = await OtherParty.countDocuments();
      let num = count + 1;
      let code = `OP${String(num).padStart(3, "0")}`;
      let exists = await OtherParty.findOne({ code });
      while (exists) { num++; code = `OP${String(num).padStart(3, "0")}`; exists = await OtherParty.findOne({ code }); }
      data.code = code;
    }
    parseNumericFields(data);

    const party = new OtherParty(data);
    await party.save();
    await addOpeningBalance(party);
    res.status(201).json({ ...party.toObject(), id: party._id });
  } catch (err: any) {
    let message = err.message;
    if (err.code === 11000) message = "Duplicate code.";
    res.status(400).json({ error: message });
  }
};

// UPDATE
export const updateOtherParty = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    delete data._id; delete data.id;
    if (data.code === "") delete data.code;
    parseNumericFields(data);

    const party = await OtherParty.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!party) return res.status(404).json({ error: "Other Party not found" });

    if (data.openingBalanceAmount !== undefined) {
      await Ledger.deleteMany({ tenantId: party._id, type: "OPENING_BALANCE" });
      await addOpeningBalance(party);
    }
    res.json({ ...party.toObject(), id: party._id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// DELETE
export const deleteOtherParty = async (req: Request, res: Response) => {
  try {
    await OtherParty.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};
