import mongoose from 'mongoose';
;
import { Invoice } from '../models/Invoice.js';
import { Ledger } from '../models/Ledger.js';
import { mockStorage, isUsingMockData } from '../src/mockData.js';


// ── Generate Invoice Number: {currentYear}{nextYear2d}{count3d} ──────────────
// Example: 202627001, 202627002...
// ── Company-wise Invoice Number Generator ────────────────────────────────────
// GST:     202627001, 202627002... (per company)
// Non-GST: FY26-27/01, FY26-27/02... (per company)
const generateInvoiceNo = async (companyId, taxOption) => {
  const now      = new Date();
  const year     = now.getFullYear();
  const isGST    = taxOption === 'GST';
  const cId      = companyId || 'default';

  if (isGST) {
    // GST format: 202627001
    const nextY  = String(year + 1).slice(-2);
    const prefix = `${year}${nextY}`;                       // "202627"

    const count  = await Invoice.countDocuments({
      companyId: cId,
      taxOption: 'GST',
      invoiceNo: { $regex: `^${prefix}` }
    });
    let num      = count + 1;
    let invoiceNo = `${prefix}${String(num).padStart(3, '0')}`;

    // Uniqueness check within same company
    let exists = await Invoice.findOne({ companyId: cId, taxOption: 'GST', invoiceNo });
    while (exists) {
      num++;
      invoiceNo = `${prefix}${String(num).padStart(3, '0')}`;
      exists    = await Invoice.findOne({ companyId: cId, taxOption: 'GST', invoiceNo });
    }
    return invoiceNo;

  } else {
    // Non-GST format: FY26-27/01
    // Fiscal year: April-March
    const fyStart  = now.getMonth() >= 3 ? year : year - 1;
    const fyEnd    = String(fyStart + 1).slice(-2);
    const fyPrefix = `FY${String(fyStart).slice(-2)}-${fyEnd}/`; // "FY26-27/"

    const count    = await Invoice.countDocuments({
      companyId: cId,
      taxOption:  { $ne: 'GST' },
      invoiceNo:  { $regex: `^${fyPrefix.replace('/', '\/')}` }
    });
    let num        = count + 1;
    let invoiceNo  = `${fyPrefix}${String(num).padStart(2, '0')}`;

    let exists = await Invoice.findOne({ companyId: cId, taxOption: { $ne: 'GST' }, invoiceNo });
    while (exists) {
      num++;
      invoiceNo = `${fyPrefix}${String(num).padStart(2, '0')}`;
      exists    = await Invoice.findOne({ companyId: cId, taxOption: { $ne: 'GST' }, invoiceNo });
    }
    return invoiceNo;
  }
};

export const getInvoices = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      return res.json(mockStorage.invoices);
    }
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json(invoices.map(i => ({ ...i, id: i._id })));
  } catch (err) {
    console.error('getInvoices error:', err.message);
    res.status(500).json({ error: err.message });
  }
};


export const getInvoicesByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (isUsingMockData.value) {
      const filtered = mockStorage.invoices.filter((i) => String(i.tenantId) === tenantId);
      return res.json(filtered);
    }
    const invoices = await Invoice.find({ tenantId }).sort({ billDate: -1 });
    res.json(invoices.map(i => ({ ...i.toObject(), id: i._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const data = { ...req.body };
    const total = data.totalInvoice || 0;
    const received = (data.receivedAmount || 0) + (data.tdsAmount || 0);
    const balance = total - received;
    
    data.balanceAmount = balance;
    data.balance = balance; // Sync legacy field
    data.received = (data.receivedAmount || 0); // Sync legacy field

    if (received >= total && total > 0) {
      data.paymentStatus = 'Paid';
    } else if (data.receivedAmount > 0) {
      data.paymentStatus = 'Partial';
    } else {
      data.paymentStatus = 'Pending';
    }

    if (isUsingMockData.value) {
      const invoice = { ...data, _id: `i${Date.now()}`, id: `i${Date.now()}` };
      mockStorage.invoices.push(invoice);

      // Add to mock ledgers
      mockStorage.ledgers.push({
        _id: `l${Date.now()}_1`,
        tenantId: invoice.tenantId,
        date: invoice.billDate || new Date(),
        type: 'INVOICE',
        particular: `Invoice #${invoice.invoiceNo}`,
        refId: invoice.id,
        refNo: invoice.invoiceNo,
        debit: invoice.totalInvoice || 0,
        credit: 0,
        tds: 0
      });

      if (invoice.receivedAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_2`,
          tenantId: invoice.tenantId,
          date: invoice.billDate || new Date(),
          type: 'PAYMENT',
          particular: `Payment Received - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: invoice.receivedAmount,
          tds: 0
        });
      }

      if (invoice.tdsAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_3`,
          tenantId: invoice.tenantId,
          date: invoice.billDate || new Date(),
          type: 'TDS',
          particular: `TDS Deduction - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: 0,
          tds: invoice.tdsAmount
        });
      }

      return res.status(201).json(invoice);
    }
    // Ensure companyId is set
    if (!data.companyId) {
      return res.status(400).json({ error: 'Company is required. Please select a company.' });
    }

    // Cast IDs to ObjectId FIRST
    try {
      if (data.companyId && typeof data.companyId === 'string') {
        data.companyId = new mongoose.Types.ObjectId(data.companyId);
      }
      if (data.tenantId && typeof data.tenantId === 'string' && data.tenantId.trim() !== '') {
        data.tenantId = new mongoose.Types.ObjectId(data.tenantId);
      } else {
        delete data.tenantId;
      }
      if (data.otherPartyId && typeof data.otherPartyId === 'string' && data.otherPartyId.trim() !== '') {
        data.otherPartyId = new mongoose.Types.ObjectId(data.otherPartyId);
      } else {
        delete data.otherPartyId;
      }
    } catch (castErr) {
      console.error('ObjectId cast error:', castErr.message);
      return res.status(400).json({ error: `Invalid ID format: ${castErr.message}` });
    }

    // Auto-generate invoiceNo AFTER companyId is cast
    if (!data.invoiceNo || data.invoiceNo.startsWith('INV-') || data.invoiceNo === 'Loading...' || data.invoiceNo === '') {
      data.invoiceNo = await generateInvoiceNo(String(data.companyId), data.taxOption);
    }

    // Remove undefined/null fields that could cause validation issues
    Object.keys(data).forEach(k => {
      if (data[k] === undefined) delete data[k];
    });

    const invoice = new Invoice(data);
    try {
      await invoice.save();
    } catch (saveErr) {
      console.error('Invoice save error:', saveErr.code, saveErr.message);

      if (saveErr.code === 11000) {
        // Duplicate key — regenerate invoice number
        console.log('Duplicate key, regenerating invoice number...');
        data.invoiceNo = await generateInvoiceNo(String(data.companyId), data.taxOption);
        const retryInvoice = new Invoice(data);
        await retryInvoice.save();
        const saved = await Invoice.findById(retryInvoice._id).lean();
        return res.status(201).json({ ...saved, id: retryInvoice._id });
      }

      // Return exact error for debugging
      return res.status(400).json({
        error: saveErr.message,
        code:  saveErr.code,
        field: Object.keys(saveErr.errors || {})[0] || 'unknown'
      });
    }

    // Create Ledger Entries — wrapped in try-catch so invoice saves even if ledger fails
    try {
      const partyRef = invoice.tenantId
        ? { tenantId: invoice.tenantId }
        : (invoice).otherPartyId
          ? { tenantId: (invoice).otherPartyId } // store otherPartyId in tenantId field for ledger compatibility
          : null;

      if (partyRef) {
        const ledgerEntries = [];

        ledgerEntries.push({
          ...partyRef,
          date:       invoice.billDate || new Date(),
          type:       'INVOICE',
          particular: `Invoice #${invoice.invoiceNo}`,
          refId:      invoice._id,
          refNo:      invoice.invoiceNo,
          debit:      invoice.totalInvoice || 0,
          credit:     0,
          tds:        0
        });

        if ((invoice).receivedAmount > 0) {
          ledgerEntries.push({
            ...partyRef,
            date:       (invoice).paymentDate || invoice.billDate || new Date(),
            type:       'PAYMENT',
            particular: `Payment Received - #${invoice.invoiceNo}`,
            refId:      invoice._id,
            refNo:      invoice.invoiceNo,
            debit:      0,
            credit:     (invoice).receivedAmount,
            tds:        0
          });
        }

        if ((invoice).tdsAmount > 0) {
          ledgerEntries.push({
            ...partyRef,
            date:       (invoice).paymentDate || invoice.billDate || new Date(),
            type:       'TDS',
            particular: `TDS Deduction - #${invoice.invoiceNo}`,
            refId:      invoice._id,
            refNo:      invoice.invoiceNo,
            debit:      0,
            credit:     0,
            tds:        (invoice).tdsAmount
          });
        }

        if (ledgerEntries.length > 0) {
          await Ledger.insertMany(ledgerEntries);
        }
      }
    } catch (ledgerErr) {
      // Log ledger error but don't fail the invoice save
      console.error('Ledger creation error (non-fatal):', ledgerErr.message);
    }

    res.status(201).json({ ...invoice.toObject(), id: invoice._id });
  } catch (err) {
    console.error('createInvoice outer error:', err.message, err.code);
    res.status(400).json({ error: err.message, details: err.errors });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      const invoice = mockStorage.invoices.find((i) => i.id === req.params.id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(invoice);
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...invoice.toObject(), id: invoice._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    // Recalculate status and balance if financial fields are present
    if (updateData.totalInvoice !== undefined || updateData.receivedAmount !== undefined || updateData.tdsAmount !== undefined || updateData.latePenaltyAmount !== undefined) {
      // We might need existing data if partial update
      let currentTotal, currentReceivedAmt, currentTds, currentPenalty;
      
      if (isUsingMockData.value) {
        const inv = mockStorage.invoices.find((i) => i.id === req.params.id);
        currentTotal = updateData.totalInvoice ?? inv?.totalInvoice ?? 0;
        currentReceivedAmt = updateData.receivedAmount ?? inv?.receivedAmount ?? inv?.received ?? 0;
        currentTds = updateData.tdsAmount ?? inv?.tdsAmount ?? 0;
        currentPenalty = updateData.latePenaltyAmount ?? inv?.latePenaltyAmount ?? 0;
      } else {
        const inv = await Invoice.findById(req.params.id);
        currentTotal = updateData.totalInvoice ?? inv?.totalInvoice ?? 0;
        currentReceivedAmt = updateData.receivedAmount ?? inv?.receivedAmount ?? inv?.received ?? 0;
        currentTds = updateData.tdsAmount ?? inv?.tdsAmount ?? 0;
        currentPenalty = updateData.latePenaltyAmount ?? inv?.latePenaltyAmount ?? 0;
      }

      const totalReceivable = currentTotal + currentPenalty;
      const totalReceived = currentReceivedAmt + currentTds;
      const balance = totalReceivable - totalReceived;
      
      updateData.balanceAmount = balance;
      updateData.balance = balance;
      updateData.received = currentReceivedAmt;

      if (totalReceived >= totalReceivable && totalReceivable > 0) {
        updateData.paymentStatus = 'Paid';
      } else if (currentReceivedAmt > 0) {
        updateData.paymentStatus = 'Partial';
      } else {
        updateData.paymentStatus = 'Pending';
      }
    }

    if (isUsingMockData.value) {
      const index = mockStorage.invoices.findIndex((i) => i.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Invoice not found' });
      mockStorage.invoices[index] = { ...mockStorage.invoices[index], ...updateData };
      const invoice = mockStorage.invoices[index];

      // Update mock ledgers
      mockStorage.ledgers = mockStorage.ledgers.filter((l) => l.refId !== req.params.id);
      
      mockStorage.ledgers.push({
        _id: `l${Date.now()}_1`,
        tenantId: invoice.tenantId,
        date: invoice.billDate || new Date(),
        type: 'INVOICE',
        particular: `Invoice #${invoice.invoiceNo}`,
        refId: invoice.id,
        refNo: invoice.invoiceNo,
        debit: invoice.totalInvoice || 0,
        credit: 0,
        tds: 0
      });

      if (invoice.latePenaltyAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_pen`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'ADJUSTMENT',
          particular: `Late Payment Penalty (${invoice.latePenaltyPercentage}%) - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: invoice.latePenaltyAmount,
          credit: 0,
          tds: 0
        });
      }

      if (invoice.receivedAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_2`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'PAYMENT',
          particular: `Payment Received - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: invoice.receivedAmount,
          tds: 0
        });
      }

      if (invoice.tdsAmount > 0) {
        mockStorage.ledgers.push({
          _id: `l${Date.now()}_3`,
          tenantId: invoice.tenantId,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'TDS',
          particular: `TDS Deduction - #${invoice.invoiceNo}`,
          refId: invoice.id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: 0,
          tds: invoice.tdsAmount
        });
      }

      return res.json(mockStorage.invoices[index]);
    }
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Sync Ledger Entries
    await Ledger.deleteMany({ refId: invoice._id });
    
    const partyRef = invoice.tenantId
      ? { tenantId: invoice.tenantId }
      : invoice.otherPartyId
        ? { tenantId: invoice.otherPartyId }
        : null;

    if (partyRef) {
      const ledgerEntries = [];
      // 1. Invoice Debit
      ledgerEntries.push({
        ...partyRef,
        date: invoice.billDate || new Date(),
        type: 'INVOICE',
        particular: `Invoice #${invoice.invoiceNo}`,
        refId: invoice._id,
        refNo: invoice.invoiceNo,
        debit: invoice.totalInvoice || 0,
        credit: 0,
        tds: 0
      });

      // 1.5 Late Penalty Entry (New)
      if (invoice.latePenaltyAmount > 0) {
        ledgerEntries.push({
          ...partyRef,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'ADJUSTMENT',
          particular: `Late Payment Penalty (${invoice.latePenaltyPercentage}%) - #${invoice.invoiceNo}`,
          refId: invoice._id,
          refNo: invoice.invoiceNo,
          debit: invoice.latePenaltyAmount,
          credit: 0,
          tds: 0
        });
      }

      // 2. Receipt
      if (invoice.receivedAmount > 0) {
        ledgerEntries.push({
          ...partyRef,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'PAYMENT',
          particular: `Payment Received - #${invoice.invoiceNo}`,
          refId: invoice._id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: invoice.receivedAmount,
          tds: 0
        });
      }

      // 3. TDS
      if (invoice.tdsAmount > 0) {
        ledgerEntries.push({
          ...partyRef,
          date: invoice.paymentDate || invoice.billDate || new Date(),
          type: 'TDS',
          particular: `TDS Deduction - #${invoice.invoiceNo}`,
          refId: invoice._id,
          refNo: invoice.invoiceNo,
          debit: 0,
          credit: 0,
          tds: invoice.tdsAmount
        });
      }

      if (ledgerEntries.length > 0) {
        await Ledger.insertMany(ledgerEntries);
      }
    }

    res.json({ ...invoice.toObject(), id: invoice._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      mockStorage.invoices = mockStorage.invoices.filter((i) => i.id !== req.params.id);
      mockStorage.ledgers = mockStorage.ledgers.filter((l) => l.refId !== req.params.id);
      return res.json({ success: true });
    }
    await Invoice.findByIdAndDelete(req.params.id);
    await Ledger.deleteMany({ refId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── GET NEXT INVOICE NUMBER (company-wise) ───────────────────────────────────
export const getNextInvoiceNo = async (req, res) => {
  try {
    const { companyId, taxOption } = req.query;

    if (isUsingMockData.value) {
      const now    = new Date();
      const year   = now.getFullYear();
      const isGST  = taxOption === 'GST';
      if (isGST) {
        const nxt    = String(year + 1).slice(-2);
        const prefix = `${year}${nxt}`;
        const count  = mockStorage.invoices.filter((i) =>
          i.companyId === companyId && String(i.invoiceNo).startsWith(prefix)).length;
        return res.json({ invoiceNo: `${prefix}${String(count + 1).padStart(3, '0')}` });
      } else {
        const fyStart = now.getMonth() >= 3 ? year : year - 1;
        const fyEnd   = String(fyStart + 1).slice(-2);
        const prefix  = `FY${String(fyStart).slice(-2)}-${fyEnd}/`;
        const count   = mockStorage.invoices.filter((i) =>
          i.companyId === companyId && String(i.invoiceNo).startsWith(prefix)).length;
        return res.json({ invoiceNo: `${prefix}${String(count + 1).padStart(2, '0')}` });
      }
    }

    const invoiceNo = await generateInvoiceNo(companyId, taxOption);
    res.json({ invoiceNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Approve Invoice with Digital Signature ───────────────────────────────────
export const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, signatureImage } = req.body;

    if (!signatureImage) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      id,
      {
        approved:       true,
        approvedBy:     approvedBy || 'Authorized Signatory',
        approvedAt:     new Date().toISOString(),
        signatureImage: signatureImage,
      },
      { new: true }
    );

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice approved successfully', invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};