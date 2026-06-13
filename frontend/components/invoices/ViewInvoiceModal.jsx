import React, { useState } from 'react';
import { Download, X, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { ApproveSignatureModal } from '../tenants/ApproveSignatureModal.jsx';
import { InvoicePreviewDocument } from '../invoices/InvoicePreviewDocument.jsx';
import { usePermission } from '../../src/hooks/usePermission.js';

export function ViewInvoiceModal({ invoice, tenant, company, onClose, onApprove }) {
  const [downloading,    setDownloading]    = useState(false);
  const [showApprove,    setShowApprove]    = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const { can } = usePermission('invoices');

  React.useEffect(() => { setCurrentInvoice(invoice); }, [invoice]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { generateInvoicePDF } = await import('../tenants/invoicePdf');
      await generateInvoicePDF(currentInvoice, tenant, company);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF failed');
    } finally {
      setDownloading(false);
    }
  };

  // ── Derive display values ────────────────────────────────────────────────
  const billDate  = new Date(invoice.billDate);
  const dueDate   = new Date(billDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const currentMonth = `${monthNames[billDate.getMonth()]}'${billDate.getFullYear()}`;
  const mm           = String(billDate.getMonth() + 1).padStart(2, '0');
  const lastDay      = new Date(billDate.getFullYear(), billDate.getMonth() + 1, 0).getDate();
  const fromDate     = `01/${mm}/${billDate.getFullYear()}`;
  const toDate       = `${lastDay}/${mm}/${billDate.getFullYear()}`;

  const totalAmount  = Math.round(invoice.totalInvoice);

  const invoiceItems = (invoice).items?.length
    ? (invoice).items
    : [{ particular:'Rental Charges', hsnSac:'997212', month: currentMonth, fromDate, toDate, amount: invoice.baseRent }];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="min-h-screen py-12 px-4 md:px-8 flex justify-center items-start">

        {/* ── Floating action bar ── */}
        <div className="fixed top-6 right-6 flex gap-3 z-[160]">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-white text-slate-800 px-4 py-2 rounded-lg shadow-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-bold text-sm disabled:opacity-50"
          >
            {downloading
              ? <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              : <Download size={18} />}
            <span>{downloading ? 'Preparing...' : 'Download PDF'}</span>
          </button>

          {currentInvoice.approved ? (
            <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-bold text-sm">
              <CheckCircle size={18} />
              <span>Approved</span>
            </div>
          ) : can('approve') ? (
            <button
              onClick={() => setShowApprove(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <ShieldCheck size={18} />
              <span>Approve &amp; Sign</span>
            </button>
          ) : null}

          <button onClick={onClose} className="bg-slate-800 text-white p-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Approve signature modal ── */}
        <AnimatePresence>
          {showApprove && (
            <ApproveSignatureModal
              invoice={currentInvoice}
              company={company}
              onClose={() => setShowApprove(false)}
              onSuccess={(updated) => {
                setCurrentInvoice(updated);
                setShowApprove(false);
                onApprove?.(updated);
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Printable invoice document ── */}
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-[850px] shadow-2xl p-6 md:p-16 font-sans text-[#1a1a1a] rounded-sm my-8"
        >
          <InvoicePreviewDocument
            invoice={currentInvoice}
            tenant={tenant}
            company={company}
            invoiceItems={invoiceItems}
            totalAmount={totalAmount}
            dueDate={dueDate}
          />
        </motion.div>

      </div>
    </motion.div>
  );
}