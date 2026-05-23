import { useState, useEffect }          from 'react';
import { Plus, Download }               from 'lucide-react';
import { AnimatePresence }              from 'motion/react';
import { toast }                        from 'react-hot-toast';
import { exportToExcel }                from '../src/lib/exportUtils';
import { type Invoice, type Tenant, type Company } from '../src/types';

// ── Sub-components ────────────────────────────────────────────────────────────
import { InvoiceStatCards }  from '../components/invoices/InvoiceStatCards';
import { InvoiceTable }      from '../components/invoices/InvoiceTable';
import { InvoiceDeleteModal }from '../components/invoices/InvoiceDeleteModal';
import { InvoiceFormModal, ViewInvoiceModal } from '../components/tenants/InvoiceModals';
import { formatCurrency } from '../src/utils/formatCurrency';

// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceList() {
  const [invoices,        setInvoices]        = useState<Invoice[]>([]);
  const [tenants,         setTenants]         = useState<Tenant[]>([]);
  const [companies,       setCompanies]       = useState<Company[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [exporting,       setExporting]       = useState(false);
  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState('All Status');
  const [monthFilter,     setMonthFilter]     = useState('All Months');
  const [companyFilter,   setCompanyFilter]   = useState('All Companies');
  const [showForm,        setShowForm]        = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice|null>(null);
  const [editingInvoice,  setEditingInvoice]  = useState<Invoice|null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice|null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = () => { fetchInvoices(); fetchTenants(); fetchCompanies(); };

  const fetchInvoices = () => {
    setLoading(true);
    fetch('/api/invoices')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setInvoices([]); setLoading(false); });
  };

  const fetchTenants = () => {
    fetch('/api/tenants').then(r=>r.ok?r.json():[]).then(d=>setTenants(Array.isArray(d)?d:[])).catch(()=>setTenants([]));
  };

  const fetchCompanies = () => {
    fetch('/api/companies').then(r=>r.ok?r.json():[]).then(d=>setCompanies(Array.isArray(d)?d:[])).catch(()=>setCompanies([]));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method:'DELETE' });
      if (res.ok) { setDeletingInvoice(null); fetchInvoices(); }
    } catch { toast.error('Delete failed'); }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(
        filtered.map(inv => ({
          'Date':           inv.billDate,
          'Invoice No.':    inv.invoiceNo,
          'Tenant':         inv.partyName,
          'Company':        inv.company,
          'Total Amount':   inv.totalInvoice,
          'Received':       inv.received    || 0,
          'TDS':            inv.tdsAmount   || 0,
          'Balance':        inv.balance     || 0,
          'Status':         inv.paymentStatus,
        })),
        `Invoices_${new Date().toISOString().split('T')[0]}`,
        'Invoices'
      );
      toast.success('Excel exported!');
    } catch { toast.error('Export failed'); }
    finally  { setExporting(false); }
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const q  = search.toLowerCase();
    const mQ = inv.invoiceNo.toLowerCase().includes(q) ||
               inv.partyName.toLowerCase().includes(q) ||
               inv.company.toLowerCase().includes(q);
    const mS = statusFilter   === 'All Status'    || inv.paymentStatus === statusFilter;
    const mM = monthFilter    === 'All Months'    || (inv.billDate && new Date(inv.billDate).getMonth() === parseInt(monthFilter));
    const mC = companyFilter  === 'All Companies' ||
               inv.companyId  === companyFilter   ||
               inv.company    === companyFilter;
    return mQ && mS && mM && mC;
  });

  const totalInvoiced    = filtered.reduce((a,i) => a+(i.totalInvoice||0), 0);
  const totalReceived    = filtered.reduce((a,i) => a+(i.received||0), 0);
  const totalOutstanding = filtered.reduce((a,i) => a+(i.balance||0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:24, maxWidth:1300, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.4px', margin:0 }}>Invoices</h1>
          <p style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:500 }}>Track monthly rent payments and outstanding balances.</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleExport} disabled={exporting||loading}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#10b981', color:'#fff', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(16,185,129,0.3)' }}>
            <Download size={14}/> {exporting?'Exporting...':'Download Excel'}
          </button>
          <button onClick={()=>setShowForm(true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 10px rgba(249,115,22,0.35)' }}>
            <Plus size={15}/> New Invoice
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <InvoiceStatCards
        totalInvoiced={totalInvoiced}
        totalReceived={totalReceived}
        totalOutstanding={totalOutstanding}
      />

      {/* ── Table + Filters ── */}
      <InvoiceTable
        invoices={filtered}
        companies={companies}
        loading={loading}
        search={search}
        statusFilter={statusFilter}
        monthFilter={monthFilter}
        companyFilter={companyFilter}
        onSearch={setSearch}
        onStatus={setStatusFilter}
        onMonth={setMonthFilter}
        onCompany={setCompanyFilter}
        onView={setSelectedInvoice}
        onEdit={setEditingInvoice}
        onDelete={setDeletingInvoice}
      />

      {/* ── Modals ── */}
      <AnimatePresence>
        {showForm && (
          <InvoiceFormModal tenants={tenants} companies={companies}
            onClose={()=>setShowForm(false)}
            onSuccess={()=>{ setShowForm(false); fetchInvoices(); }}/>
        )}
        {editingInvoice && (
          <InvoiceFormModal tenants={tenants} companies={companies} initialData={editingInvoice}
            onClose={()=>setEditingInvoice(null)}
            onSuccess={()=>{ setEditingInvoice(null); fetchInvoices(); }}/>
        )}
        {selectedInvoice && (
          <ViewInvoiceModal invoice={selectedInvoice}
            tenant={tenants.find(t=>t.id===selectedInvoice.tenantId)}
            company={companies.find(c=>c.id===selectedInvoice.companyId||c.companyName===selectedInvoice.company)}
            onClose={()=>setSelectedInvoice(null)}/>
        )}
        {deletingInvoice && (
          <InvoiceDeleteModal
            invoiceNo={deletingInvoice.invoiceNo}
            onConfirm={()=>handleDelete(deletingInvoice.id as string)}
            onCancel={()=>setDeletingInvoice(null)}/>
        )}
      </AnimatePresence>
    </div>
  );
}
