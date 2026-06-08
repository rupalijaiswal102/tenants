import { useState, useEffect, useRef } from 'react';
import {
  Search, Download, TrendingUp, Clock,
  ReceiptIndianRupee, ShieldCheck, FileDown,
  CalendarDays, ChevronDown, Building2, X,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '../src/lib/exportUtils.js';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
// jspdf-autotable not installed — using manual table

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const REPORT_TYPES = [
  { key: 'collection', label: 'Rent Collection', sub: 'Billing vs Recovery',    icon: TrendingUp,         color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'pending',    label: 'Pending Dues',    sub: 'Aging Receivables',       icon: Clock,              color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
  { key: 'gst',        label: 'GST Audit',       sub: 'Tax Filing Summary',      icon: ReceiptIndianRupee, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { key: 'tds',        label: 'TDS Compliance',  sub: 'Withholding Summary',     icon: ShieldCheck,        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
];

const STATUS_STYLE = {
  Paid:    { color: '#059669', bg: '#d1fae5' },
  Partial: { color: '#d97706', bg: '#fef3c7' },
  Pending: { color: '#dc2626', bg: '#fee2e2' },
};

// ── Summary compute ───────────────────────────────────────────────────────────
function computeSummary(invoices, type) {
  const totalInvoiced  = invoices.reduce((s, i) => s + (i.totalInvoice || 0), 0);
  const totalReceived  = invoices.reduce((s, i) => s + (i.receivedAmount || (i).received || 0), 0);
  const totalBalance   = invoices.reduce((s, i) => s + (i.balanceAmount || (i).balance || 0), 0);
  const totalGst       = invoices.reduce((s, i) => s + ((i.cgst || 0) + (i.sgst || 0)), 0);
  const totalTds       = invoices.reduce((s, i) => s + (i.tdsAmount || 0), 0);
  return { totalInvoiced, totalReceived, totalBalance, totalGst, totalTds };
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
  doc.text(`Total Invoiced ${sum.totalInvoiced.toLocaleString('en-IN')}`, 220, 18, { align: 'right' });
  doc.text(`Total Received ${sum.totalReceived.toLocaleString('en-IN')}`, 220, 24, { align: 'right' });

  // ── Summary cards ──
  const cards = [
    { label: 'Total Invoiced',  value: `Rs ${sum.totalInvoiced.toLocaleString('en-IN')}`,  color: [59,130,246]  },
    { label: 'Total Received',  value: `Rs ${sum.totalReceived.toLocaleString('en-IN')}`,  color: [16,185,129]  },
    { label: 'Outstanding',     value: `Rs ${sum.totalBalance.toLocaleString('en-IN')}`,   color: [239,68,68]   },
    ...(reportType === 'gst' ? [{ label: 'Total GST', value: `Rs ${sum.totalGst.toLocaleString('en-IN')}`, color: [99,102,241] }] : []),
    ...(reportType === 'tds' ? [{ label: 'Total TDS', value: `Rs ${sum.totalTds.toLocaleString('en-IN')}`, color: [245,158,11] }] : []),
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
    invoiced: `Rs ${(inv.totalInvoice || 0).toLocaleString('en-IN')}`,
    received: `Rs ${(inv.receivedAmount || (inv).received || 0).toLocaleString('en-IN')}`,
    balance:  `Rs ${(inv.balanceAmount || (inv).balance || 0).toLocaleString('en-IN')}`,
    cgst:     `Rs ${(inv.cgst || 0).toLocaleString('en-IN')}`,
    sgst:     `Rs ${(inv.sgst || 0).toLocaleString('en-IN')}`,
    gst:      `Rs ${((inv.cgst || 0) + (inv.sgst || 0)).toLocaleString('en-IN')}`,
    tds:      `Rs ${(inv.tdsAmount || 0).toLocaleString('en-IN')}`,
    net:      `Rs ${(inv.receivedAmount || (inv).received || 0).toLocaleString('en-IN')}`,
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
  doc.text(`Rs ${sum.totalInvoiced.toLocaleString('en-IN')}`, fx + 2, ty + 7.5);

  const label = month !== 'All' ? `${month}_${year}` : 'All';
  doc.save(`${rt.label.replace(/ /g,'_')}_Report_${label}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [reportType,  setReportType]  = useState('collection');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [selMonth,    setSelMonth]    = useState('All');
  const [selYear,     setSelYear]     = useState('All');
  const [exporting,   setExporting]   = useState(false);
  const [pdfLoading,  setPdfLoading]  = useState(false);

  useEffect(() => {
    Promise.all([axios.get('/api/invoices'), axios.get('/api/tenants')])
      .then(([inv]) => setInvoices(inv.data))
      .catch(console.error)
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
      try { generatePDF(filtered, reportType, selMonth, selYear); toast.success('PDF downloaded'); }
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

  return (
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Total Invoiced', value:`₹${sum.totalInvoiced.toLocaleString('en-IN')}`, color:'#3b82f6', bg:'#eff6ff' },
          { label:'Total Received', value:`₹${sum.totalReceived.toLocaleString('en-IN')}`, color:'#10b981', bg:'#f0fdf4' },
          { label:'Outstanding',    value:`₹${sum.totalBalance.toLocaleString('en-IN')}`,  color:'#ef4444', bg:'#fff1f2' },
          ...(reportType==='gst' ? [{ label:'Total GST', value:`₹${sum.totalGst.toLocaleString('en-IN')}`, color:'#6366f1', bg:'#eef2ff' }] : []),
          ...(reportType==='tds' ? [{ label:'Total TDS', value:`₹${sum.totalTds.toLocaleString('en-IN')}`, color:'#f59e0b', bg:'#fffbeb' }] : []),
          { label:'Records', value:`${filtered.length}`, color:'#64748b', bg:'#f8fafc' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${s.color}22` }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</p>
            <p style={{ fontSize:18, fontWeight:900, color:s.color, margin:0 }}>{s.value}</p>
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
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #f0f2f5' }}>
                {['#','Date','Invoice No.','Party Name','Invoiced',
                  ...(reportType==='collection' ? ['Received','Balance'] : []),
                  ...(reportType==='pending'    ? ['Outstanding']        : []),
                  ...(reportType==='gst'        ? ['CGST','SGST','Total GST'] : []),
                  ...(reportType==='tds'        ? ['TDS Deducted','Net Received'] : []),
                  'Status'
                ].map((h,i) => (
                  <th key={h+i} style={{ padding:'11px 16px', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:i>3?'right':'left', whiteSpace:'nowrap', borderBottom:'1px solid #f0f2f5' }}>{h}</th>
                ))}
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
                      <td style={{ padding:'11px 16px', fontSize:11, color:'#cbd5e1', fontWeight:600 }}>{idx+1}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:'#475569', fontWeight:600, whiteSpace:'nowrap' }}>
                        {new Date(inv.billDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:800, color:'#0f172a', background:'#f8fafc', padding:'3px 8px', borderRadius:6 }}>#{inv.invoiceNo}</span>
                      </td>
                      <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#0f172a', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.partyName}</td>
                      <td style={{ padding:'11px 16px', fontSize:12, fontWeight:800, color:'#0f172a', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.totalInvoice||0).toLocaleString('en-IN')}</td>
                      {reportType==='collection' && <>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.receivedAmount||(inv).received||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#ef4444', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.balanceAmount||(inv).balance||0).toLocaleString('en-IN')}</td>
                      </>}
                      {reportType==='pending' && <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#ef4444', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.balanceAmount||(inv).balance||0).toLocaleString('en-IN')}</td>}
                      {reportType==='gst' && <>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.cgst||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.sgst||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:800, color:'#6366f1', textAlign:'right', whiteSpace:'nowrap' }}>₹{((inv.cgst||0)+(inv.sgst||0)).toLocaleString('en-IN')}</td>
                      </>}
                      {reportType==='tds' && <>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#f59e0b', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.tdsAmount||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right', whiteSpace:'nowrap' }}>₹{(inv.receivedAmount||(inv).received||0).toLocaleString('en-IN')}</td>
                      </>}
                      <td style={{ padding:'11px 16px', textAlign:'right' }}>
                        <span style={{ display:'inline-block', padding:'3px 9px', borderRadius:20, background:st.bg, color:st.color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{inv.paymentStatus}</span>
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
                  <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fff', textAlign:'right' }}>₹{sum.totalInvoiced.toLocaleString('en-IN')}</td>
                  {reportType==='collection' && <>
                    <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#6ee7b7', textAlign:'right' }}>₹{sum.totalReceived.toLocaleString('en-IN')}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fca5a5', textAlign:'right' }}>₹{sum.totalBalance.toLocaleString('en-IN')}</td>
                  </>}
                  {reportType==='pending'    && <td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fca5a5', textAlign:'right' }}>₹{sum.totalBalance.toLocaleString('en-IN')}</td>}
                  {reportType==='gst'        && <><td/><td/><td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#c7d2fe', textAlign:'right' }}>₹{sum.totalGst.toLocaleString('en-IN')}</td></>}
                  {reportType==='tds'        && <><td style={{ padding:'12px 16px', fontSize:12, fontWeight:800, color:'#fde68a', textAlign:'right' }}>₹{sum.totalTds.toLocaleString('en-IN')}</td><td/></>}
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}