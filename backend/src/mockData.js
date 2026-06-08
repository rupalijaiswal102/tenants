export const mockStorage = {
  tenants: [
    { _id: 'm1', id: 'm1', code: 'T001', name: 'Alpha Corp', company: 'Alpha Group', property: 'Wing A', currentRent: 45000, agreementStatus: 'Active' },
    { _id: 'm2', id: 'm2', code: 'T002', name: 'Beta Systems', company: 'Beta LLC', property: 'Wing B', currentRent: 62500, agreementStatus: 'Pending' }
  ],
  invoices: [
    { _id: 'i1', id: 'i1', invoiceNo: 'INV-2026-001', billDate: '2026-05-01', partyName: 'Alpha Corp', totalInvoice: 45000, balance: 0, paymentStatus: 'Paid' }
  ],
  ledger: [
    { _id: 'l1', id: 'l1', tenantId: 'm1', date: '2026-05-01', type: 'OPENING_BALANCE', particular: 'Opening Balance', debit: 10000, credit: 0 },
    { _id: 'l2', id: 'l2', tenantId: 'm1', date: '2026-05-01', type: 'INVOICE', particular: 'Rent May 2026', refNo: 'INV-2026-001', debit: 45000, credit: 0 },
    { _id: 'l3', id: 'l3', tenantId: 'm1', date: '2026-05-05', type: 'PAYMENT', particular: 'Payment Received', refNo: 'TXN-8822', debit: 0, credit: 45000 }
  ],
  companies: [
    { _id: 'c1', id: 'c1', companyName: 'Swastik Grah Nirman Company', status: true, address: '123 Main St', phoneNumber: '9876543210', email: 'contact@swastik.com', gstNumber: '27AAAAA0000A1Z5', state: 'Maharashtra', bankName: 'HDFC Bank', accountNumber: '50100012345678', logoUrl: 'https://placehold.co/200x100?text=SGC', createdAt: new Date() },
    { _id: 'c2', id: 'c2', companyName: 'Gravity Infrastructure Pvt. Ltd.', status: true, address: '456 Business Hub', email: 'info@gravity.com', logoUrl: 'https://placehold.co/200x100?text=GIPL', createdAt: new Date() }
  ],
  users: [
    { _id: 'u1', id: 'u1', name: 'Admin', email: 'admin@neoteric.in', role: 'Super Admin', isActive: true }
  ]
};

export const isUsingMockData = { value: false };
