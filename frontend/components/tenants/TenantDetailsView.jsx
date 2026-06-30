import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { exportToExcel }  from '../../src/lib/exportUtils.js';
import { generateLedgerPDF } from './invoicePdf.js';
import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals.jsx';
import { OpeningAdjustmentModal, PaymentEntryModal } from './PaymentModals.jsx';
import { useResponsive } from '../../src/hooks/useResponsive.js';

// ── Sub-components ────────────────────────────────────────────────────────────
import TenantDetailHeader  from './tenantDetails/TenantDetailHeader.jsx';
import OverviewTab         from './tenantDetails/OverviewTab.jsx';
import LedgerTab           from './tenantDetails/LedgerTab.jsx';
import BillingTab          from './tenantDetails/BillingTab.jsx';
import { LeaseTab, DocumentsTab } from './tenantDetails/LeaseDocsTab.jsx';
import DeleteInvoiceModal  from './tenantDetails/DeleteInvoiceModal.jsx';
import InvoiceWorkflowTab  from '../invoices/InvoiceWorkflowTab.jsx';

export function TenantDetailsView({ tenant, onClose, companies, allTenants, apiBase = '/api/tenants' }) {
  const isOtherParty = apiBase.includes('other-parties');
  const { isMobile } = useResponsive();
  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');

  // ── State ──────────────────────────────────────────────────────────────────
  const [tenantProfile,   setTenantProfile]   = useState(tenant); // full profile (may be thin initially)
  const [details,         setDetails]         = useState(null);
  const [ledgerData,      setLedgerData]      = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [ledgerLoading,   setLedgerLoading]   = useState(true);
  const [activeTab,       setActiveTab]       = useState('overview');
  const [showOpeningAdj,  setShowOpeningAdj]  = useState(false);
  const [selectedInvoice,  setSelectedInvoice]  = useState(null);
  const [workflowInvoice,  setWorkflowInvoice]  = useState(null); // invoice for workflow tab
  const [editingInvoice,  setEditingInvoice]  = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [payingInvoice,   setPayingInvoice]   = useState(null);
  const [exportingExcel,  setExportingExcel]  = useState(false);
  const [exportingPDF,    setExportingPDF]    = useState(false);
  const ledgerRef = useRef(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const tenantId    = String(tenant.id || tenant._id || '');
  const company     = companies?.find(c => c.companyName === tenantProfile.company);
  const { invoices = [], paymentSummary = {}, analytics = {} } = details || {};

  const lockInExpiry = tenantProfile.leaseStart ? (() => {
    const d = new Date(tenantProfile.leaseStart);
    d.setMonth(d.getMonth() + (tenantProfile.lockIn || 0));
    return d.toISOString().split('T')[0];
  })() : '';

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDetails = () => {
    setLoading(true);
    Promise.allSettled([
      axios.get(`${apiBase}/${tenantId}/details`),
      axios.get(`${apiBase}/${tenantId}`),
    ])
      .then(([detailsResult, profileResult]) => {
        if (detailsResult.status === 'fulfilled') setDetails(detailsResult.value.data);
        if (profileResult.status === 'fulfilled')
          setTenantProfile(prev => ({ ...prev, ...profileResult.value.data }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchLedger = () => {
    setLedgerLoading(true);
    const ledgerUrl = isOtherParty
      ? `/api/ledger/other-party/${tenantId}`
      : `/api/ledger/tenant/${tenantId}`;
    axios.get(ledgerUrl)
      .then(r => { setLedgerData(r.data); setLedgerLoading(false); })
      .catch(() => setLedgerLoading(false));
  };

  useEffect(() => {
    if (tenantId) { fetchDetails(); fetchLedger(); }
  }, [tenantId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDeleteInvoice = async (id) => {
    try { await axios.delete(`/api/invoices/${id}`); setDeletingInvoice(null); fetchDetails(); }
    catch { alert('Failed to delete invoice'); }
  };

  const handleExportExcel = () => {
    if (!ledgerData) return toast.error('Ledger not loaded');
    setExportingExcel(true);
    try {
      const rows = [
        ...ledgerData.ledger.map(e => ({
          Date:       new Date(e.date).toLocaleDateString('en-GB'),
          Particular: e.particular,
          Type:       e.type,
          'Ref No':   e.refNo || '-',
          Debit:      e.debit,
          Credit:     e.credit,
          TDS:        e.tds,
          Balance:    e.runningBalance,
        })),
        { Date:'TOTAL', Particular:'', Type:'', 'Ref No':'',
          Debit:  ledgerData.summary.totalInvoiced,
          Credit: ledgerData.summary.totalReceived,
          TDS:    ledgerData.summary.totalTds,
          Balance:ledgerData.summary.closingBalance },
      ];
      exportToExcel(rows, `Ledger_${tenant.name}_${new Date().toISOString().split('T')[0]}`, 'Ledger');
      toast.success('Exported to Excel');
    } catch { toast.error('Export failed'); }
    finally { setExportingExcel(false); }
  };

  const handleExportPDF = async () => {
    if (!ledgerData) return toast.error('Ledger not loaded');
    setExportingPDF(true);
    try {
      generateLedgerPDF(tenant, company, ledgerData.ledger, ledgerData.summary);
      toast.success('Ledger PDF downloaded!');
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setExportingPDF(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:12 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ fontSize:12, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.1em' }}>Loading tenant data...</p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#F5F7FA', minHeight:'100%' }}>

      {/* Sticky header + tabs */}
      <TenantDetailHeader
        tenant={tenantProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={onClose}
        exportingPDF={exportingPDF}
        onExportPDF={handleExportPDF}
      />

      {/* Tab content */}
      <div style={{ width:'100%', padding: isMobile ? '12px 12px 32px' : '20px 24px 40px' }}>
        <AnimatePresence mode="wait">

          {activeTab === 'overview' && (
            <OverviewTab
              tenant={tenantProfile}
              paymentSummary={paymentSummary}
              analytics={analytics}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerTab
              tenant={tenantProfile}
              company={company}
              ledgerData={ledgerData}
              ledgerLoading={ledgerLoading}
              ledgerRef={ledgerRef}
              exportingExcel={exportingExcel}
              exportingPDF={exportingPDF}
              onAdjustment={() => setShowOpeningAdj(true)}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />
          )}

          {activeTab === 'invoices' && (
            <BillingTab
              invoices={invoices}
              onPay={setPayingInvoice}
              onView={setSelectedInvoice}
              onEdit={setEditingInvoice}
              onDelete={setDeletingInvoice}
              onWorkflow={(inv) => { setWorkflowInvoice(inv); setActiveTab('workflow'); }}
            />
          )}

          {activeTab === 'lease' && (
            <LeaseTab tenant={tenantProfile} lockInExpiry={lockInExpiry}/>
          )}

          {activeTab === 'documents' && (
            <DocumentsTab tenant={tenantProfile}/>
          )}

          {activeTab === 'workflow' && workflowInvoice && (
            <InvoiceWorkflowTab
              invoice={workflowInvoice}
              userRole={authData?.role || 'MDO'}
              userName={authData?.name || 'User'}
            />
          )}
          {activeTab === 'workflow' && !workflowInvoice && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:12, color:'#9ba8b5' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:24 }}>🔀</span>
              </div>
              <p style={{ fontSize:13, fontWeight:600, margin:0 }}>No invoice selected</p>
              <p style={{ fontSize:11, margin:0 }}>Go to <strong>Billing</strong> tab → click <strong>Flow</strong> button on any invoice</p>
            </div>
          )}

        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {payingInvoice && (
          <PaymentEntryModal
            invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
            onSuccess={() => { setPayingInvoice(null); fetchDetails(); }}
          />
        )}
        {selectedInvoice && (
          <ViewInvoiceModal
            invoice={selectedInvoice}
            tenant={tenantProfile}
            company={companies?.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
        {editingInvoice && (
          <InvoiceFormModal
            initialData={editingInvoice}
            tenants={isOtherParty ? [] : allTenants}
            otherParties={isOtherParty ? [tenantProfile] : []}
            initialPartyType={isOtherParty ? 'OtherParty' : 'Tenant'}
            initialOtherPartyId={isOtherParty ? (tenantProfile.id || tenantProfile._id) : undefined}
            companies={companies}
            onClose={() => setEditingInvoice(null)}
            onSuccess={() => { setEditingInvoice(null); fetchDetails(); }}
          />
        )}
        {showOpeningAdj && (
          <OpeningAdjustmentModal
            tenant={tenantProfile}
            onClose={() => setShowOpeningAdj(false)}
            onSuccess={() => { setShowOpeningAdj(false); fetchLedger(); fetchDetails(); }}
          />
        )}
        {deletingInvoice && (
          <DeleteInvoiceModal
            invoice={deletingInvoice}
            onCancel={() => setDeletingInvoice(null)}
            onConfirm={handleDeleteInvoice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}