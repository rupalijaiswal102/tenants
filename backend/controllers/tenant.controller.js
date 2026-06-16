;
import { Tenant }   from '../models/Tenant.js';
import { Invoice }  from '../models/Invoice.js';
import { Ledger }   from '../models/Ledger.js';
import { mockStorage, isUsingMockData } from '../src/mockData.js';
import { uploadToGridFS, deleteFromGridFS } from '../src/gridfs.js';
import fs from 'fs';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── GridFS file upload helper ─────────────────────────────────────────────────
const handleFileUpload = async (file, data, res) => {
  try {
    const stats = fs.statSync(file.path);

    if (stats.size > 20 * 1024 * 1024) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(400).json({
        error: `File too large! Max 20MB. Got: ${(stats.size / 1024 / 1024).toFixed(1)}MB`
      });
      return false; // ← upload failed
    }

    const fileUrl          = await uploadToGridFS(file);
    data.agreementFileUrl  = fileUrl;
    data.agreementFileType = file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE';
    return true; // ← upload success

  } catch (err) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: 'File upload failed: ' + err.message });
    return false;
  }
};

// ── Opening Balance ledger entry (mock) ───────────────────────────────────────
const addOpeningBalanceMock = (tenant) => {
  if (tenant.openingBalanceAmount > 0) {
    mockStorage.ledgers.push({
      _id: `l${Date.now()}`, id: `l${Date.now()}`,
      tenantId:   tenant.id,
      date:       tenant.openingBalanceDate || new Date(),
      type:       'OPENING_BALANCE',
      particular: 'Opening Balance',
      debit:      tenant.openingBalanceType === 'Debit'  ? tenant.openingBalanceAmount : 0,
      credit:     tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
      notes:      tenant.openingBalanceNotes,
    });
  }
};

// ── Opening Balance ledger entry (real DB) ────────────────────────────────────
const addOpeningBalanceDB = async (tenant) => {
  if (tenant.openingBalanceAmount > 0) {
    await new Ledger({
      tenantId:   tenant._id,
      date:       tenant.openingBalanceDate || new Date(),
      type:       'OPENING_BALANCE',
      particular: 'Opening Balance',
      debit:      tenant.openingBalanceType === 'Debit'  ? tenant.openingBalanceAmount : 0,
      credit:     tenant.openingBalanceType === 'Credit' ? tenant.openingBalanceAmount : 0,
      notes:      tenant.openingBalanceNotes,
    }).save();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TENANTS
// ─────────────────────────────────────────────────────────────────────────────
export const getTenants = async (req, res) => {
  try {
    if (isUsingMockData.value) return res.json(mockStorage.tenants);
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants.map(t => ({ ...t.toObject(), id: t._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TENANT DETAILS
// ─────────────────────────────────────────────────────────────────────────────
export const getTenantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let tenant, invoices;

    if (isUsingMockData.value) {
      tenant = mockStorage.tenants.find((t) => t.id === id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      invoices = mockStorage.invoices.filter((i) => String(i.tenantId) === id);
    } else {
      tenant = await Tenant.findById(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      invoices = await Invoice.find({ tenantId: id }).sort({ billDate: -1 });
    }

    const tenantObj   = isUsingMockData.value ? tenant : { ...tenant.toObject(), id: tenant._id };
    const invoicesArr = isUsingMockData.value ? invoices : invoices.map((i) => ({ ...i.toObject(), id: i._id }));

    // Ledger summary
    let ledgerEntries = [];
    if (isUsingMockData.value) {
      ledgerEntries = mockStorage.ledgers?.filter((l) => String(l.tenantId) === id) || [];
    } else {
      ledgerEntries = await Ledger.find({ tenantId: id }).sort({ date: 1 });
    }

    const totalInvoiced  = ledgerEntries.reduce((s, e) => s + (e.debit  || 0), 0);
    const totalReceived  = ledgerEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const totalTds       = ledgerEntries.reduce((s, e) => s + (e.tds    || 0), 0);
    const closingBalance = totalInvoiced - (totalReceived + totalTds);

    const paymentSummary = {
      totalInvoiced,
      totalReceived,
      totalTds,
      pendingBalance: closingBalance,
      pendingAmount:  closingBalance,
      lastPaymentDate: invoicesArr
        .filter((inv) => (inv.receivedAmount || inv.received || 0) > 0)
        .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime())[0]?.billDate || null,
    };

    const analytics = {
      monthlyTrend: invoicesArr.slice(0, 12).map((inv) => ({
        month:    inv.billDate ? new Date(inv.billDate).toLocaleString('default', { month: 'short', year: '2-digit' }) : 'N/A',
        invoiced: inv.totalInvoice || 0,
        received: (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0),
      })).reverse(),
    };

    res.json({ tenant: tenantObj, invoices: invoicesArr, paymentSummary, analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TENANT BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getTenantById = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      const tenant = mockStorage.tenants.find((t) => t.id === req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      return res.json(tenant);
    }
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ ...tenant.toObject(), id: tenant._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── GET NEXT SEQUENTIAL CODE ──────────────────────────────────────────────────
export const getNextTenantCode = async (req, res) => {
  try {
    let code;

    if (isUsingMockData.value) {
      const num = mockStorage.tenants.length + 1;
      code      = `TN${String(num).padStart(3, '0')}`;
    } else {
      // Count se next number nikalo — existing random codes ignore
      const count = await Tenant.countDocuments();
      let   num   = count + 1;
      code        = `TN${String(num).padStart(3, '0')}`;

      // Uniqueness ensure karo
      let exists = await Tenant.findOne({ code });
      while (exists) {
        num++;
        code   = `TN${String(num).padStart(3, '0')}`;
        exists = await Tenant.findOne({ code });
      }
    }

    res.json({ code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const createTenant = async (req, res) => {
  try {
    const tenantData= { ...req.body };
    delete tenantData._id;
    delete tenantData.id;

    // ── Auto-generate sequential TN code ──
    if (!tenantData.code || tenantData.code === '' || tenantData.code === 'Loading...') {
      const count = await Tenant.countDocuments();
      let   num   = count + 1;
      let   code  = `TN${String(num).padStart(3, '0')}`;

      // Uniqueness ensure karo
      let exists = await Tenant.findOne({ code });
      while (exists) {
        num++;
        code   = `TN${String(num).padStart(3, '0')}`;
        exists = await Tenant.findOne({ code });
      }
      tenantData.code = code;
    }

    parseNumericFields(tenantData);
    // ── GridFS File Upload ──
    const file = (req).file;
    if (file) {
      const ok = await handleFileUpload(file, tenantData, res);
      if (!ok) return; // response already sent
    } else if (isUsingMockData.value && !tenantData.agreementFileUrl) {
      tenantData.agreementFileUrl  = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
      tenantData.agreementFileType = 'IMAGE';
    }

    // ── Mock mode ──
    if (isUsingMockData.value) {
      const tenant = { ...tenantData, _id: `m${Date.now()}`, id: `m${Date.now()}`, createdAt: new Date() };
      mockStorage.tenants.push(tenant);
      addOpeningBalanceMock(tenant);
      return res.status(201).json(tenant);
    }

    // ── Real DB ──
    const tenant = new Tenant(tenantData);
    await tenant.save();
    await addOpeningBalanceDB(tenant);
    res.status(201).json({ ...tenant.toObject(), id: tenant._id });

  } catch (err) {
    console.error('createTenant error:', err);
    let message = err.message;
    if (err.code === 11000) message = 'Duplicate tenant code. Please use a unique code.';
    if (err.name === 'ValidationError') {
      message = (Object.values(err.errors)[0])?.message || message;
    }
    res.status(400).json({ error: message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TENANT
// ─────────────────────────────────────────────────────────────────────────────
export const updateTenant = async (req, res) => {
  try {
    const updateData= { ...req.body };
    delete updateData._id;
    delete updateData.id;
    if (updateData.code === '') delete updateData.code;
    parseNumericFields(updateData);

    // ── GridFS File Upload ──
    const file = (req).file;
    if (file) {
      const ok = await handleFileUpload(file, updateData, res);
      if (!ok) return; // response already sent
    }

    // ── Mock mode ──
    if (isUsingMockData.value) {
      const index = mockStorage.tenants.findIndex((t) => t.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Tenant not found' });
      mockStorage.tenants[index] = { ...mockStorage.tenants[index], ...updateData };
      const tenant = mockStorage.tenants[index];

      if (updateData.openingBalanceAmount !== undefined) {
        mockStorage.ledgers = mockStorage.ledgers.filter((l) =>
          !(String(l.tenantId) === req.params.id && l.type === 'OPENING_BALANCE')
        );
        addOpeningBalanceMock(tenant);
      }
      return res.json(mockStorage.tenants[index]);
    }

    // ── Real DB ──
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: cleanData },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    if (updateData.openingBalanceAmount !== undefined) {
      await Ledger.deleteMany({ tenantId: tenant._id, type: 'OPENING_BALANCE' });
      await addOpeningBalanceDB(tenant);
    }

    res.json({ ...tenant.toObject(), id: tenant._id });

  } catch (err) {
    console.error('updateTenant error:', err);
    let message = err.message;
    if (err.code === 11000) message = 'Duplicate tenant code. Please use a unique code.';
    if (err.name === 'ValidationError') {
      message = (Object.values(err.errors)[0])?.message || message;
    }
    res.status(400).json({ error: message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TENANT
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTenant = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      mockStorage.tenants = mockStorage.tenants.filter((t) => t.id !== req.params.id);
      return res.json({ success: true });
    }
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICITY BILLS — Upload & Delete
// ─────────────────────────────────────────────────────────────────────────────
export const uploadElectricityBill = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    if (!req.file)  return res.status(400).json({ error: 'No file uploaded' });

    const url  = await uploadToGridFS(req.file);
    const bill = {
      url,
      name: req.body.billName || req.file.originalname,
      uploadedAt: new Date().toISOString(),
    };

    const bills = Array.isArray(tenant.electricityBills) ? tenant.electricityBills : [];
    bills.push(bill);
    await Tenant.findByIdAndUpdate(req.params.id, { electricityBills: bills });
    res.json({ ok: true, bill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteElectricityBill = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const bills = Array.isArray(tenant.electricityBills) ? [...tenant.electricityBills] : [];
    const idx   = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= bills.length)
      return res.status(400).json({ error: 'Invalid bill index' });

    const [removed] = bills.splice(idx, 1);
    await deleteFromGridFS(removed.url).catch(() => {});
    await Tenant.findByIdAndUpdate(req.params.id, { electricityBills: bills });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
