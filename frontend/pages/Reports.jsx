import { useState, useEffect, useRef } from 'react';
import {
  Search, Download, TrendingUp, Clock,
  ReceiptIndianRupee, ShieldCheck, FileDown,
  CalendarDays, ChevronDown, Building2, X,
  CheckCircle2, AlertCircle, Loader2, IndianRupee,
  Users, AlertTriangle, CheckCircle, FileText,
  MessageSquarePlus, Trash2, Send, Eye
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '../src/lib/exportUtils.js';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import { TenantDetailsView } from '../components/tenants/TenantDetailsView.jsx';
// jspdf-autotable not installed — using manual table

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const REPORT_TYPES = [
  { key: 'collection',  label: 'Rent Collection',   sub: 'Billing vs Recovery',    icon: TrendingUp,         color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'pending',     label: 'Pending Dues',       sub: 'Aging Receivables',       icon: Clock,              color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
  { key: 'outstanding', label: 'Outstanding Dues',   sub: 'Tenant Wise Balance',     icon: IndianRupee,        color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { key: 'gst',         label: 'GST Audit',          sub: 'Tax Filing Summary',      icon: ReceiptIndianRupee, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { key: 'tds',         label: 'TDS Compliance',     sub: 'Withholding Summary',     icon: ShieldCheck,        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
];

const STATUS_STYLE = {
  Paid:    { color: '#059669', bg: '#d1fae5' },
  Partial: { color: '#d97706', bg: '#fef3c7' },
  Pending: { color: '#dc2626', bg: '#fee2e2' },
};

// ── Round & format amount ─────────────────────────────────────────────────────
const fmt = n => Math.round(n || 0).toLocaleString('en-IN');

// ── Summary compute ───────────────────────────────────────────────────────────
function computeSummary(invoices, type) {
  const totalInvoiced  = invoices.reduce((s, i) => s + (i.totalInvoice || 0), 0);
  const totalReceived  = invoices.reduce((s, i) => s + (i.receivedAmount || (i).received || 0), 0);
  const totalBalance   = invoices.reduce((s, i) => s + (i.balanceAmount || (i).balance || 0), 0);
  const totalGst       = invoices.reduce((s, i) => s + ((i.cgst || 0) + (i.sgst || 0)), 0);
  const totalTds       = invoices.reduce((s, i) => s + (i.tdsAmount || 0), 0);
  return { totalInvoiced, totalReceived, totalBalance, totalGst, totalTds };
}

// ── Outstanding Dues PDF ──────────────────────────────────────────────────────
function generateOutstandingPDF(data, totalBalance) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const now = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('NEOTERIC PROPERTIES', 14, 11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('OUTSTANDING DUES REPORT', 14, 18);
  doc.setFontSize(8);
  doc.text(`Tenant Wise Balance · Generated: ${now}`, 14, 24);
  doc.text(`Total Records: ${data.length}`, 220, 18, { align: 'right' });
  doc.text(`Total Outstanding: Rs ${fmt(totalBalance)}`, 220, 24, { align: 'right' });

  // Summary cards
  const dueCount    = data.filter(d => d.closingBalance > 0).length;
  const creditCount = data.filter(d => d.closingBalance < 0).length;
  const cards = [
    { label: 'Total Tenants',      value: `${data.length}`,               color: [220,38,38]   },
    { label: 'Total Outstanding',  value: `Rs ${fmt(totalBalance)}`,      color: [220,38,38]   },
    { label: 'With Dues',          value: `${dueCount}`,                  color: [239,68,68]   },
    { label: 'Clear (Nil/Credit)', value: `${data.length - dueCount}`,    color: [16,185,129]  },
  ];
  let cx = 14;
  cards.forEach(card => {
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, 33, 56, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text(card.label.toUpperCase(), cx + 5, 40);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(card.value, cx + 5, 47);
    cx += 60;
  });

  // Table header
  const cols = [
    { header: '#',               width: 12  },
    { header: 'Tenant Name',     width: 110 },
    { header: 'Closing Balance', width: 55  },
    { header: 'Status',          width: 30  },
  ];
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const startX = 14;
  let ty = 58;

  doc.setFillColor(15, 23, 42);
  doc.rect(startX, ty, totalW, 8, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(7); doc.setFont('helvetica','bold');
  let hx = startX;
  cols.forEach(col => { doc.text(col.header, hx + 2, ty + 5.5); hx += col.width; });
  ty += 8;

  // Data rows
  data.forEach((d, ri) => {
    if (ty > 185) { doc.addPage(); ty = 14; }
    if (ri % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(startX, ty, totalW, 7, 'F'); }
    const isDue    = d.closingBalance > 0;
    const isCredit = d.closingBalance < 0;
    const statusLabel = isDue ? 'DUE' : isCredit ? 'CREDIT' : 'NIL';
    const balStr      = `Rs ${fmt(Math.abs(d.closingBalance))}${isCredit ? ' (Cr)' : ''}`;
    let rx = startX;
    [ri + 1, d.tenantName, balStr, statusLabel].forEach((val, ci) => {
      const v = String(val || '');
      if (ci === 2) doc.setTextColor(isDue ? 220 : isCredit ? 16 : 100, isDue ? 38 : isCredit ? 185 : 116, isDue ? 38 : isCredit ? 129 : 136);
      else          doc.setTextColor(30,30,30);
      doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text(v.length > 24 ? v.slice(0,22)+'..' : v, rx + 2, ty + 5);
      rx += cols[ci].width;
    });
    ty += 7;
  });

  // Footer
  doc.setFillColor(15, 23, 42);
  doc.rect(startX, ty + 2, totalW, 8, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
  doc.text(`TOTAL (${data.length} tenants)`, startX + 2, ty + 7.5);
  doc.text(`Rs ${fmt(totalBalance)}`, startX + cols[0].width + cols[1].width + 2, ty + 7.5);

  doc.save('Outstanding_Dues_Report.pdf');
}

// ── PDF Generator ─────────────────────────────────────────────────────────────
function generatePDF(invoices, reportType, month, year) {
  const doc  = new jsPDF('l', 'mm', 'a4');
  const rt   = REPORT_TYPES.find(r => r.key === reportType);
  const now  = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const sum  = computeSummary(invoices, reportType);

  // ── Header band ──
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('NEOTERIC PROPERTIES', 14, 11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(`${rt.label.toUpperCase()} REPORT`, 14, 18);
  doc.setFontSize(8);
  doc.text(`Period: ${month !== 'All' ? month : 'All Months'}${year !== 'All' ? ' ' + year : ''} · Generated: ${now}`, 14, 24);

  // right side
  doc.setFontSize(8);
  doc.text(`Total Records: ${invoices.length}`, 220, 11, { align: 'right' });
  doc.text(`Total Invoiced ${fmt(sum.totalInvoiced)}`, 220, 18, { align: 'right' });
  doc.text(`Total Received ${fmt(sum.totalReceived)}`, 220, 24, { align: 'right' });

  // ── Summary cards ──
  const cards = [
    { label: 'Total Invoiced',  value: `Rs ${fmt(sum.totalInvoiced)}`,  color: [59,130,246]  },
    { label: 'Total Received',  value: `Rs ${fmt(sum.totalReceived)}`,  color: [16,185,129]  },
    { label: 'Outstanding',     value: `Rs ${fmt(sum.totalBalance)}`,   color: [239,68,68]   },
    ...(reportType === 'gst' ? [{ label: 'Total GST', value: `Rs ${fmt(sum.totalGst)}`, color: [99,102,241] }] : []),
    ...(reportType === 'tds' ? [{ label: 'Total TDS', value: `Rs ${fmt(sum.totalTds)}`, color: [245,158,11] }] : []),
  ];

  let cx = 14;
  cards.forEach(card => {
    doc.setFillColor(...card.color);
    doc.roundedRect(cx, 33, 56, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.text(card.label.toUpperCase(), cx + 5, 40);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(card.value, cx + 5, 47);
    cx += 60;
  });

  // ── Table ──
  const cols = [
    { header: '#',           dataKey: 'no'       },
    { header: 'Date',        dataKey: 'date'     },
    { header: 'Invoice No.', dataKey: 'invNo'    },
    { header: 'Party Name',  dataKey: 'party'    },
    { header: 'Invoiced',    dataKey: 'invoiced' },
  ];

  if (reportType === 'collection') { cols.push({ header: 'Received', dataKey: 'received' }, { header: 'Balance', dataKey: 'balance' }); }
  if (reportType === 'pending')    { cols.push({ header: 'Outstanding', dataKey: 'balance' }); }
  if (reportType === 'gst')        { cols.push({ header: 'CGST', dataKey: 'cgst' }, { header: 'SGST', dataKey: 'sgst' }, { header: 'Total GST', dataKey: 'gst' }); }
  if (reportType === 'tds')        { cols.push({ header: 'TDS Deducted', dataKey: 'tds' }, { header: 'Net Received', dataKey: 'net' }); }
  cols.push({ header: 'Status', dataKey: 'status' });

  const rows = invoices.map((inv, i) => ({
    no:       i + 1,
    date:     new Date(inv.billDate).toLocaleDateString('en-GB'),
    invNo:    `#${inv.invoiceNo}`,
    party:    inv.partyName,
    invoiced: `Rs ${fmt(inv.totalInvoice)}`,
    received: `Rs ${fmt(inv.receivedAmount || inv.received)}`,
    balance:  `Rs ${fmt(inv.balanceAmount || inv.balance)}`,
    cgst:     `Rs ${fmt(inv.cgst)}`,
    sgst:     `Rs ${fmt(inv.sgst)}`,
    gst:      `Rs ${fmt((inv.cgst || 0) + (inv.sgst || 0))}`,
    tds:      `Rs ${fmt(inv.tdsAmount)}`,
    net:      `Rs ${fmt(inv.receivedAmount || inv.received)}`,
    status:   inv.paymentStatus,
  }));

  // Manual table drawing
  let ty = 58;
  const colW = cols.map((c) => c.dataKey === 'party' ? 50 : c.dataKey === 'no' ? 10 : 30);
  const totalW = colW.reduce((a, b) => a + b, 0);
  const startX = 14;

  // Header row
  doc.setFillColor(15, 23, 42);
  doc.rect(startX, ty, totalW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  let hx = startX;
  cols.forEach((col, ci) => {
    doc.text(col.header, hx + 2, ty + 5.5);
    hx += colW[ci];
  });
  ty += 8;

  // Data rows
  rows.forEach((row, ri) => {
    if (ty > 185) { doc.addPage(); ty = 14; }
    if (ri % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(startX, ty, totalW, 7, 'F'); }
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    let rx = startX;
    cols.forEach((col, ci) => {
      const val = String(row[col.dataKey] || '');
      doc.text(val.length > 18 ? val.slice(0,16)+'..' : val, rx + 2, ty + 5);
      rx += colW[ci];
    });
    ty += 7;
  });

  // Footer row
  doc.setFillColor(15, 23, 42);
  doc.rect(startX, ty + 2, totalW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', startX + 2, ty + 7.5);
  let fx = startX + colW[0] + colW[1] + colW[2] + colW[3];
  doc.text(`Rs ${fmt(sum.totalInvoiced)}`, fx + 2, ty + 7.5);

  const label = month !== 'All' ? `${month}_${year}` : 'All';
  doc.save(`${rt.label.replace(/ /g,'_')}_Report_${label}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const [invoices,       setInvoices]       = useState([]);
  const [outstandingDues, setOutstandingDues] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [reportType,     setReportType]     = useState('collection');
  const [searchTerm,     setSearchTerm]     = useState('');
  const [selMonth,       setSelMonth]       = useState('All');
  const [selYear,        setSelYear]        = useState('All');
  const [exporting,      setExporting]      = useState(false);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [companies,      setCompanies]      = useState([]);
  const [viewTenant,     setViewTenant]     = useState(null); // { id, name, partyType }
  const [remarkCounts,   setRemarkCounts]   = useState({});  // { [invoiceId]: count }
  const [remarkModal,    setRemarkModal]    = useState(null);
  const [modalRemarks,   setModalRemarks]   = useState([]);
  const [modalInput,     setModalInput]     = useState('');
  const [modalAdding,    setModalAdding]    = useState(false);
  const [modalLoading,   setModalLoading]   = useState(false);

  // Load remark counts once data is ready
  useEffect(() => {
    if (loading) return;
    const invoiceIds = invoices.map(inv => String(inv._id)).filter(Boolean);
    const tenantIds  = outstandingDues.map(d => String(d.tenantId || d.tenantName)).filter(Boolean);
    const allIds     = [...new Set([...invoiceIds, ...tenantIds])];
    if (!allIds.length) return;
    axios.post('/api/report-remarks/counts', { invoiceIds: allIds })
      .then(r => setRemarkCounts(r.data))
      .catch(() => {});
  }, [loading]);

  // Fetch remarks for the opened row
  useEffect(() => {
    if (!remarkModal) return;
    setModalLoading(true);
    setModalRemarks([]);
    axios.get(`/api/report-remarks?invoiceId=${encodeURIComponent(remarkModal.invoiceId)}`)
      .then(r => setModalRemarks(r.data))
      .catch(() => {})
      .finally(() => setModalLoading(false));
  }, [remarkModal?.invoiceId]);

  const fmtRemarkDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
  };

  const handleModalAdd = async () => {
    const text = modalInput.trim();
    if (!remarkModal || !text) return;
    setModalAdding(true);
    try {
      const res = await axios.post('/api/report-remarks', { invoiceId: remarkModal.invoiceId, text });
      setModalRemarks(prev => [res.data, ...prev]);
      setRemarkCounts(prev => ({ ...prev, [remarkModal.invoiceId]: (prev[remarkModal.invoiceId] || 0) + 1 }));
      setModalInput('');
    } catch { toast.error('Failed to add remark'); }
    finally { setModalAdding(false); }
  };

  const handleModalDelete = async (id) => {
    try {
      await axios.delete(`/api/report-remarks/${id}`);
      setModalRemarks(prev => prev.filter(r => r._id !== id));
      setRemarkCounts(prev => ({ ...prev, [remarkModal.invoiceId]: Math.max(0, (prev[remarkModal.invoiceId] || 1) - 1) }));
    } catch { toast.error('Failed to delete remark'); }
  };

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/invoices'),
      axios.get('/api/ledger/outstanding-dues'),
      axios.get('/api/companies'),
    ])
      .then(([invResult, duesResult, compResult]) => {
        if (invResult.status  === 'fulfilled') setInvoices(invResult.value.data);
        if (duesResult.status === 'fulfilled') setOutstandingDues(duesResult.value.data);
        if (compResult.status === 'fulfilled') setCompanies(compResult.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Available years from data
  const years = ['All', ...Array.from(new Set(invoices.map(i => new Date(i.billDate).getFullYear().toString()))).sort().reverse()];

  // ── Filter ──
  const filtered = invoices.filter(inv => {
    const d     = new Date(inv.billDate);
    const mOk   = selMonth === 'All' || MONTHS[d.getMonth()] === selMonth;
    const yOk   = selYear  === 'All' || d.getFullYear().toString() === selYear;
    const sOk   = !searchTerm || inv.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const typeOk = reportType === 'pending' ? inv.paymentStatus !== 'Paid'
                 : reportType === 'gst'     ? (inv.cgst + inv.sgst) > 0
                 : reportType === 'tds'     ? (inv.tdsAmount || 0) > 0
                 : true;
    return mOk && yOk && sOk && typeOk;
  });

  const sum = computeSummary(filtered, reportType);
  const rt  = REPORT_TYPES.find(r => r.key === reportType);

  // If backend ledger API returned data use it; otherwise compute from invoices
  const outstandingSource = outstandingDues.length > 0
    ? outstandingDues
    : (() => {
        const map = {};
        invoices.forEach(inv => {
          const name = inv.partyName || 'Unknown';
          if (!map[name]) map[name] = { tenantName: name, closingBalance: 0 };
          map[name].closingBalance += (inv.balanceAmount || inv.balance || 0);
        });
        return Object.values(map).sort((a, b) => b.closingBalance - a.closingBalance);
      })();

  const filteredOutstanding = outstandingSource.filter(d =>
    !searchTerm || d.tenantName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalOutstandingBalance = filteredOutstanding.reduce((s, d) => s + (d.closingBalance || 0), 0);

  const handleExcel = () => {
    setExporting(true);
    try {
      const rows = filtered.map(inv => ({
        'Date':       new Date(inv.billDate).toLocaleDateString('en-GB'),
        'Invoice No': inv.invoiceNo,
        'Party':      inv.partyName,
        'Invoiced':   inv.totalInvoice,
        'Received':   inv.receivedAmount || (inv).received || 0,
        'Balance':    inv.balanceAmount  || (inv).balance  || 0,
        'GST':        (inv.cgst || 0) + (inv.sgst || 0),
        'TDS':        inv.tdsAmount || 0,
        'Status':     inv.paymentStatus,
      }));
      exportToExcel(rows, `${rt.label}_${selMonth}_${selYear}`, rt.label);
      toast.success('Excel exported');
    } catch { toast.error('Export failed'); }
    finally  { setExporting(false); }
  };

  const handlePDF = () => {
    setPdfLoading(true);
    setTimeout(() => {
      try {
        if (reportType === 'outstanding') generateOutstandingPDF(filteredOutstanding, totalOutstandingBalance);
        else                              generatePDF(filtered, reportType, selMonth, selYear);
        toast.success('PDF downloaded');
      }
      catch (e) { toast.error('PDF failed'); console.error(e); }
      finally { setPdfLoading(false); }
    }, 100);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12, color:'#94a3b8' }}>
      <Loader2 size={28} className="animate-spin" color="#f97316" />
      <p style={{ fontSize:13, fontWeight:600 }}>Loading reports...</p>
    </div>
  );

  if (viewTenant) {
    return (
      <TenantDetailsView
        tenant={{ id: viewTenant.id, _id: viewTenant.id, name: viewTenant.name }}
        onClose={() => setViewTenant(null)}
        companies={companies}
        allTenants={[]}
        apiBase={viewTenant.partyType === 'OtherParty' ? '/api/other-parties' : '/api/tenants'}
      />
    );
  }

  return (
    <>
    {/* ── Per-row Remark Modal ── */}
    <AnimatePresence>
      {remarkModal && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setRemarkModal(null)}>
          <motion.div
            initial={{ scale:0.95, y:10 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:10 }}
            style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MessageSquarePlus size={16} color="#f97316"/>
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'#0f172a', margin:0 }}>Remarks</p>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'1px 0 0', fontWeight:500, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{remarkModal.label}</p>
                </div>
              </div>
              <button onClick={() => setRemarkModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4, borderRadius:6 }}>
                <X size={18}/>
              </button>
            </div>

            {/* Remarks list */}
            <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
              {modalLoading ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <Loader2 size={20} className="animate-spin" color="#f97316" style={{ display:'block', margin:'0 auto' }}/>
                </div>
              ) : modalRemarks.length === 0 ? (
                <div style={{ textAlign:'center', padding:'36px 0', color:'#cbd5e1' }}>
                  <MessageSquarePlus size={26} strokeWidth={1.5} style={{ display:'block', margin:'0 auto 8px' }}/>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>No remarks yet — add the first one</p>
                </div>
              ) : modalRemarks.map((r, idx) => (
                <div key={r._id}
                  style={{ padding:'12px 20px', borderBottom:'1px solid #f8fafc', display:'flex', gap:10, alignItems:'flex-start', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafbff'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#fff7ed', border:'1.5px solid #fed7aa', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                    <MessageSquarePlus size={11} color="#f97316"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, color:'#1e293b', margin:'0 0 3px', lineHeight:1.55, wordBreak:'break-word' }}>{r.text}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:0, fontWeight:500 }}>{fmtRemarkDate(r.createdAt)}</p>
                  </div>
                  <button onClick={() => handleModalDelete(r._id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#cbd5e1', padding:'2px 3px', borderRadius:5, flexShrink:0, transition:'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f2f5', display:'flex', gap:8, alignItems:'flex-end', flexShrink:0 }}>
              <textarea
                value={modalInput}
                onChange={e => setModalInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) handleModalAdd(); }}
                placeholder="Add a remark… (Ctrl+Enter to save)"
                rows={2}
                style={{ flex:1, padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:9, fontSize:12, color:'#1e293b', outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.5, background:'#f8fafc', boxSizing:'border-box' }}
              />
              <button onClick={handleModalAdd} disabled={modalAdding || !modalInput.trim()}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 15px', background: modalInput.trim() ? '#f97316' : '#f1f5f9', border:'none', borderRadius:9, fontSize:12, fontWeight:700, color: modalInput.trim() ? '#fff' : '#94a3b8', cursor: modalInput.trim() ? 'pointer' : 'not-allowed', height:40, transition:'all 0.15s' }}>
                {modalAdding ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
                Add
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>


    <div style={{ padding:'24px', minHeight:'100vh', background:'#f8fafc' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:'#0f172a', margin:0, letterSpacing:'-0.5px' }}>Financial Intelligence</h1>
          <p style={{ fontSize:12, color:'#94a3b8', margin:'4px 0 0', fontWeight:500 }}>Enterprise reporting & tax compliance engine</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleExcel} disabled={exporting}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, fontWeight:700, color:'#475569', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', opacity:exporting?0.6:1 }}>
            {exporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} Export Excel
          </button>
          <button onClick={handlePDF} disabled={pdfLoading}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'#0f172a', border:'none', borderRadius:10, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', boxShadow:'0 4px 12px rgba(15,23,42,0.25)', opacity:pdfLoading?0.7:1 }}>
            {pdfLoading ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14}/>} Download PDF
          </button>
        </div>
      </div>

      {/* ── Report Type Tabs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {REPORT_TYPES.map(r => {
          const Icon    = r.icon;
          const active  = reportType === r.key;
          return (
            <motion.button key={r.key} onClick={() => setReportType(r.key)}
              whileHover={{ y:-2 }} whileTap={{ scale:0.97 }}
              style={{ padding:'16px', borderRadius:14, border:`2px solid ${active ? r.border : '#f0f2f5'}`, background:active ? r.bg : '#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s', boxShadow:active ? `0 4px 16px ${r.color}22` : '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ width:34, height:34, borderRadius:10, background:active ? r.color : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <Icon size={17} color={active ? '#fff' : '#94a3b8'}/>
              </div>
              <p style={{ fontSize:13, fontWeight:800, color:active ? r.color : '#0f172a', margin:0 }}>{r.label}</p>
              <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{r.sub}</p>
            </motion.button>
          );
        })}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {(reportType === 'outstanding' ? [
          { label:'Total Tenants',      value:`${filteredOutstanding.length}`,                                    sub:'All entities',    Icon:Users,        icoColor:'#dc2626' },
          { label:'Total Outstanding',  value:`₹${fmt(totalOutstandingBalance)}`,                                 sub:'Balance due',     Icon:IndianRupee,  icoColor:'#ef4444' },
          { label:'With Dues',          value:`${filteredOutstanding.filter(d => d.closingBalance > 0).length}`,  sub:'Need attention',  Icon:AlertTriangle, icoColor:'#ef4444' },
          { label:'Clear / Credit',     value:`${filteredOutstanding.filter(d => d.closingBalance <= 0).length}`, sub:'Nil or advance',  Icon:CheckCircle,  icoColor:'#10b981' },
        ] : [
          { label:'Total Invoiced', value:`₹${fmt(sum.totalInvoiced)}`, sub:'All bills',    Icon:IndianRupee,  icoColor:'#3b82f6' },
          { label:'Total Received', value:`₹${fmt(sum.totalReceived)}`, sub:'Collected',    Icon:CheckCircle,  icoColor:'#10b981' },
          { label:'Outstanding',    value:`₹${fmt(sum.totalBalance)}`,  sub:'Pending',      Icon:AlertTriangle, icoColor:'#ef4444' },
          ...(reportType==='gst' ? [{ label:'Total GST', value:`₹${fmt(sum.totalGst)}`, sub:'Tax collected',  Icon:FileText, icoColor:'#6366f1' }] : []),
          ...(reportType==='tds' ? [{ label:'Total TDS', value:`₹${fmt(sum.totalTds)}`, sub:'TDS deducted',   Icon:FileText, icoColor:'#f59e0b' }] : []),
          { label:'Records', value:`${filtered.length}`, sub:'filtered', Icon:FileText, icoColor:'#64748b' },
        ]).map((s, i) => (
          <div key={s.label} style={{
            background:'#fff', borderRadius:14, padding:'20px 20px 16px', position:'relative', minHeight:108,
            border: i === 0 ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
            boxShadow: i === 0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow= i===0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)'; }}>
            <p style={{ fontSize:11, fontWeight:600, color:'#9ba8b5', margin:'0 0 10px', letterSpacing:'0.02em' }}>{s.label}</p>
            <p style={{ fontSize:26, fontWeight:900, color:'#1a1a2e', margin:0, letterSpacing:'-0.5px', lineHeight:1.1 }}>{s.value}</p>
            <p style={{ fontSize:11, color:'#b0b8c4', margin:'6px 0 0' }}>{s.sub}</p>
            <div style={{ position:'absolute', bottom:14, right:16 }}>
              <s.Icon size={26} color={s.icoColor} strokeWidth={1.5}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Search */}
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}/>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search party name or invoice no..."
            style={{ width:'100%', padding:'8px 10px 8px 32px', border:'1px solid #f0f2f5', borderRadius:9, fontSize:12, color:'#0f172a', outline:'none', background:'#f8fafc', fontFamily:'inherit', boxSizing:'border-box' }}/>
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }}><X size={12}/></button>}
        </div>

        {/* Month */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid #f0f2f5', borderRadius:9, background:'#f8fafc', cursor:'pointer', minWidth:130 }}>
          <CalendarDays size={13} color="#f97316"/>
          <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
            style={{ border:'none', background:'transparent', fontSize:12, fontWeight:600, color:'#0f172a', outline:'none', cursor:'pointer', fontFamily:'inherit', appearance:'none', width:'100%' }}>
            <option value="All">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={12} color="#94a3b8"/>
        </div>

        {/* Year */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid #f0f2f5', borderRadius:9, background:'#f8fafc', cursor:'pointer', minWidth:100 }}>
          <select value={selYear} onChange={e => setSelYear(e.target.value)}
            style={{ border:'none', background:'transparent', fontSize:12, fontWeight:600, color:'#0f172a', outline:'none', cursor:'pointer', fontFamily:'inherit', appearance:'none', width:'100%' }}>
            {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
          </select>
          <ChevronDown size={12} color="#94a3b8"/>
        </div>

        {/* Active filter chips */}
        {(selMonth !== 'All' || selYear !== 'All') && (
          <button onClick={() => { setSelMonth('All'); setSelYear('All'); }}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, background:'#fff7ed', border:'1px solid #fed7aa', fontSize:11, fontWeight:700, color:'#f97316', cursor:'pointer' }}>
            <X size={11}/> Clear Filters
          </button>
        )}

        <span style={{ marginLeft:'auto', fontSize:11, color:'#94a3b8', fontWeight:600, whiteSpace:'nowrap' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>

          {/* Outstanding Dues table */}
          {reportType === 'outstanding' ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #eef0f4' }}>
                  {['#', 'Tenant Name', 'Closing Balance', 'Status'].map((h, i) => (
                    <th key={h} style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign: i >= 2 ? 'right' : 'left', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>{h}</th>
                  ))}
                  <th style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>Remarks</th>
                  <th style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>View</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredOutstanding.map((d, idx) => {
                    const isDue    = d.closingBalance > 0;
                    const isCredit = d.closingBalance < 0;
                    const balColor = isDue ? '#dc2626' : isCredit ? '#10b981' : '#64748b';
                    const statusLabel = isDue ? 'Due' : isCredit ? 'Credit' : 'Nil';
                    const statusBg    = isDue ? '#fee2e2' : isCredit ? '#d1fae5' : '#f1f5f9';
                    const statusColor = isDue ? '#dc2626' : isCredit ? '#059669' : '#64748b';
                    return (
                      <motion.tr key={String(d.tenantId)} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.02 }}
                        style={{ borderBottom:'1px solid #f8fafc', transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'13px 16px', fontSize:12, color:'#9ba8b5', fontWeight:400 }}>{idx+1}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:500, color:'#1e293b' }}>{d.tenantName}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:balColor, textAlign:'right', whiteSpace:'nowrap' }}>
                          ₹{fmt(Math.abs(d.closingBalance))}
                        </td>
                        <td style={{ padding:'13px 16px', textAlign:'right' }}>
                          <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:20, background:statusBg, color:statusColor, fontSize:11, fontWeight:600 }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding:'10px 16px', textAlign:'center' }}>
                          {(() => {
                            const tid = String(d.tenantId || d.tenantName);
                            const cnt = remarkCounts[tid] || 0;
                            return (
                              <button
                                onClick={() => setRemarkModal({ invoiceId: tid, label: d.tenantName })}
                                title={cnt > 0 ? `${cnt} remark${cnt !== 1 ? 's' : ''}` : 'Add remark'}
                                style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color: cnt > 0 ? '#f97316' : '#cbd5e1', padding:'5px 7px', borderRadius:8, transition:'all 0.15s', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                onMouseEnter={e => { e.currentTarget.style.color='#f97316'; e.currentTarget.style.background='#fff7ed'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = cnt > 0 ? '#f97316' : '#cbd5e1'; e.currentTarget.style.background='none'; }}>
                                <MessageSquarePlus size={16}/>
                                {cnt > 0 && (
                                  <span style={{ position:'absolute', top:-3, right:-3, background:'#f97316', color:'#fff', borderRadius:'50%', width:15, height:15, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, lineHeight:1 }}>
                                    {cnt > 9 ? '9+' : cnt}
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </td>
                        <td style={{ padding:'10px 16px', textAlign:'center' }}>
                          <button
                            onClick={() => setViewTenant({ id: String(d.tenantId), name: d.tenantName, partyType: 'Tenant' })}
                            title="View tenant details"
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'5px 7px', borderRadius:8, transition:'all 0.15s', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                            onMouseEnter={e => { e.currentTarget.style.color='#3b82f6'; e.currentTarget.style.background='#eff6ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='none'; }}>
                            <Eye size={16}/>
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filteredOutstanding.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:'48px 0', color:'#cbd5e1' }}>
                    <AlertCircle size={28} strokeWidth={1.5} style={{ display:'block', margin:'0 auto 8px' }}/>
                    <p style={{ fontSize:13, fontWeight:600, margin:0 }}>No tenants found</p>
                  </td></tr>
                )}
              </tbody>
              {filteredOutstanding.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#0f172a', borderTop:'2px solid #0f172a' }}>
                    <td colSpan={2} style={{ padding:'12px 16px', fontSize:11, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'0.08em' }}>TOTAL ({filteredOutstanding.length} tenants)</td>
                    <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fca5a5', textAlign:'right' }}>₹{fmt(totalOutstandingBalance)}</td>
                    <td/>
                    <td/>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (

          /* Invoice-based tables */
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #eef0f4' }}>
                {['#','Date','Invoice No.','Party Name','Invoiced',
                  ...(reportType==='collection' ? ['Received','Balance'] : []),
                  ...(reportType==='pending'    ? ['Outstanding']        : []),
                  ...(reportType==='gst'        ? ['CGST','SGST','Total GST'] : []),
                  ...(reportType==='tds'        ? ['TDS Deducted','Net Received'] : []),
                  'Status'
                ].map((h,i) => (
                  <th key={h+i} style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:i>3?'right':'left', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>{h}</th>
                ))}
                <th style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>Remarks</th>
                <th style={{ padding:'11px 16px', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center', whiteSpace:'nowrap', borderBottom:'1px solid #eef0f4' }}>View</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((inv, idx) => {
                  const st = STATUS_STYLE[inv.paymentStatus] || { color:'#64748b', bg:'#f8fafc' };
                  return (
                    <motion.tr key={inv.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.02 }}
                      style={{ borderBottom:'1px solid #f8fafc', cursor:'default', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget).style.background='#fafbff'}
                      onMouseLeave={e => (e.currentTarget).style.background='transparent'}>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#9ba8b5', fontWeight:400 }}>{idx+1}</td>
                      <td style={{ padding:'13px 16px', fontSize:13, color:'#64748b', fontWeight:400, whiteSpace:'nowrap' }}>
                        {new Date(inv.billDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, fontWeight:600, color:'#475569' }}>#{inv.invoiceNo}</td>
                      <td style={{ padding:'13px 16px', fontSize:13, fontWeight:500, color:'#1e293b', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.partyName}</td>
                      <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#1e293b', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.totalInvoice)}</td>
                      {reportType==='collection' && <>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#10b981', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.receivedAmount || inv.received)}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#ef4444', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.balanceAmount || inv.balance)}</td>
                      </>}
                      {reportType==='pending' && <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#ef4444', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.balanceAmount || inv.balance)}</td>}
                      {reportType==='gst' && <>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:500, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.cgst)}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:500, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.sgst)}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt((inv.cgst||0)+(inv.sgst||0))}</td>
                      </>}
                      {reportType==='tds' && <>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#f59e0b', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.tdsAmount)}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#10b981', textAlign:'right', whiteSpace:'nowrap' }}>₹{fmt(inv.receivedAmount || inv.received)}</td>
                      </>}
                      <td style={{ padding:'13px 16px', textAlign:'right' }}>
                        <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:20, background:st.bg, color:st.color, fontSize:11, fontWeight:600 }}>{inv.paymentStatus}</span>
                      </td>
                      <td style={{ padding:'10px 16px', textAlign:'center' }}>
                        {(() => {
                          const invId = String(inv._id);
                          const cnt   = remarkCounts[invId] || 0;
                          return (
                            <button
                              onClick={() => setRemarkModal({ invoiceId: invId, label: `${inv.partyName} · #${inv.invoiceNo}` })}
                              title={cnt > 0 ? `${cnt} remark${cnt !== 1 ? 's' : ''}` : 'Add remark'}
                              style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color: cnt > 0 ? '#f97316' : '#cbd5e1', padding:'5px 7px', borderRadius:8, transition:'all 0.15s', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                              onMouseEnter={e => { e.currentTarget.style.color='#f97316'; e.currentTarget.style.background='#fff7ed'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = cnt > 0 ? '#f97316' : '#cbd5e1'; e.currentTarget.style.background='none'; }}>
                              <MessageSquarePlus size={16}/>
                              {cnt > 0 && (
                                <span style={{ position:'absolute', top:-3, right:-3, background:'#f97316', color:'#fff', borderRadius:'50%', width:15, height:15, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, lineHeight:1 }}>
                                  {cnt > 9 ? '9+' : cnt}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </td>
                      <td style={{ padding:'10px 16px', textAlign:'center' }}>
                        {(inv.tenantId || inv.otherPartyId) && (
                          <button
                            onClick={() => setViewTenant({
                              id:         String(inv.tenantId || inv.otherPartyId),
                              name:       inv.partyName,
                              partyType:  inv.partyType || 'Tenant',
                            })}
                            title="View tenant details"
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'5px 7px', borderRadius:8, transition:'all 0.15s', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                            onMouseEnter={e => { e.currentTarget.style.color='#3b82f6'; e.currentTarget.style.background='#eff6ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='none'; }}>
                            <Eye size={16}/>
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign:'center', padding:'48px 0', color:'#cbd5e1' }}>
                  <AlertCircle size={28} strokeWidth={1.5} style={{ marginBottom:8, display:'block', margin:'0 auto 8px' }}/>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>No records found for selected filters</p>
                </td></tr>
              )}
            </tbody>
            {/* Totals footer */}
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background:'#0f172a', borderTop:'2px solid #0f172a' }}>
                  <td colSpan={4} style={{ padding:'12px 16px', fontSize:11, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'0.08em' }}>TOTAL ({filtered.length} records)</td>
                  <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fff', textAlign:'right' }}>₹{fmt(sum.totalInvoiced)}</td>
                  {reportType==='collection' && <>
                    <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#6ee7b7', textAlign:'right' }}>₹{fmt(sum.totalReceived)}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fca5a5', textAlign:'right' }}>₹{fmt(sum.totalBalance)}</td>
                  </>}
                  {reportType==='pending'    && <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fca5a5', textAlign:'right' }}>₹{fmt(sum.totalBalance)}</td>}
                  {reportType==='gst'        && <><td/><td/><td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#c7d2fe', textAlign:'right' }}>₹{fmt(sum.totalGst)}</td></>}
                  {reportType==='tds'        && <><td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fde68a', textAlign:'right' }}>₹{fmt(sum.totalTds)}</td><td/></>}
                  <td/>
                  <td/>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
          )}
        </div>
      </div>

    </div>
    </>
  );
}