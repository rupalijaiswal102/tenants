// ── Invoice Modals — barrel export ──────────────────────────────────────────
// All existing imports like:
//   import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals'
// continue to work without any changes elsewhere in the codebase.

export { InvoiceFormModal }      from '../invoices/InvoiceFormModal';
export { ViewInvoiceModal }      from '../invoices/ViewInvoiceModal';
export { InvoiceItemsTable }     from '../invoices/InvoiceItemsTable';
export { GSTPanel }              from '../invoices/GSTPanel';
export { CRMPanel }              from '../invoices/CRMPanel';
export { FinancialSummaryPanel } from '../invoices/FinancialSummaryPanel';
export { InvoicePreviewDocument }from '../invoices/InvoicePreviewDocument';
export { numberToWords, getMonthDefaults } from '../invoices/invoiceUtils';
