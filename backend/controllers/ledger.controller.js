;
import { Ledger } from '../models/Ledger.js';
import { Tenant } from '../models/Tenant.js';
import { isUsingMockData, mockStorage } from '../src/mockData.js';

export const getLedgerByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (isUsingMockData.value) {
      const mockLedgers = mockStorage.ledgers.filter((l) => String(l.tenantId) === tenantId);
      
      let currentBalance = 0;
      const ledger = mockLedgers.map((entry) => {
        currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0) - (entry.tds || 0);
        return {
          ...entry,
          runningBalance: currentBalance
        };
      });

      const summary = {
        openingBalance: mockLedgers.filter((e) => e.type === 'OPENING_BALANCE').reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0),
        totalInvoiced: mockLedgers.filter((e) => e.type === 'INVOICE').reduce((s, e) => s + (e.debit || 0), 0),
        totalAdjustments: mockLedgers.filter((e) => e.type === 'ADJUSTMENT').reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0),
        totalReceived: mockLedgers.filter((e) => e.type === 'PAYMENT').reduce((s, e) => s + (e.credit || 0), 0),
        totalTds: mockLedgers.reduce((s, e) => s + (e.tds || 0), 0),
        closingBalance: currentBalance
      };

      return res.json({ ledger, summary });
    }

    // 1. Calculate Opening Balance (all entries before startDate)
    // If no startDate, opening balance is 0 or based on first entry
    let query= { tenantId };
    if (startDate) {
      query.date = { $lt: new Date(startDate) };
    } else {
      // If no start date, we don't have a "period" opening balance other than 
      // strictly the first entry if it's OPENING_BALANCE type
    }

    const previousEntries = startDate ? await Ledger.find(query) : [];
    const openingBalance = previousEntries.reduce((acc, curr) => {
      return acc + (curr.debit || 0) - (curr.credit || 0) - (curr.tds || 0);
    }, 0);

    // 2. Fetch entries for the current period
    let periodQuery= { tenantId };
    if (startDate || endDate) {
      periodQuery.date = {};
      if (startDate) periodQuery.date.$gte = new Date(startDate);
      if (endDate) periodQuery.date.$lte = new Date(endDate);
    }

    const periodEntries = await Ledger.find(periodQuery).sort({ date: 1, createdAt: 1 });

    // 3. Calculate Running Balances and Summary
    let currentBalance = openingBalance;
    const ledger = periodEntries.map(entry => {
      currentBalance = currentBalance + (entry.debit || 0) - (entry.credit || 0) - (entry.tds || 0);
      return {
        ...entry.toObject(),
        id: entry._id,
        runningBalance: currentBalance
      };
    });

    const summary = {
      openingBalance,
      totalInvoiced: periodEntries.filter(e => e.type === 'INVOICE').reduce((s, e) => s + (e.debit || 0), 0),
      totalAdjustments: periodEntries.filter(e => e.type === 'ADJUSTMENT').reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0),
      totalReceived: periodEntries.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + (e.credit || 0), 0),
      totalTds: periodEntries.reduce((s, e) => s + (e.tds || 0), 0),
      closingBalance: currentBalance
    };

    res.json({ ledger, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createLedgerEntry = async (req, res) => {
  try {
    const { tenantId, date, type, particular, debit, credit, tds, notes, refNo } = req.body;

    if (!tenantId || !type || !particular) {
      return res.status(400).json({ error: 'TenantId, and particular are required' });
    }

    const entryData = {
      tenantId,
      date: date || new Date(),
      type,
      particular,
      debit: Number(debit) || 0,
      credit: Number(credit) || 0,
      tds: Number(tds) || 0,
      notes,
      refNo
    };

    if (isUsingMockData.value) {
      const newEntry = {
        ...entryData,
        _id: `l${Date.now()}`,
        id: `l${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStorage.ledgers.push(newEntry);
      return res.status(201).json(newEntry);
    }

    const ledger = new Ledger(entryData);
    await ledger.save();
    res.status(201).json({ ...ledger.toObject(), id: ledger._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// ── UPDATE Ledger Entry (ADJUSTMENT only) ────────────────────────────────────
export const updateLedgerEntry = async (req, res) => {
  try {
    const { id }  = req.params;
    const { date, particular, debit, credit, notes } = req.body;

    const entry = await Ledger.findById(id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (entry.type !== 'ADJUSTMENT') {
      return res.status(400).json({ error: 'Only ADJUSTMENT entries can be edited' });
    }

    entry.date       = date       ? new Date(date) : entry.date;
    entry.particular = particular || entry.particular;
    entry.debit      = debit  !== undefined ? Number(debit)  : entry.debit;
    entry.credit     = credit !== undefined ? Number(credit) : entry.credit;
    entry.notes      = notes  !== undefined ? notes          : entry.notes;

    await entry.save();
    res.json({ message: 'Entry updated', entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE Ledger Entry (ADJUSTMENT only) ────────────────────────────────────
export const deleteLedgerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry  = await Ledger.findById(id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (entry.type !== 'ADJUSTMENT') {
      return res.status(400).json({ error: 'Only ADJUSTMENT entries can be deleted' });
    }
    await Ledger.findByIdAndDelete(id);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
