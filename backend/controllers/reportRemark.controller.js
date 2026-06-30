import { ReportRemark } from '../models/ReportRemark.js';
import { Invoice }      from '../models/Invoice.js';

export const getRemarks = async (req, res) => {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' });
    const remarks = await ReportRemark.find({ invoiceId }).sort({ createdAt: -1 }).lean();
    res.json(remarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createRemark = async (req, res) => {
  try {
    const { invoiceId, text } = req.body;
    if (!invoiceId || !text?.trim()) return res.status(400).json({ error: 'invoiceId and text required' });
    const remark = await ReportRemark.create({ invoiceId, reportType: 'invoice', text: text.trim() });
    res.status(201).json(remark);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteRemark = async (req, res) => {
  try {
    await ReportRemark.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRemarksByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const invoices = await Invoice.find({
      $or: [{ tenantId }, { otherPartyId: tenantId }],
    }).lean();
    if (!invoices.length) return res.json([]);

    const invoiceIds = invoices.map(i => String(i._id));
    const remarks = await ReportRemark.find({ invoiceId: { $in: invoiceIds } })
      .sort({ createdAt: -1 }).lean();

    const invoiceMap = {};
    invoices.forEach(inv => { invoiceMap[String(inv._id)] = inv; });

    const enriched = remarks.map(r => ({
      ...r,
      invoice: invoiceMap[r.invoiceId]
        ? {
            invoiceNo:    invoiceMap[r.invoiceId].invoiceNo,
            billDate:     invoiceMap[r.invoiceId].billDate,
            totalInvoice: invoiceMap[r.invoiceId].totalInvoice,
          }
        : null,
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getRemarkCounts = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    if (!Array.isArray(invoiceIds) || !invoiceIds.length) return res.json({});
    const docs = await ReportRemark.aggregate([
      { $match: { invoiceId: { $in: invoiceIds } } },
      { $group: { _id: '$invoiceId', count: { $sum: 1 } } },
    ]);
    const result = {};
    docs.forEach(d => { result[d._id] = d.count; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
