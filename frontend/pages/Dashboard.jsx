import { useEffect, useState } from 'react';
import {
  Users, Building2, TrendingUp, Clock,
  Calendar, Activity, CheckCircle2, AlertCircle, RefreshCw,
  IndianRupee, FileText, ReceiptIndianRupee
} from 'lucide-react';
import { useResponsive } from '../src/hooks/useResponsive.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function Dashboard() {
  const navigate  = useNavigate();
  const { isMobile } = useResponsive();
  const [tenants,  setTenants]  = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tenantQ,  setTenantQ]  = useState('');

  const load = async () => {
    try {
      setError(null); setLoading(true);
      const [tR, iR] = await Promise.all([
        axios.get('/api/tenants'),
        axios.get('/api/invoices'),
      ]);
      setTenants(Array.isArray(tR.data) ? tR.data : []);
      setInvoices(Array.isArray(iR.data) ? iR.data : []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Connection failed');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── Computed ── */
  const totalRevenue    = tenants.reduce((a, t) => a + (t.currentRent || 0), 0);
  const totalBilled     = invoices.reduce((a, i) => a + (i.totalInvoice || 0), 0);
  const totalCollected  = invoices.reduce((a, i) => a + (i.receivedAmount || i.received || 0) + (i.tdsAmount || 0), 0);
  const totalDues       = invoices.reduce((a, i) => a + Math.max(0, i.balanceAmount || i.balance || 0), 0);
  const paidCount       = invoices.filter(i => i.paymentStatus === 'Paid').length;
  const pendingCount    = invoices.filter(i => i.paymentStatus === 'Pending').length;
  const partialCount    = invoices.filter(i => i.paymentStatus === 'Partial').length;
  const paidPct         = Math.round((paidCount / (invoices.length || 1)) * 100);
  const now             = new Date();

  const expiringTenants = tenants.filter(t => {
    if (!t.leaseEnd) return false;
    const d = Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000);
    return d > 0 && d <= 30;
  }).sort((a, b) => new Date(a.leaseEnd) - new Date(b.leaseEnd));

  const properties = new Set(tenants.map(t => t.property).filter(Boolean)).size;

  /* ── Monthly bar data ── */
  const monthlyData = (() => {
    const map = {}, order = [];
    invoices.forEach(inv => {
      const raw = inv.billDate || inv.invoiceDate || inv.createdAt;
      if (!raw) return;
      const d   = new Date(raw);
      const key = `${d.toLocaleString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
      if (!map[key]) { map[key] = { name: key, billed: 0, collected: 0, _ts: d.getTime() }; order.push(key); }
      map[key].billed    += inv.totalInvoice || 0;
      map[key].collected += (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0);
    });
    return [...new Set(order)]
      .sort((a, b) => map[a]._ts - map[b]._ts)
      .slice(-8)
      .map(k => ({ name: map[k].name, Billed: Math.round(map[k].billed), Collected: Math.round(map[k].collected) }));
  })();

  /* ── Pie ── */
  const pieData = [
    { name: 'Paid',    value: paidCount,    color: '#10b981' },
    { name: 'Partial', value: partialCount, color: '#f59e0b' },
    { name: 'Pending', value: pendingCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  /* ── Stat cards ── */
  const stats = [
    { label: 'Active Tenants',  value: tenants.length,          fmt: v => v,                                         sub: `${properties} properties`,   icon: Users,             iconBg: '#fff7ed', iconColor: '#f97316' },
    { label: 'Monthly Revenue', value: totalRevenue,            fmt: v => `₹${v.toLocaleString('en-IN')}`,           sub: 'Expected this month',         icon: IndianRupee,       iconBg: '#eff6ff', iconColor: '#3b82f6' },
    { label: 'Total Billed',    value: Math.round(totalBilled), fmt: v => `₹${v.toLocaleString('en-IN')}`,           sub: `${invoices.length} invoices`,  icon: ReceiptIndianRupee,iconBg: '#f0fdf4', iconColor: '#10b981' },
    { label: 'Collected',       value: Math.round(totalCollected),fmt:v=>`₹${v.toLocaleString('en-IN')}`,            sub: `${paidPct}% recovery rate`,   icon: TrendingUp,        iconBg: '#f0fdf4', iconColor: '#10b981' },
    { label: 'Pending Dues',    value: Math.round(totalDues),   fmt: v => `₹${v.toLocaleString('en-IN')}`,           sub: `${pendingCount} unpaid`,       icon: Clock,             iconBg: '#fff1f2', iconColor: '#ef4444' },
    { label: 'Expiring Leases', value: expiringTenants.length,  fmt: v => v,                                         sub: 'Within 30 days',              icon: Calendar,          iconBg: '#fffbeb', iconColor: '#f59e0b' },
  ];

  /* ── Custom tooltip ── */
  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f0f2f5', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', padding:'10px 14px', fontSize:12 }}>
        <p style={{ fontWeight:700, color:'#1a1a2e', margin:'0 0 6px' }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color:p.color, fontWeight:600, margin:'2px 0' }}>
            {p.name}: ₹{(p.value/100000).toFixed(2)}L
          </p>
        ))}
      </div>
    );
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:12 }}>
      <Activity size={36} color="#f97316" style={{ animation:'pulse 1.5s infinite' }}/>
      <p style={{ color:'#94a3b8', fontSize:12, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>Loading Dashboard…</p>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:16, padding:24, textAlign:'center' }}>
      <AlertCircle size={48} color="#ef4444" strokeWidth={1.5}/>
      <div>
        <p style={{ fontSize:18, fontWeight:800, color:'#0f172a' }}>Connection Error</p>
        <p style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>{error}</p>
      </div>
      <button onClick={load} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'#f97316', color:'#fff', borderRadius:12, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        <RefreshCw size={14}/> Retry
      </button>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 28, width:'100%', background:'#f8f9fb', minHeight:'100vh' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Dashboard Overview</h1>
          <p style={{ fontSize:12, color:'#9ba8b5', fontWeight:500, marginTop:3 }}>
            {now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', background:'#fff', border:'1.5px solid #e8edf4', borderRadius:10, fontSize:12, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid-responsive-6" style={{ marginBottom:20, gap:10 }}>
        {stats.map((st, i) => {
          const Icon = st.icon;
          const fmtVal = st.fmt(st.value);
          const fSize  = String(fmtVal).length > 11 ? 14 : String(fmtVal).length > 7 ? 17 : 22;
          return (
            <div key={i} style={{ background:'#fff', borderRadius:14, padding:'14px 14px 12px', border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', transition:'all 0.18s', cursor:'default', minWidth:0 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='none'; }}>
              <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#9ba8b5', margin:'0 0 6px', letterSpacing:'0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{st.label}</p>
                <p style={{ fontSize:fSize, fontWeight:900, color:'#1a1a2e', margin:0, letterSpacing:'-0.3px', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fmtVal}</p>
                <p style={{ fontSize:10, color:'#9ba8b5', fontWeight:500, margin:'4px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{st.sub}</p>
              </div>
              <div style={{ width:36, height:36, borderRadius:10, background:st.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8 }}>
                <Icon size={16} color={st.iconColor} strokeWidth={1.8}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap:16, marginBottom:16 }}>

        {/* Bar Chart */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>Monthly Cash Flow ({now.getFullYear()})</p>
              <p style={{ fontSize:11, color:'#9ba8b5', marginTop:3 }}>Billed vs Collected per month</p>
            </div>
          </div>
          <div style={{ height:240 }}>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ left:-10, right:8 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize:10, fontWeight:600, fill:'#94a3b8' }} dy={6}/>
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize:10, fontWeight:600, fill:'#94a3b8' }}
                    tickFormatter={v => v === 0 ? '₹0' : `₹${(v/100000).toFixed(0)}L`}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize:11, paddingTop:12, color:'#64748b' }}/>
                  <Bar dataKey="Billed"    fill="#10b981" radius={[5,5,0,0]} barSize={20}/>
                  <Bar dataKey="Collected" fill="#ef4444" radius={[5,5,0,0]} barSize={20}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
                <Activity size={28} color="#e2e8f0" strokeWidth={1.5}/>
                <p style={{ color:'#cbd5e1', fontSize:12, margin:0 }}>No invoice data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', padding:24, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ alignSelf:'stretch', marginBottom:4 }}>
            <p style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>Collection Health</p>
            <p style={{ fontSize:11, color:'#9ba8b5', marginTop:3 }}>Payment distribution</p>
          </div>
          <div style={{ width:150, height:150, position:'relative', margin:'12px 0' }}>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={50} outerRadius={66} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius:10, fontSize:12, border:'1px solid #f0f2f5', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:24, fontWeight:900, color:'#1a1a2e', lineHeight:1 }}>{paidPct}%</span>
                  <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:2 }}>Paid</span>
                </div>
              </>
            ) : (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e1', fontSize:13 }}>No data</div>
            )}
          </div>
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Paid',    value: paidCount,    color:'#10b981', bg:'#f0fdf4' },
              { label:'Partial', value: partialCount, color:'#f59e0b', bg:'#fffbeb' },
              { label:'Pending', value: pendingCount, color:'#ef4444', bg:'#fff1f2' },
            ].map(d => (
              <div key={d.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:d.bg, borderRadius:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:d.color }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>{d.label}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── All Tenants (full width) ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f5f6f8' }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>All Tenants</p>
              <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>Manage and track leasing records</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, background:'#f8f9fb', border:'1px solid #f0f2f5', borderRadius:9, padding:'6px 12px', minWidth:170 }}>
                <FileText size={13} color="#94a3b8"/>
                <input placeholder="Search tenants…" value={tenantQ} onChange={e => setTenantQ(e.target.value)}
                  style={{ border:'none', background:'transparent', outline:'none', fontSize:12, color:'#1a1a2e', width:'100%', fontFamily:'inherit' }}/>
              </div>
              <a href="/tenants" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#fff', background:'#f97316', padding:'7px 14px', borderRadius:9, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(249,115,22,0.25)' }}>
                View All
              </a>
            </div>
          </div>

          <div style={{ overflowX:'auto', maxHeight:400, overflowY:'auto' }}
            className="tenant-scroll-list">
            <style>{`.tenant-scroll-list::-webkit-scrollbar{width:4px;height:4px}.tenant-scroll-list::-webkit-scrollbar-track{background:transparent}.tenant-scroll-list::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}`}</style>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                <tr style={{ background:'#f8f9fb' }}>
                  {['Tenant','Property','Lease End','Rent / Month','Status','Action'].map((h, idx) => (
                    <th key={h} style={{ padding:'11px 20px', fontSize:11, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #eef0f4', textAlign: idx >= 2 && idx <= 3 ? 'right' : idx === 5 ? 'center' : 'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants
                  .filter(t => !tenantQ || t.name?.toLowerCase().includes(tenantQ.toLowerCase()) || t.property?.toLowerCase().includes(tenantQ.toLowerCase()))
                  .map((t, i) => {
                    const leaseEnd   = t.leaseEnd ? new Date(t.leaseEnd) : null;
                    const daysLeft   = leaseEnd ? Math.ceil((leaseEnd.getTime() - now.getTime()) / 86400000) : null;
                    const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
                    const isExpired  = daysLeft !== null && daysLeft <= 0;
                    const sc = isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#10b981';
                    const sb = isExpired ? '#fff1f2' : isExpiring ? '#fffbeb' : '#f0fdf4';
                    const sl = isExpired ? 'Expired'  : isExpiring ? `${daysLeft}d left` : 'Active';
                    const ac = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4'][i % 6];
                    return (
                      <tr key={t.id || i}
                        style={{ borderBottom:'1px solid #f5f6f8', transition:'background 0.12s', cursor:'pointer' }}
                        onClick={() => navigate(`/tenants/${t.id || t._id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'13px 20px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:36, height:36, borderRadius:10, background:`${ac}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:ac, flexShrink:0 }}>
                              {t.name?.[0]?.toUpperCase() || 'T'}
                            </div>
                            <div>
                              <p style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150 }}>{t.name}</p>
                              <p style={{ fontSize:11, color:'#b0b8c4', margin:'2px 0 0' }}>{t.code || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'13px 20px', fontSize:13, color:'#64748b', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.property || '—'}</td>
                        <td style={{ padding:'13px 20px', textAlign:'right' }}>
                          {leaseEnd ? (
                            <span style={{ fontSize:12, fontWeight:500, color: isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#64748b', whiteSpace:'nowrap' }}>
                              {leaseEnd.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}
                            </span>
                          ) : <span style={{ color:'#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ padding:'13px 20px', textAlign:'right', fontSize:13, fontWeight:700, color:(t.currentRent||0)===0 ? '#cbd5e1' : '#1a1a2e', whiteSpace:'nowrap' }}>
                          {(t.currentRent||0)===0 ? '—' : `₹${t.currentRent.toLocaleString('en-IN')}`}
                        </td>
                        <td style={{ padding:'13px 20px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:sb, color:sc, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:sc }}/>{sl}
                          </span>
                        </td>
                        <td style={{ padding:'13px 20px', textAlign:'center' }}>
                          <button onClick={e => { e.stopPropagation(); navigate(`/tenants/${t.id || t._id}`); }}
                            style={{ padding:'5px 14px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:8, fontSize:12, fontWeight:600, color:'#f97316', cursor:'pointer', fontFamily:'inherit' }}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {tenants.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:'40px 0', textAlign:'center', color:'#cbd5e1' }}>
                    <Users size={28} strokeWidth={1.5} style={{ display:'block', margin:'0 auto 8px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, margin:0 }}>No tenants yet</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Risk & Alerts — two clean tables side by side ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>

        {/* ── Overdue Invoices table ── */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #f5f6f8' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#fff1f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={14} color="#ef4444"/>
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Overdue Invoices</p>
                <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>{invoices.filter(i=>i.paymentStatus!=='Paid').length} unpaid</p>
              </div>
            </div>
            <a href="/invoices" style={{ fontSize:12, fontWeight:600, color:'#f97316', textDecoration:'none' }}>View all</a>
          </div>
          {invoices.filter(i => i.paymentStatus !== 'Paid').length > 0 ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fb' }}>
                  {['Party','Invoice','Amount','Status'].map((h,i) => (
                    <th key={h} style={{ padding:'9px 16px', fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #f0f2f5', textAlign: i>=2 ? 'right' : 'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.paymentStatus !== 'Paid').slice(0,6).map((inv, i) => {
                  const isPending = inv.paymentStatus === 'Pending';
                  return (
                    <tr key={i} onClick={() => navigate('/invoices')}
                      style={{ borderBottom:'1px solid #f8f9fb', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 16px', maxWidth:130 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.partyName}</p>
                      </td>
                      <td style={{ padding:'11px 16px', fontSize:12, color:'#9ba8b5', whiteSpace:'nowrap' }}>#{inv.invoiceNo}</td>
                      <td style={{ padding:'11px 16px', textAlign:'right', fontSize:13, fontWeight:700, color: isPending ? '#ef4444' : '#f59e0b', whiteSpace:'nowrap' }}>
                        ₹{(inv.balanceAmount || inv.balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding:'11px 16px', textAlign:'right' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background: isPending ? '#fff1f2' : '#fffbeb', color: isPending ? '#ef4444' : '#f59e0b', whiteSpace:'nowrap' }}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding:'36px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <CheckCircle2 size={28} color="#10b981" strokeWidth={1.5}/>
              <p style={{ fontSize:13, fontWeight:600, color:'#10b981', margin:0 }}>All invoices paid</p>
            </div>
          )}
        </div>

        {/* ── Expiring Leases table ── */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #f5f6f8' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Calendar size={14} color="#f59e0b"/>
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Expiring Leases</p>
                <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>Within 30 days</p>
              </div>
            </div>
            <a href="/tenants" style={{ fontSize:12, fontWeight:600, color:'#f97316', textDecoration:'none' }}>View all</a>
          </div>
          {expiringTenants.length > 0 ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fb' }}>
                  {['Tenant','Lease End','Rent','Days Left'].map((h,i) => (
                    <th key={h} style={{ padding:'9px 16px', fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #f0f2f5', textAlign: i>=1 ? 'right' : 'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiringTenants.slice(0,6).map((t, i) => {
                  const daysLeft = Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000);
                  const uc = daysLeft <= 7 ? '#ef4444' : daysLeft <= 15 ? '#f97316' : '#f59e0b';
                  const ub = daysLeft <= 7 ? '#fff1f2' : daysLeft <= 15 ? '#fff7ed' : '#fffbeb';
                  const ac = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4'][i%6];
                  return (
                    <tr key={i} onClick={() => navigate(`/tenants/${t.id||t._id}`)}
                      style={{ borderBottom:'1px solid #f8f9fb', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:8, background:`${ac}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:ac, flexShrink:0 }}>
                            {t.name[0]?.toUpperCase()}
                          </div>
                          <p style={{ fontSize:13, fontWeight:600, color:'#1a1a2e', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{t.name}</p>
                        </div>
                      </td>
                      <td style={{ padding:'11px 16px', textAlign:'right', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>
                        {new Date(t.leaseEnd).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}
                      </td>
                      <td style={{ padding:'11px 16px', textAlign:'right', fontSize:13, fontWeight:700, color:'#1a1a2e', whiteSpace:'nowrap' }}>
                        ₹{(t.currentRent||0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding:'11px 16px', textAlign:'right' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:ub, color:uc, whiteSpace:'nowrap' }}>{daysLeft}d</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding:'36px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <CheckCircle2 size={28} color="#10b981" strokeWidth={1.5}/>
              <p style={{ fontSize:13, fontWeight:600, color:'#10b981', margin:0 }}>No leases expiring soon</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
