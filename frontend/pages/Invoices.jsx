import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2,
  Eye, X, Download, AlertCircle, Loader2,
  Filter, IndianRupee, CheckCircle2, Clock, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../src/lib/exportUtils.js';
import { InvoiceFormModal, ViewInvoiceModal } from '../components/tenants/InvoiceModals.jsx';
import { usePermission } from '../src/hooks/usePermission.js';
import { fmtINR, fmtDate } from '../src/utils/formatCurrency.js';
import { MONTHS, DEFAULT_PARTICULARS } from '../src/constants/index.js';
import StatCard from '../src/components/ui/StatCard.jsx';
import { ActionButtons } from '../src/components/ui/ActionButtons.jsx';
import { PaymentStatusBadge } from '../src/components/ui/StatusBadge.jsx';
import { getCached, setCached, invalidate } from '../src/lib/apiCache.js';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoiceList() {
  const [invoices,       setInvoices]       = useState([]);
  const [tenants,        setTenants]        = useState([]);
  const [otherParties,   setOtherParties]   = useState([]);
  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [exporting,      setExporting]      = useState(false);

  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [companyFilter,  setCompanyFilter]  = useState('All');
  const [typeFilter,     setTypeFilter]     = useState('All');
  const [monthFilter,    setMonthFilter]    = useState('All');
  const [partyTypeFilter,setPartyTypeFilter]= useState('All');
  const [showFilters,    setShowFilters]    = useState(false);

  const [showForm,       setShowForm]       = useState(false);
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete } = usePermission('invoices');
  const [selectedInvoice,setSelectedInvoice]= useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deletingInvoice,setDeletingInvoice]= useState(null);

  useEffect(() => {
    // Show cached data instantly, then refetch silently in background
    const ci = getCached('invoices'), ct = getCached('tenants'),
          cc = getCached('companies'), co = getCached('other-parties');
    if (ci) { setInvoices(ci); setTenants(ct || []); setCompanies(cc || []); setOtherParties(co || []); setLoading(false); }

    Promise.all([
      fetch(`${API_URL}/api/invoices`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/tenants`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/companies`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/other-parties`).then(r => r.json()).catch(() => []),
    ]).then(([inv, ten, com, op]) => {
      const i = Array.isArray(inv) ? inv : [], t = Array.isArray(ten) ? ten : [],
            c = Array.isArray(com) ? com : [], o = Array.isArray(op)  ? op  : [];
      setInvoices(i); setTenants(t); setCompanies(c); setOtherParties(o);
      setCached('invoices', i); setCached('tenants', t);
      setCached('companies', c); setCached('other-parties', o);
    }).finally(() => setLoading(false));
  }, []);

  const refetch = () => {
    invalidate('invoices');
    fetch(`${API_URL}/api/invoices`).then(r => r.json()).then(d => {
      const i = Array.isArray(d) ? d : [];
      setInvoices(i); setCached('invoices', i);
    });
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const allTypes = useMemo(() => Array.from(new Set([
    ...DEFAULT_PARTICULARS,
    ...(invoices.flatMap(i => i.items?.map((it) => it.particular).filter(Boolean) || []))
  ])).sort(), [invoices]);

  const filtered = useMemo(() => invoices.filter(inv => {
    const q  = search.toLowerCase();
    const sOk = !search || inv.invoiceNo?.toLowerCase().includes(q) || inv.partyName?.toLowerCase().includes(q) || inv.company?.toLowerCase().includes(q);
    const stOk= statusFilter === 'All' || inv.paymentStatus === statusFilter;
    const cOk = companyFilter === 'All' || inv.companyId === companyFilter || inv.company === companyFilter;
    const tOk = typeFilter === 'All' || inv.items?.some((it) => it.particular?.toLowerCase().includes(typeFilter.toLowerCase()));
    const mOk = monthFilter === 'All' || (inv.billDate && new Date(inv.billDate).getMonth() === parseInt(monthFilter));
    const resolvedPartyType = inv.otherPartyId ? 'OtherParty' : inv.tenantId ? 'Tenant' : (inv.partyType || 'Tenant');
    const ptOk= partyTypeFilter === 'All' || resolvedPartyType === partyTypeFilter;
    return sOk && stOk && cOk && tOk && mOk && ptOk;
  }), [invoices, search, statusFilter, companyFilter, typeFilter, monthFilter, partyTypeFilter]);

  const totalInvoiced    = useMemo(() => filtered.reduce((s, i) => s + (i.totalInvoice || 0), 0), [filtered]);
  const totalReceived    = useMemo(() => filtered.reduce((s, i) => s + (i.receivedAmount || i.received || 0), 0), [filtered]);
  const totalOutstanding = useMemo(() => filtered.reduce((s, i) => s + (i.balanceAmount || i.balance || 0), 0), [filtered]);
  const paidCount        = useMemo(() => filtered.filter(i => i.paymentStatus === 'Paid').length, [filtered]);
  const pendingCount     = useMemo(() => filtered.filter(i => i.paymentStatus === 'Pending').length, [filtered]);

  const activeFilters = [statusFilter, companyFilter, typeFilter, monthFilter, partyTypeFilter].filter(f => f !== 'All').length;

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/invoices/${id}`, { method: 'DELETE' });
      setDeletingInvoice(null);
      refetch();
      toast.success('Invoice deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(
        filtered.map(inv => ({
          'Date': fmtDate(inv.billDate), 'Invoice No': inv.invoiceNo,
          'Party': inv.partyName, 'Company': inv.company,
          'Amount': inv.totalInvoice, 'Received': inv.receivedAmount || inv.received || 0,
          'TDS': inv.tdsAmount || 0, 'Balance': inv.balanceAmount || inv.balance || 0,
          'Status': inv.paymentStatus,
        })),
        `Invoices_${new Date().toISOString().split('T')[0]}`, 'Invoices'
      );
      toast.success('Excel exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Invoices</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 }}>Track rent payments & outstanding balances</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExport} disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#475569', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }}/> : <Download size={14}/>}
            Export Excel
          </button>
          {canAdd && (
            <button onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#f97316', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
              <Plus size={15}/> New Invoice
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced',  value: fmtINR(totalInvoiced),    sub: 'All bills combined', icon: IndianRupee,  iconColor: '#3b82f6', highlighted: true },
          { label: 'Total Received',  value: fmtINR(totalReceived),    sub: 'Payments collected', icon: CheckCircle2, iconColor: '#10b981' },
          { label: 'Outstanding',     value: fmtINR(totalOutstanding), sub: 'Pending dues',        icon: AlertCircle,  iconColor: '#ef4444' },
          { label: 'Paid',            value: `${paidCount}`,           sub: 'invoices',            icon: CheckCircle2, iconColor: '#10b981' },
          { label: 'Pending',         value: `${pendingCount}`,        sub: 'invoices',            icon: Clock,        iconColor: '#ef4444' },
        ].map(s => <StatCard key={s.label} {...s}/>)}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #f0f2f5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice, party, company..."
              style={{ width: '100%', padding: '8px 32px 8px 30px', border: '1.5px solid #f0f2f5', borderRadius: 9, fontSize: 12, color: '#0f172a', outline: 'none', background: '#f8fafc', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => (e.target).style.borderColor = '#f97316'}
              onBlur={e  => (e.target).style.borderColor = '#f0f2f5'}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={12}/></button>}
          </div>

          {/* Month Filter */}
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            style={{ padding: '8px 10px', border: '1.5px solid #f0f2f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 120 }}>
            <option value="All">All Months</option>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>

          {/* Status Filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 10px', border: '1.5px solid #f0f2f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 110 }}>
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>

          {/* More Filters toggle */}
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', border: `1.5px solid ${showFilters ? '#f97316' : '#f0f2f5'}`, borderRadius: 9, fontSize: 12, fontWeight: 600, color: showFilters ? '#f97316' : '#475569', background: showFilters ? '#fff7ed' : '#f8fafc', cursor: 'pointer', position: 'relative' }}>
            <Filter size={13}/> Filters
            {activeFilters > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilters}</span>
            )}
          </button>

          {/* Clear */}
          {(search || activeFilters > 0) && (
            <button onClick={() => { setSearch(''); setStatusFilter('All'); setCompanyFilter('All'); setTypeFilter('All'); setMonthFilter('All'); setPartyTypeFilter('All'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 9, border: '1px solid #fecdd3', background: '#fff1f2', fontSize: 11, fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
              <X size={11}/> Clear
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filtered.length} invoices
          </span>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid #f8fafc' }}>
                {/* Company */}
                <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #f0f2f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1, minWidth: 160 }}>
                  <option value="All">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                {/* Charge Type */}
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #f0f2f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1, minWidth: 180 }}>
                  <option value="All">All Charge Types</option>
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {/* Party Type */}
                <select value={partyTypeFilter} onChange={e => setPartyTypeFilter(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #f0f2f5', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#475569', background: '#f8fafc', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1, minWidth: 160 }}>
                  <option value="All">All Parties</option>
                  <option value="Tenant">Tenants</option>
                  <option value="OtherParty">Other Parties</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #eef0f4' }}>
                {['Invoice No', 'Party Name', 'Bill Date', 'Amount', 'Received', 'Balance', 'Status', 'Workflow', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 600, color: '#9ba8b5', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i >= 3 && i <= 5 ? 'right' : i === 7 ? 'center' : 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #eef0f4' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} style={{ padding: '14px', }}>
                        <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, width: j === 1 ? '80%' : j === 0 ? '60%' : '50%', animation: 'pulse 1.5s infinite' }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: '#cbd5e1' }}>
                  <ReceiptIndianRupee size={32} strokeWidth={1.5} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }}/>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No invoices found</p>
                  <p style={{ fontSize: 11, color: '#e2e8f0', margin: '4px 0 0' }}>Try adjusting your filters</p>
                </td></tr>
              ) : filtered.map((inv, idx) => {
                const received = inv.receivedAmount || inv.received || 0;
                const balance  = inv.balanceAmount  || inv.balance  || 0;
                return (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.015 }}
                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget).style.background = '#fafbff'}
                    onMouseLeave={e => (e.currentTarget).style.background = 'transparent'}>

                    {/* Invoice No */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>#{inv.invoiceNo}</span>
                    </td>

                    {/* Party Name */}
                    <td style={{ padding: '13px 16px', maxWidth: 180 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.partyName}</p>
                      <p style={{ fontSize: 11, color: '#9ba8b5', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.company}</p>
                    </td>

                    {/* Bill Date */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#64748b', fontWeight: 400, whiteSpace: 'nowrap' }}>{fmtDate(inv.billDate)}</td>

                    {/* Amount */}
                    <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtINR(inv.totalInvoice)}</span>
                    </td>

                    {/* Received */}
                    <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: received > 0 ? '#10b981' : '#cbd5e1' }}>{fmtINR(received)}</span>
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: balance > 0 ? '#ef4444' : '#10b981' }}>{fmtINR(balance)}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <PaymentStatusBadge status={inv.paymentStatus}/>
                    </td>

                    {/* Workflow */}
                    <td style={{ padding: '13px 16px', textAlign:'center' }}>
                      <button
                        onClick={() => navigate(`/invoices/${inv.id || inv._id}/workflow`)}
                        style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #bbf7d0', background:'#f0fdf4', cursor:'pointer', fontSize:11, fontWeight:600, color:'#15803d', display:'inline-flex', alignItems:'center', gap:5, transition:'all 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#15803d'; e.currentTarget.style.color='#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.color='#15803d'; }}>
                        <GitBranch size={12}/> Workflow
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 16px' }}>
                      <ActionButtons buttons={[
                        { icon: Eye,    title: 'View',   onClick: () => setSelectedInvoice(inv),  color: '#3b82f6', hbg: '#eff6ff' },
                        { icon: Edit2,  show: canEdit,   title: 'Edit',   onClick: () => setEditingInvoice(inv),   color: '#f97316', hbg: '#fff7ed' },
                        { icon: Trash2, show: canDelete, title: 'Delete', onClick: () => setDeletingInvoice(inv), color: '#ef4444', hbg: '#fff1f2' },
                      ]}/>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid #f0f2f5', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{filtered.length} records</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Total: <span style={{ color: '#0f172a' }}>{fmtINR(totalInvoiced)}</span></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Received: <span style={{ color: '#10b981' }}>{fmtINR(totalReceived)}</span></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Balance: <span style={{ color: '#ef4444' }}>{fmtINR(totalOutstanding)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showForm && (
          <InvoiceFormModal tenants={tenants} otherParties={otherParties} companies={companies}
            onClose={() => setShowForm(false)}
            onSuccess={(saved) => {
              setShowForm(false);
              if (saved) setInvoices(prev => [{ ...saved, id: saved._id || saved.id }, ...prev]);
              refetch();
            }}/>
        )}
        {editingInvoice && (
          <InvoiceFormModal tenants={tenants} otherParties={otherParties} companies={companies}
            initialData={editingInvoice} onClose={() => setEditingInvoice(null)}
            onSuccess={(saved) => {
              setEditingInvoice(null);
              if (saved) {
                const freshId = String(saved.id || saved._id);
                setInvoices(prev => prev.map(inv =>
                  String(inv.id || inv._id) === freshId ? { ...saved, id: freshId } : inv
                ));
              }
              refetch();
            }}/>
        )}
        {selectedInvoice && (
          <ViewInvoiceModal invoice={selectedInvoice}
            tenant={
              tenants.find(t => String(t.id||t._id) === String(selectedInvoice.tenantId)) ||
              otherParties.find(p => String(p.id||p._id) === String(selectedInvoice.otherPartyId))
            }
            company={companies.find(c => String(c.id||c._id) === String(selectedInvoice.companyId) || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}
            onApprove={(updated) => { setSelectedInvoice(updated); refetch(); }}/>
        )}
        {deletingInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}
              style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertCircle size={24} color="#ef4444"/>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Delete Invoice?</p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>
                Invoice <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>#{deletingInvoice.invoiceNo}</strong> will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeletingInvoice(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                <button onClick={() => handleDelete(deletingInvoice.id)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}