// ── Invoice Modals — barrel export ───────────────────────────────────────────
// Re-exports from invoices/ folder so existing imports keep working:
//   import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals.jsx'

export { InvoiceFormModal }       from '../invoices/InvoiceFormModal.jsx';
export { ViewInvoiceModal }       from '../invoices/ViewInvoiceModal.jsx';
export { InvoiceItemsTable }      from '../invoices/InvoiceItemsTable.jsx';
export { GSTPanel }               from '../invoices/GSTPanel.jsx';
export { CRMPanel }               from '../invoices/CRMPanel.jsx';
export { FinancialSummaryPanel }  from '../invoices/FinancialSummaryPanel.jsx';
export { InvoicePreviewDocument } from '../invoices/InvoicePreviewDocument.jsx';
export { numberToWords, getMonthDefaults } from '../invoices/invoiceUtils.js';
