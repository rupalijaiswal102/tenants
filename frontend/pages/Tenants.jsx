import React, { useRef ,useState, useEffect  } from 'react';
import { useResponsive } from '../src/hooks/useResponsive.js';

import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, Edit2, Trash2, Users, IndianRupee, ShieldCheck, Download } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { exportToExcel }          from '../src/lib/exportUtils.js';
import { TenantDetailsView }      from '../components/tenants/TenantDetailsView.jsx';
import { StatusBadge }            from '../components/tenants/TenantPrimitives.jsx';
import { DeleteConfirmationModal } from '../components/tenants/DeleteConfirmationModal.jsx';

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
  const [exporting,         setExporting]         = useState(false);

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
          <button onClick={() => navigate(`${basePath}/create`)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 10px rgba(249,115,22,0.35)', fontFamily:'inherit' }}>
            <Plus size={15}/> {mode === 'otherParty' ? 'New Other Party' : 'New Tenant'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 10 : 14, marginBottom:22 }}>
        {[
          { label: mode === 'otherParty' ? 'Total Parties' : 'Total Tenants', val:filtered.length,                   icon:<Users size={18} color="#f97316"/>,      bg:'#fff7ed', border:'#f97316' },
          { label:'Active Agreements', val:activeCount,                       icon:<ShieldCheck size={18} color="#10b981"/>, bg:'#f0fdf4', border:'#10b981' },
          { label:'Monthly Rent Roll', val:`₹${rentTotal.toLocaleString()}`,  icon:<IndianRupee size={18} color="#6366f1"/>, bg:'#eef2ff', border:'#6366f1' },
        ].map((s, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:'0 16px 16px 0', borderLeft:`3px solid ${s.border}`, border:'1px solid #f0f2f5', borderLeftWidth:3, borderLeftColor:s.border, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', transition:'all 0.2s' }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 6px 20px rgba(0,0,0,0.07)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.transform='none'; el.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; }}>
            <div style={{ width:40, height:40, borderRadius:11, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.5px' }}>{s.val}</div>
            <div style={{ fontSize:10, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{s.label}</div>
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
              <tr style={{ background:'#fafbfc' }}>
                {(mode === 'otherParty' ? ['Code','Party Name','Address','Rent','Status','Actions'] : ['Code','Tenant Name','Property','Rent','Status','Actions']).map((h, i) => (
                  <th key={h} style={{ padding:'12px 18px', textAlign: i === 3 ? 'right' : 'left', fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'2px solid #f0f2f5', whiteSpace:'nowrap' }}>{h}</th>
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
              ) : filtered.map((t, idx) => (
                <tr key={t.id || t._id} onClick={() => openView(t)}
                  style={{ cursor:'pointer', transition:'background 0.12s', borderBottom:'1px solid #f8f9fb' }}
                  onMouseEnter={e => (e.currentTarget).style.background = '#fafbfc'}
                  onMouseLeave={e => (e.currentTarget).style.background = 'transparent'}>

                  {/* Code */}
                  <td style={{ padding:'14px 18px' }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'#f97316', background:'rgba(249,115,22,0.07)', padding:'3px 9px', borderRadius:6 }}>{t.code}</span>
                  </td>

                  {/* Name */}
                  <td style={{ padding:'14px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`hsl(${idx*47%360},60%,94%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:`hsl(${idx*47%360},50%,40%)`, flexShrink:0 }}>
                        {(t.name||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:0 }}>{t.name}</p>
                        <p style={{ fontSize:10, color:'#9ba8b5', margin:'2px 0 0' }}>{t.email || (t).companyName || ''}</p>
                      </div>
                    </div>
                  </td>

                  {/* Property / Address */}
                  <td style={{ padding:'14px 18px' }}>
                    <p style={{ fontSize:12, color:'#5a6474', margin:0 }}>{t.property || (t).address || '—'}</p>
                  </td>

                  {/* Rent */}
                  <td style={{ padding:'14px 18px', textAlign:'right' }}>
                    <span style={{ fontSize:14, fontWeight:800, color:'#1a1a2e' }}>₹{(t.currentRent||0).toLocaleString()}</span>
                    <p style={{ fontSize:9, color:'#9ba8b5', margin:'2px 0 0', textAlign:'right' }}>/month</p>
                  </td>

                  {/* Status */}
                  <td style={{ padding:'14px 18px' }}>
                    <StatusBadge status={t.agreementStatus || 'Pending'}/>
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'14px 18px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                      <button onClick={() => openView(t)}
                        style={{ padding:'6px 13px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:8, cursor:'pointer', color:'#f97316', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                        <Eye size={13}/> View
                      </button>
                      <button onClick={() => navigate(`${basePath}/edit/${t.id || t._id}`)}
                        style={{ padding:'6px 13px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, cursor:'pointer', color:'#b45309', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                        <Edit2 size={13}/> Edit
                      </button>
                      <button onClick={() => { setTenantToDelete(t); setShowDeleteConfirm(true); }}
                        style={{ padding:'6px 9px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:8, cursor:'pointer', color:'#e11d48', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

    </div>
    </div>
  );
}