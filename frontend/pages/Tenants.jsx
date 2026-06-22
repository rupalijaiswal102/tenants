import React, { useRef ,useState, useEffect  } from 'react';
import { useResponsive } from '../src/hooks/useResponsive.js';

import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, Edit2, Trash2, Users, IndianRupee, ShieldCheck, Download, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { exportToExcel }          from '../src/lib/exportUtils.js';
import { usePermission }          from '../src/hooks/usePermission.js';
import { TenantDetailsView }      from '../components/tenants/TenantDetailsView.jsx';
import { StatusBadge }            from '../components/tenants/TenantPrimitives.jsx';
import { DeleteConfirmationModal } from '../components/tenants/DeleteConfirmationModal.jsx';
import TenantFormPage             from './TenantFormPage.jsx';

export default function TenantList({ mode = 'tenant' }) {
  const { id }   = useParams();
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();

  const [tenants,           setTenants]          = useState([]);
  const [companies,         setCompanies]         = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState('');
  const [monthFilter,       setMonthFilter]       = useState('All Months');
  const [companyFilter,     setCompanyFilter]     = useState('All Companies');
  const [selectedTenant,    setSelectedTenant]    = useState(null);
  const [showDetails,       setShowDetails]       = useState(false);
  const [tenantToDelete,    setTenantToDelete]    = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm,          setShowForm]          = useState(false);
  const [editFormId,        setEditFormId]        = useState(null);
  const [exporting,         setExporting]         = useState(false);
  const [pdfExporting,      setPdfExporting]      = useState(false);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [perPage,           setPerPage]           = useState(25);
  const { canAdd, canEdit, canDelete } = usePermission(mode === 'otherParty' ? 'otherParties' : 'tenants');

  useEffect(() => { fetchTenants(); fetchCompanies(); }, [mode]);

  useEffect(() => {
    if (id && !loading) {
      if (tenants.length > 0) {
        const t = tenants.find(x => 
          x.id === id || x._id === id || 
          String(x._id) === id || String(x.id) === id
        );
        if (t) { 
          setSelectedTenant(t); 
          setShowDetails(true); 
        } else {
          // Not found in list — fetch directly
          const apiBase = mode === 'otherParty' ? '/api/other-parties' : '/api/tenants';
          import('axios').then(({default: axios}) => {
            axios.get(`${apiBase}/${id}`)
              .then(r => { setSelectedTenant(r.data); setShowDetails(true); })
              .catch(() => {});
          });
        }
      }
    } else if (!id) {
      setShowDetails(false);
      setSelectedTenant(null);
    }
  }, [id, tenants, loading]);

  const fetchTenants = () => {
    setLoading(true);
    const apiBase = mode === 'otherParty' ? '/api/other-parties' : '/api/tenants';
    axios.get(apiBase)
      .then(r => { setTenants(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchCompanies = () => {
    axios.get('/api/companies')
      .then(r => setCompanies(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      const apiBase = mode === 'otherParty' ? '/api/other-parties' : '/api/tenants';
      await axios.delete(`${apiBase}/${tenantToDelete.id}`);
      toast.success('Tenant deleted');
      setShowDeleteConfirm(false);
      setTenantToDelete(null);
      fetchTenants();
    } catch { toast.error('Delete failed'); }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      exportToExcel(
        filtered.map(t => ({ Code:t.code, Name:t.name, Company:t.company, Property:t.property, Mobile:t.mobile, Email:t.email, Rent:t.currentRent, 'Lease Start':t.leaseStart, 'Lease End':t.leaseEnd, Status:t.agreementStatus })),
        `Tenants_${new Date().toISOString().split('T')[0]}`, 'Tenants'
      );
      toast.success('Exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleExportPDF = () => {
    setPdfExporting(true);
    setTimeout(() => {
      try {
        const doc  = new jsPDF('l', 'mm', 'a4');
        const now  = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        const title = mode === 'otherParty' ? 'OTHER PARTIES' : 'TENANTS';
        const sub   = mode === 'otherParty' ? 'Non-tenant billing parties' : 'Leasing records';

        // Header band
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 297, 28, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(16); doc.setFont('helvetica','bold');
        doc.text('NEOTERIC PROPERTIES', 14, 11);
        doc.setFontSize(9); doc.setFont('helvetica','normal');
        doc.text(`${title} LIST`, 14, 18);
        doc.setFontSize(8);
        doc.text(`${sub} · Generated: ${now}`, 14, 24);
        doc.text(`Total Records: ${filtered.length}`, 220, 18, { align:'right' });

        // Summary cards
        const activeC = filtered.filter(t => t.agreementStatus === 'Active').length;
        const rentSum = filtered.reduce((a, t) => a + (t.currentRent || 0), 0);
        const cards = [
          { label: mode === 'otherParty' ? 'Total Parties' : 'Total Tenants', value: `${filtered.length}`,                         color: [249,115,22]  },
          { label: 'Active Agreements',                                        value: `${activeC}`,                                  color: [16,185,129]  },
          { label: 'Monthly Rent Roll',                                        value: `Rs ${Math.round(rentSum).toLocaleString('en-IN')}`, color: [99,102,241]  },
        ];
        let cx = 14;
        cards.forEach(card => {
          doc.setFillColor(...card.color);
          doc.roundedRect(cx, 33, 62, 18, 3, 3, 'F');
          doc.setTextColor(255,255,255);
          doc.setFontSize(7); doc.setFont('helvetica','bold');
          doc.text(card.label.toUpperCase(), cx + 4, 40);
          doc.setFontSize(11); doc.setFont('helvetica','bold');
          doc.text(card.value, cx + 4, 47);
          cx += 66;
        });

        // Table columns
        const cols = [
          { header: '#',          width: 10  },
          { header: 'Code',       width: 18  },
          { header: mode === 'otherParty' ? 'Party Name' : 'Tenant Name', width: 55 },
          { header: 'Property / Address', width: 65 },
          { header: 'Mobile',     width: 30  },
          { header: 'Rent/Month', width: 28  },
          { header: 'Lease Start',width: 24  },
          { header: 'Lease End',  width: 24  },
          { header: 'Status',     width: 22  },
        ];
        const totalW = cols.reduce((s, c) => s + c.width, 0);
        const startX = 14;
        let ty = 58;

        // Table header row
        doc.setFillColor(15, 23, 42);
        doc.rect(startX, ty, totalW, 8, 'F');
        doc.setTextColor(255,255,255);
        doc.setFontSize(6.5); doc.setFont('helvetica','bold');
        let hx = startX;
        cols.forEach(col => { doc.text(col.header, hx + 2, ty + 5.5); hx += col.width; });
        ty += 8;

        const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}); } catch { return d || '—'; } };
        const STATUS_COLOR = { Active:[16,185,129], Expired:[239,68,68], Pending:[245,158,11] };

        filtered.forEach((t, ri) => {
          if (ty > 185) { doc.addPage(); ty = 14; }
          if (ri % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(startX, ty, totalW, 7, 'F'); }
          doc.setTextColor(30,30,30);
          doc.setFontSize(6.5); doc.setFont('helvetica','normal');
          const statusColor = STATUS_COLOR[t.agreementStatus] || [100,116,139];
          const rowData = [
            ri + 1,
            t.code || '—',
            t.name || '—',
            t.property || t.address || '—',
            t.mobile || '—',
            `Rs ${Math.round(t.currentRent||0).toLocaleString('en-IN')}`,
            fmtDate(t.leaseStart),
            fmtDate(t.leaseEnd),
            t.agreementStatus || 'Pending',
          ];
          let rx = startX;
          rowData.forEach((val, ci) => {
            const v = String(val || '');
            const maxLen = cols[ci].width < 25 ? 10 : cols[ci].width < 40 ? 14 : 22;
            if (ci === 8) doc.setTextColor(...statusColor);
            else          doc.setTextColor(30,30,30);
            doc.text(v.length > maxLen ? v.slice(0, maxLen-2)+'..' : v, rx + 2, ty + 5);
            rx += cols[ci].width;
          });
          ty += 7;
        });

        // Footer row
        doc.setFillColor(15, 23, 42);
        doc.rect(startX, ty + 2, totalW, 8, 'F');
        doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
        doc.text(`TOTAL (${filtered.length} records)`, startX + 2, ty + 7.5);

        const label = mode === 'otherParty' ? 'OtherParties' : 'Tenants';
        doc.save(`${label}_List_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF downloaded');
      } catch (e) { toast.error('PDF failed'); console.error(e); }
      finally { setPdfExporting(false); }
    }, 100);
  };

  const filtered = tenants.filter(t => {
    if (companyFilter !== 'All Companies' && (t.company || (t).companyName) !== companyFilter) return false;
    const q  = search.toLowerCase();
    const name = (t.name || '').toLowerCase();
    const company = (t.company || (t).companyName || '').toLowerCase();
    const code = (t.code || '').toLowerCase();
    const mQ = name.includes(q) || company.includes(q) || code.includes(q);
    const mM = monthFilter === 'All Months' || (t.leaseStart && new Date(t.leaseStart).getMonth() === parseInt(monthFilter));
    return mQ && mM;
  });

  const activeCount = filtered.filter(t => t.agreementStatus === 'Active').length;
  const rentTotal   = filtered.reduce((a, t) => a + (t.currentRent || 0), 0);
  const basePath    = mode === 'otherParty' ? '/other-parties' : '/tenants';
  const openView    = (t) => { setSelectedTenant(t); setShowDetails(true); navigate(`${basePath}/${t.id || t._id}`); };

  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage    = Math.min(currentPage, totalPages);
  const paginated   = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const fromRecord  = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const toRecord    = Math.min(safePage * perPage, filtered.length);

  useEffect(() => { setCurrentPage(1); }, [search, companyFilter, monthFilter]);

  // ── DETAIL VIEW — no wrapper, no padding, no gap ──────────────────────────
  if (showDetails && selectedTenant) {
    return (
      <>
        <TenantDetailsView
          tenant={selectedTenant}
          companies={companies}
          allTenants={tenants}
          apiBase={mode === 'otherParty' ? '/api/other-parties' : '/api/tenants'}
          onClose={() => {
            setShowDetails(false);
            setSelectedTenant(null);
            navigate(basePath);
          }}
        />
        <AnimatePresence>
          {showDeleteConfirm && tenantToDelete && (
            <DeleteConfirmationModal
              tenantName={tenantToDelete.name}
              onClose={() => { setShowDeleteConfirm(false); setTenantToDelete(null); }}
              onConfirm={handleDelete}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── LIST VIEW — with padding wrapper ─────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? 12 : 24, width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.4px', margin:0 }}>{mode === 'otherParty' ? 'Other Parties' : 'Tenants'}</h1>
          <p style={{ fontSize:12, color:'#9ba8b5', marginTop:4, fontWeight:500 }}>{mode === 'otherParty' ? 'Manage non-tenant customers and billing parties.' : "Manage Neoteric Properties' leasing records."}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleExport} disabled={exporting}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#fff', border:'1.5px solid #e8edf0', borderRadius:10, fontSize:12, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <Download size={14}/> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={handleExportPDF} disabled={pdfExporting}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#fff', border:'1.5px solid #e8edf0', borderRadius:10, fontSize:12, fontWeight:600, color:'#dc2626', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', opacity:pdfExporting?0.6:1 }}>
            <FileDown size={14}/> {pdfExporting ? 'Generating...' : 'Export PDF'}
          </button>
          {canAdd && (
            <button onClick={() => { setEditFormId(null); setShowForm(true); }}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 10px rgba(249,115,22,0.35)', fontFamily:'inherit' }}>
              <Plus size={15}/> {mode === 'otherParty' ? 'New Other Party' : 'New Tenant'}
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 10 : 14, marginBottom:22 }}>
        {[
          { label: mode === 'otherParty' ? 'Total Parties' : 'Total Tenants', val: filtered.length,                  sub: 'All records',     Icon: Users,       icoColor:'#f97316' },
          { label: 'Active Agreements',                                        val: activeCount,                      sub: 'In progress',     Icon: ShieldCheck,  icoColor:'#10b981' },
          { label: 'Monthly Rent Roll',                                        val: `₹${rentTotal.toLocaleString()}`, sub: 'Monthly total',   Icon: IndianRupee,  icoColor:'#6366f1' },
        ].map((s, i) => (
          <div key={i} style={{
            background:'#fff', borderRadius:14, padding:'20px 20px 16px', position:'relative', minHeight:112,
            border: i === 0 ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
            boxShadow: i === 0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow= i===0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)'; }}>
            <p style={{ fontSize:11, fontWeight:600, color:'#9ba8b5', margin:'0 0 10px', letterSpacing:'0.02em' }}>{s.label}</p>
            <p style={{ fontSize:30, fontWeight:900, color:'#1a1a2e', margin:0, letterSpacing:'-0.6px', lineHeight:1.1 }}>{s.val}</p>
            <p style={{ fontSize:11, color:'#b0b8c4', margin:'6px 0 0' }}>{s.sub}</p>
            <div style={{ position:'absolute', bottom:16, right:16 }}>
              <s.Icon size={28} color={s.icoColor} strokeWidth={1.5}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', padding: isMobile ? '10px 12px' : '12px 16px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Company filter */}
        <select value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:9, border:'1.5px solid #f0f2f5', fontSize:12, fontWeight:600, color:'#5a6474', background:'#f8f9fb', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
          <option value="All Companies">🏢 All Companies</option>
          {[...new Set(tenants.map(t=>t.company||(t).companyName).filter(Boolean))].sort().map((c)=>(
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ flex:1, minWidth:220, display:'flex', alignItems:'center', gap:8, height:40, background:'#f8f9fb', border:'1.5px solid #f0f2f5', borderRadius:10, padding:'0 14px' }}>
          <Search size={14} color="#9ba8b5"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company or code..."
            style={{ border:'none', outline:'none', fontSize:13, color:'#1a1a2e', background:'transparent', flex:1, fontFamily:'inherit' }}/>
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          style={{ height:40, padding:'0 12px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:12, color:'#5a6474', background:'#f8f9fb', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
          <option value="All Months">All Lease Starts</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December']
            .map((m, i) => <option key={i} value={`${i}`}>{m}</option>)}
        </select>
        <span style={{ fontSize:12, color:'#9ba8b5', fontWeight:600, whiteSpace:'nowrap' }}>{filtered.length} {mode === 'otherParty' ? 'parties' : 'tenants'}</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="table-responsive">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {(mode === 'otherParty'
                  ? ['Party Name', 'Address', 'Lease Period', 'Rent / Month', 'Status', 'Actions']
                  : ['Tenant Name', 'Property', 'Lease Period', 'Rent / Month', 'Status', 'Actions']
                ).map((h, i) => (
                  <th key={h} style={{ padding:'11px 18px', textAlign:'left', fontSize:11, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #eef0f4', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding:'16px 18px', borderBottom:'1px solid #f8f9fb' }}>
                      <div style={{ height:12, background:'#f0f2f5', borderRadius:6, width:'60%' }}/>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding:'60px 24px', textAlign:'center' }}>
                    <Users size={44} color="#e0e4ea" style={{ margin:'0 auto 10px', display:'block' }}/>
                    <p style={{ fontSize:14, fontWeight:600, color:'#9ba8b5' }}>{mode === 'otherParty' ? 'No other parties found' : 'No tenants found'}</p>
                    <p style={{ fontSize:12, color:'#c5cdd6', marginTop:4 }}>Try adjusting search filters</p>
                  </td>
                </tr>
              ) : paginated.map((t, idx) => (
                <tr key={t.id || t._id} onClick={() => openView(t)}
                  style={{ cursor:'pointer', transition:'background 0.12s', borderBottom:'1px solid #f8f9fb' }}
                  onMouseEnter={e => (e.currentTarget).style.background = '#fafbfc'}
                  onMouseLeave={e => (e.currentTarget).style.background = 'transparent'}>

                  {/* Name + Code + Company */}
                  <td style={{ padding:'13px 18px' }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'#1e293b', margin:0, lineHeight:1.3 }}>{t.name || '—'}</p>
                    {t.code && (
                      <p style={{ fontSize:11, fontWeight:500, color:'#f97316', margin:'3px 0 0', display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'#f97316', display:'inline-block', flexShrink:0 }}/>
                        {t.code}
                      </p>
                    )}
                    <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>{t.company || t.companyName || ''}</p>
                  </td>

                  {/* Property / Address */}
                  <td style={{ padding:'13px 18px' }}>
                    <p style={{ fontSize:13, color:'#64748b', margin:0, fontWeight:400 }}>{t.property || t.address || '—'}</p>
                    {t.mobile && <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>{t.mobile}</p>}
                  </td>

                  {/* Lease End */}
                  <td style={{ padding:'13px 18px' }}>
                    <p style={{ fontSize:13, color:'#64748b', margin:0, fontWeight:400 }}>{t.leaseEnd ? new Date(t.leaseEnd).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</p>
                    {t.leaseStart && <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>From {new Date(t.leaseStart).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>}
                  </td>

                  {/* Rent */}
                  <td style={{ padding:'13px 18px' }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1e293b', margin:0 }}>₹{(t.currentRent||0).toLocaleString('en-IN')}</p>
                    <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>/month</p>
                  </td>

                  {/* Status */}
                  <td style={{ padding:'13px 18px' }}>
                    {(() => {
                      const s = t.agreementStatus || 'Pending';
                      const cfg = s === 'Active' ? { bg:'#dcfce7', color:'#16a34a' } : s === 'Expired' ? { bg:'#fee2e2', color:'#dc2626' } : { bg:'#fef9c3', color:'#ca8a04' };
                      return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }}/>
                        {s}
                      </span>;
                    })()}
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'13px 18px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:2 }}>
                      {[
                        { icon: Eye,   show: true,     title:'View',   onClick: () => openView(t),                                          color:'#3b82f6', hbg:'#eff6ff' },
                        { icon: Edit2, show: canEdit,  title:'Edit',   onClick: () => { setEditFormId(t.id || t._id); setShowForm(true); }, color:'#f97316', hbg:'#fff7ed' },
                        { icon: Trash2,show: canDelete,title:'Delete', onClick: () => { setTenantToDelete(t); setShowDeleteConfirm(true); }, color:'#ef4444', hbg:'#fff1f2' },
                      ].filter(b => b.show).map(({ icon: Ic, title, onClick, color, hbg }) => (
                        <button key={title} onClick={onClick} title={title}
                          style={{ width:30, height:30, borderRadius:7, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', transition:'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background=hbg; e.currentTarget.style.color=color; }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                          <Ic size={15}/>
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderTop:'1px solid #f0f2f5', flexWrap:'wrap', gap:10 }}>
          {/* Left: showing info + per page */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, color:'#9ba8b5', fontWeight:500 }}>
              Showing <strong style={{ color:'#1a1a2e' }}>{fromRecord}</strong> to <strong style={{ color:'#1a1a2e' }}>{toRecord}</strong> of <strong style={{ color:'#1a1a2e' }}>{filtered.length}</strong> {mode === 'otherParty' ? 'parties' : 'tenants'}
            </span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding:'4px 8px', borderRadius:7, border:'1px solid #e8edf0', fontSize:12, fontWeight:600, color:'#5a6474', background:'#f8f9fb', outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
            </select>
          </div>
          {/* Right: page buttons */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={safePage === 1}
              style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e8edf0', fontSize:12, fontWeight:600, color: safePage===1?'#c5cdd6':'#5a6474', background:'#fff', cursor: safePage===1?'default':'pointer', fontFamily:'inherit' }}>
              ‹ Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i-1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`d${i}`} style={{ padding:'5px 4px', fontSize:12, color:'#9ba8b5' }}>…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ width:32, height:32, borderRadius:7, border: p===safePage?'none':'1px solid #e8edf0', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    background: p===safePage?'#1a1a2e':'#fff',
                    color: p===safePage?'#fff':'#5a6474' }}>
                  {p}
                </button>
              ))
            }
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={safePage === totalPages}
              style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #e8edf0', fontSize:12, fontWeight:600, color: safePage===totalPages?'#c5cdd6':'#5a6474', background:'#fff', cursor: safePage===totalPages?'default':'pointer', fontFamily:'inherit' }}>
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && tenantToDelete && (
          <DeleteConfirmationModal
            tenantName={tenantToDelete.name}
            onClose={() => { setShowDeleteConfirm(false); setTenantToDelete(null); }}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* ── Tenant Form Panel (overlay on list) ── */}
      {showForm && (
        <TenantFormPage
          mode={mode}
          propId={editFormId}
          onClose={() => { setShowForm(false); setEditFormId(null); }}
          onSuccess={() => { setShowForm(false); setEditFormId(null); fetchTenants(); }}
        />
      )}

    </div>
    </div>
  );
}