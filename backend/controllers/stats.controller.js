;
import { Tenant } from '../models/Tenant.js';
import { Invoice } from '../models/Invoice.js';
import { mockStorage, isUsingMockData } from '../src/mockData.js';

export const getStats = async (req, res) => {
  try {
    if (isUsingMockData.value) {
      return res.json({
        totalTenants: mockStorage.tenants.length,
        activeAgreements: mockStorage.tenants.filter((t) => t.agreementStatus === 'Active').length,
        monthlyRent: mockStorage.tenants.reduce((s, t) => s + (t.currentRent || 0), 0),
        pendingPayments: 0,
        trends: [{ month: 'May 2026', total: 107500 }]
      });
    }

    const totalTenants = await Tenant.countDocuments();
    const activeAgreements = await Tenant.countDocuments({ agreementStatus: 'Active' });
    
    const rentResult = await Tenant.aggregate([
      { $group: { _id: null, total: { $sum: '$currentRent' } } }
    ]);
    const monthlyRent = rentResult[0]?.total || 0;

    const balanceResult = await Invoice.aggregate([
      { $match: { paymentStatus: { $ne: 'Paid' } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    const pendingPayments = balanceResult[0]?.total || 0;
    
    const trends = await Invoice.aggregate([
      {
        $group: {
          _id: { $substr: ['$billDate', 0, 7] }, // YYYY-MM
          total: { $sum: '$received' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 6 },
      { $project: { month: '$_id', total: 1, _id: 0 } }
    ]);

    res.json({
      totalTenants,
      activeAgreements,
      monthlyRent,
      pendingPayments,
      trends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
