import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, PieChart, FileText, Receipt, Calendar, FileCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { generateLedgerPDF } from './ledgerPdf';
import { type Tenant, type Company, type Invoice, type LedgerEntry, type LedgerSummary } from '../../src/types';
import { exportToExcel } from '../../src/lib/exportUtils';
import { InvoiceFormModal, ViewInvoiceModal } from './InvoiceModals';
import { OpeningAdjustmentModal, PaymentEntryModal } from './PaymentModals';
import { TenantOverviewTab }              from './TenantOverviewTab';
import { TenantLedgerTab }               from './TenantLedgerTab';
import { TenantBillingTab, TenantLeaseTab, TenantDocumentsTab } from './TenantLeaseDocsTab';

const TABS = [
  { id:'overview',  label:'Overview',   icon: PieChart  },
  { id:'ledger',    label:'Ledger',     icon: FileText  },
  { id:'invoices',  label:'Billing',    icon: Receipt   },
  { id:'lease',     label:'Lease',      icon: Calendar  },
  { id:'documents', label:'Documents',  icon: FileCheck },
];

export function TenantDetailsView({ tenant, onClose, companies, allTenants }: {
  tenant: Tenant; onClose: () => void; companies: Company[]; allTenants: Tenant[];
}) {
  const [details,         setDetails]         = useState<any>(null);
  const [ledgerData,      setLedgerData]      = useState<{ ledger: LedgerEntry[]; summary: LedgerSummary } | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [ledgerLoading,   setLedgerLoading]   = useState(true);
  const [activeTab,       setActiveTab]       = useState('overview');
  const [showOpeningAdj,  setShowOpeningAdj]  = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice,  setEditingInvoice]  = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [payingInvoice,   setPayingInvoice]   = useState<Invoice | null>(null);
  const [exportingExcel,  setExportingExcel]  = useState(false);
  const [exportingPDF,    setExportingPDF]    = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const tenantId     = tenant?.id || (tenant as any)?._id || '';
  const company      = companies.find(c => c.companyName === tenant.company);
  const { invoices = [], paymentSummary = {}, analytics = {} } = details || {};
  const lockInExpiry = tenant.leaseStart ? (() => {
    const d = new Date(tenant.leaseStart);
    d.setMonth(d.getMonth() + (tenant.lockIn || 0));
    return d.toISOString().split('T')[0];
  })() : '';

  // Chart data from analytics.monthlyTrend
  const chartData = (analytics?.monthlyTrend || []) as { month: string; invoiced: number; received: number }[];

  useEffect(() => {
    if (!tenantId) return;
    fetchDetails(); fetchLedger();
  }, [tenantId]);

  const fetchDetails = () => {
    setLoading(true);
    axios.get(`/api/tenants/${tenantId}/details`)
      .then(r => { setDetails(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchLedger = () => {
    setLedgerLoading(true);
    axios.get(`/api/ledger/tenant/${tenantId}`)
      .then(r => { setLedgerData(r.data); setLedgerLoading(false); })
      .catch(() => setLedgerLoading(false));
  };

  const handleDeleteInvoice = async (id: string) => {
    try { await axios.delete(`/api/invoices/${id}`); setDeletingInvoice(null); fetchDetails(); }
    catch { alert('Failed to delete invoice'); }
  };

  const handleExportExcel = () => {
    if (!ledgerData) return toast.error('Ledger not loaded');
    setExportingExcel(true);
    try {
      exportToExcel(
        [...ledgerData.ledger.map(e => ({ Date: new Date(e.date).toLocaleDateString('en-GB'), Particular: e.particular, Type: e.type, 'Ref No': e.refNo||'-', Debit: e.debit, Credit: e.credit, TDS: e.tds, Balance: e.runningBalance })),
         { Date:'TOTAL', Particular:'', Type:'', 'Ref No':'', Debit: ledgerData.summary.totalInvoiced, Credit: ledgerData.summary.totalReceived, TDS: ledgerData.summary.totalTds, Balance: ledgerData.summary.closingBalance }],
        `Ledger_${tenant.name}`, 'Ledger'
      );
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
    } catch (err: any) {
      toast.error('PDF export failed: ' + err.message);
    } finally { setExportingPDF(false); }
  };

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:12 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ fontSize:12, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.1em' }}>Loading tenant data...</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#F5F7FA' }}>

      {/* ── Sticky Header ── */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', borderBottom:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, border:'1.5px solid #f0f2f5', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#5a6474', fontFamily:'inherit' }}>
                <X size={16}/>
              </button>
              <div style={{ width:38, height:38, borderRadius:11, background:'#f97316', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{tenant.name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>{tenant.name}</p>
                <p style={{ fontSize:10, color:'#9ba8b5', margin:0 }}>{tenant.code} · {tenant.company}</p>
              </div>
            </div>
            
          </div>

          {/* Tab Bar */}
          <div style={{ display:'flex', gap:0, borderTop:'1px solid #f8f9fb' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', background:'none', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight: activeTab===t.id ? 700 : 500, color: activeTab===t.id ? '#f97316' : '#9ba8b5', borderBottom: activeTab===t.id ? '2px solid #f97316' : '2px solid transparent', transition:'all 0.15s' }}>
                <t.icon size={13}/>{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px' }}>
        <AnimatePresence mode="wait">

          {activeTab === 'overview' && (
            <TenantOverviewTab
              tenant={tenant} company={company}
              paymentSummary={paymentSummary}
              ledgerData={ledgerData}
              chartData={chartData}
            />
          )}

          {activeTab === 'ledger' && (
            <TenantLedgerTab
              tenant={tenant} company={company}
              ledgerData={ledgerData} ledgerLoading={ledgerLoading}
              ledgerRef={ledgerRef as React.RefObject<HTMLDivElement>}
              exportingExcel={exportingExcel} exportingPDF={exportingPDF}
              onAdjustment={() => setShowOpeningAdj(true)}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />
          )}

          {activeTab === 'invoices' && (
            <TenantBillingTab
              invoices={invoices}
              onPay={setPayingInvoice}
              onView={setSelectedInvoice}
              onEdit={setEditingInvoice}
              onDelete={setDeletingInvoice}
            />
          )}

          {activeTab === 'lease' && (
            <TenantLeaseTab tenant={tenant} lockInExpiry={lockInExpiry}/>
          )}

          {activeTab === 'documents' && (
            <TenantDocumentsTab tenant={tenant}/>
          )}

        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showOpeningAdj && (
          <OpeningAdjustmentModal tenant={tenant}
            onClose={() => setShowOpeningAdj(false)}
            onSuccess={() => { setShowOpeningAdj(false); fetchLedger(); fetchDetails(); }}/>
        )}
        {selectedInvoice && (
          <ViewInvoiceModal invoice={selectedInvoice}
            tenant={allTenants.find(t => t.id === selectedInvoice.tenantId)}
            company={companies.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}/>
        )}
        {editingInvoice && (
          <InvoiceFormModal tenants={allTenants} companies={companies}
            initialData={(editingInvoice as any)?.id ? editingInvoice : undefined}
            preSelectedTenant={tenant}
            onClose={() => setEditingInvoice(null)}
            onSuccess={() => { setEditingInvoice(null); fetchDetails(); fetchLedger(); }}/>
        )}
        {deletingInvoice && (
          <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}>
            <div style={{ background:'#fff', borderRadius:20, padding:32, maxWidth:360, width:'90%', textAlign:'center' }}>
              <p style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' }}>Delete Invoice?</p>
              <p style={{ fontSize:12, color:'#9ba8b5', margin:'0 0 24px' }}>Invoice #{deletingInvoice.invoiceNo} will be permanently deleted.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button onClick={() => setDeletingInvoice(null)} style={{ padding:'10px 20px', background:'#f8f9fb', border:'1.5px solid #f0f2f5', borderRadius:10, cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Cancel</button>
                <button onClick={() => handleDeleteInvoice(deletingInvoice.id)} style={{ padding:'10px 20px', background:'#ef4444', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, color:'#fff', fontFamily:'inherit' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {payingInvoice && (
          <PaymentEntryModal invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
            onSuccess={() => { setPayingInvoice(null); fetchDetails(); fetchLedger(); }}/>
        )}
      </AnimatePresence>
    </div>
  );
}
