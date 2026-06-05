import React, { useState, useEffect } from 'react';
import {
  Plus, Search, ReceiptIndianRupee, Edit2, Trash2,
  Eye, X, Download, AlertCircle, ChevronDown, Loader2,
  TrendingUp, TrendingDown, Wallet, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Invoice, type Tenant, type Company } from '../src/types';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../src/lib/exportUtils';
import { InvoiceFormModal, ViewInvoiceModal } from '../components/tenants/InvoiceModals';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const STATUS: Record<string, { color: string; bg: string; dot: string }> = {
  Paid:    { color: '#059669', bg: '#d1fae5', dot: '#10b981' },
  Partial: { color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  Pending: { color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DEFAULT_PARTICULARS = ['Rental Charges','Common Area Maintenance','Electricity Charges','Water Charges','Parking Charges','Generator Charges','Housekeeping Charges'];

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoiceList() {
  const [invoices,       setInvoices]       = useState<Invoice[]>([]);
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [otherParties,   setOtherParties]   = useState<any[]>([]);
  const [companies,      setCompanies]      = useState<Company[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [exporting,      setExporting]      = useState(false);

  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [companyFilter,  setCompanyFilter]  = useState('All');
  const [typeFilter,     setTypeFilter]     = useState('All');
  const [monthFilter,    setMonthFilter]    = useState('All');
  const [showFilters,    setShowFilters]    = useState(false);

  const [showForm,       setShowForm]       = useState(false);
  const [selectedInvoice,setSelectedInvoice]= useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice,setDeletingInvoice]= useState<Invoice | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices').then(r => r.json()).catch(() => []),
      fetch('/api/tenants').then(r => r.json()).catch(() => []),
      fetch('/api/companies').then(r => r.json()).catch(() => []),
      fetch('/api/other-parties').then(r => r.json()).catch(() => []),
    ]).then(([inv, ten, com, op]) => {
      setInvoices(Array.isArray(inv) ? inv : []);
      setTenants(Array.isArray(ten) ? ten : []);
      setCompanies(Array.isArray(com) ? com : []);
      setOtherParties(Array.isArray(op) ? op : []);
    }).finally(() => setLoading(false));
  }, []);

  const refetch = () => {
    setLoading(true);
    fetch('/api/invoices').then(r => r.json()).then(d => setInvoices(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const allTypes = Array.from(new Set([
    ...DEFAULT_PARTICULARS,
    ...(invoices.flatMap(i => i.items?.map((it: any) => it.particular).filter(Boolean) || []))
  ])).sort();

  const filtered = invoices.filter(inv => {
    const q  = search.toLowerCase();
    const sOk = !search || inv.invoiceNo?.toLowerCase().includes(q) || inv.partyName?.toLowerCase().includes(q) || inv.company?.toLowerCase().includes(q);
    const stOk= statusFilter === 'All' || inv.paymentStatus === statusFilter;
    const cOk = companyFilter === 'All' || inv.companyId === companyFilter || inv.company === companyFilter;
    const tOk = typeFilter === 'All' || inv.items?.some((it: any) => it.particular?.toLowerCase().includes(typeFilter.toLowerCase()));
    const mOk = monthFilter === 'All' || (inv.billDate && new Date(inv.billDate).getMonth() === parseInt(monthFilter));
    return sOk && stOk && cOk && tOk && mOk;
  });

  const totalInvoiced    = filtered.reduce((s, i) => s + (i.totalInvoice || 0), 0);
  const totalReceived    = filtered.reduce((s, i) => s + (i.receivedAmount || i.received || 0), 0);
  const totalOutstanding = filtered.reduce((s, i) => s + (i.balanceAmount || i.balance || 0), 0);
  const paidCount        = filtered.filter(i => i.paymentStatus === 'Paid').length;
  const pendingCount     = filtered.filter(i => i.paymentStatus === 'Pending').length;

  const activeFilters = [statusFilter, companyFilter, typeFilter, monthFilter].filter(f => f !== 'All').length;

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
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
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#f97316', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <Plus size={15}/> New Invoice
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced',   value: fmt(totalInvoiced),    color: '#3b82f6', bg: '#eff6ff', icon: ReceiptIndianRupee },
          { label: 'Total Received',   value: fmt(totalReceived),    color: '#10b981', bg: '#f0fdf4', icon: TrendingUp },
          { label: 'Outstanding',      value: fmt(totalOutstanding), color: '#ef4444', bg: '#fff1f2', icon: TrendingDown },
          { label: 'Paid',             value: `${paidCount}`,        color: '#10b981', bg: '#f0fdf4', icon: Wallet },
          { label: 'Pending',          value: `${pendingCount}`,     color: '#ef4444', bg: '#fff1f2', icon: AlertCircle },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0f2f5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={s.color}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{s.label}</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: s.color, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</p>
              </div>
            </div>
          );
        })}
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
              onFocus={e => (e.target as HTMLElement).style.borderColor = '#f97316'}
              onBlur={e  => (e.target as HTMLElement).style.borderColor = '#f0f2f5'}
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
            <button onClick={() => { setSearch(''); setStatusFilter('All'); setCompanyFilter('All'); setTypeFilter('All'); setMonthFilter('All'); }}
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
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f2f5' }}>
                {['Invoice No', 'Party Name', 'Bill Date', 'Amount', 'Received', 'Balance', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '11px 14px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 3 && i <= 5 ? 'right' : i === 7 ? 'center' : 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #f0f2f5' }}>{h}</th>
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
                const st = STATUS[inv.paymentStatus] || { color: '#64748b', bg: '#f8fafc', dot: '#94a3b8' };
                const received = inv.receivedAmount || inv.received || 0;
                const balance  = inv.balanceAmount  || inv.balance  || 0;
                return (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.015 }}
                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                    {/* Invoice No */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace' }}>#{inv.invoiceNo}</span>
                    </td>

                    {/* Party Name */}
                    <td style={{ padding: '12px 14px', maxWidth: 180 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.partyName}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.company}</p>
                    </td>

                    {/* Bill Date */}
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(inv.billDate)}</td>

                    {/* Amount */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{fmt(inv.totalInvoice)}</span>
                    </td>

                    {/* Received */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: received > 0 ? '#10b981' : '#cbd5e1' }}>{fmt(received)}</span>
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>{fmt(balance)}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: st.dot, flexShrink: 0 }}/>
                        {inv.paymentStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button onClick={() => setSelectedInvoice(inv)} title="View"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.1s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; (e.currentTarget as HTMLElement).style.color = '#10b981'; (e.currentTarget as HTMLElement).style.borderColor = '#bbf7d0'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                          <Eye size={13}/> View
                        </button>
                        <button onClick={() => setEditingInvoice(inv)} title="Edit"
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.1s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fffbeb'; (e.currentTarget as HTMLElement).style.color = '#d97706'; (e.currentTarget as HTMLElement).style.borderColor = '#fde68a'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                          <Edit2 size={13}/> Edit
                        </button>
                        <button onClick={() => setDeletingInvoice(inv)} title="Delete"
                          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', transition: 'all 0.1s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff1f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#fecdd3'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
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
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Total: <span style={{ color: '#0f172a' }}>{fmt(totalInvoiced)}</span></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Received: <span style={{ color: '#10b981' }}>{fmt(totalReceived)}</span></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Balance: <span style={{ color: '#ef4444' }}>{fmt(totalOutstanding)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showForm && (
          <InvoiceFormModal tenants={tenants} otherParties={otherParties} companies={companies}
            onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }}/>
        )}
        {editingInvoice && (
          <InvoiceFormModal tenants={tenants} otherParties={otherParties} companies={companies}
            initialData={editingInvoice} onClose={() => setEditingInvoice(null)}
            onSuccess={() => { setEditingInvoice(null); refetch(); }}/>
        )}
        {selectedInvoice && (
          <ViewInvoiceModal invoice={selectedInvoice}
            tenant={tenants.find(t => t.id === selectedInvoice.tenantId)}
            company={companies.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}/>
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
                <button onClick={() => handleDelete(deletingInvoice.id!)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}