import { ReportRemark } from '../models/ReportRemark.js';

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
