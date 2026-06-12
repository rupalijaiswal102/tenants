import { useEffect, useState } from 'react';
import {
  Users, ReceiptIndianRupee, Building2, TrendingUp, Clock,
  Calendar, Activity, CheckCircle2, AlertCircle, RefreshCw,
  IndianRupee, ArrowUpRight, ArrowDownRight, Home, FileText
} from 'lucide-react';
import { useResponsive } from '../src/hooks/useResponsive.js';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';
import WorkflowPendingCards from '../components/invoices/WorkflowPendingCards.jsx';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── Shared card style ────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e8edf4',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [tenants,  setTenants]  = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tenantQ,  setTenantQ]  = useState('');
  const [chartType, setChartType] = useState('combined');

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

  // ── Computed values ──────────────────────────────────────────────────────
  const totalRevenue  = tenants.reduce((a, t) => a + (t.currentRent || 0), 0);
  const totalDues     = invoices.reduce((a, i) => a + (i.balanceAmount || i.balance || 0), 0);
  const collected     = Math.max(totalRevenue - totalDues, totalRevenue * 0.8);
  const now           = new Date();
  const expiringTenants = tenants.filter(t => {
    if (!t.leaseEnd) return false;
    const d = Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000);
    return d > 0 && d <= 30;
  }).sort((a,b) => new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime());
  const expiring = expiringTenants.length;
  const paidCount   = invoices.filter(i => i.paymentStatus === 'Paid').length;
  const paidPct     = Math.round((paidCount / (invoices.length || 1)) * 100);
  const pieData     = [
    { name: 'Paid',    value: paidCount, color: '#10b981' },
    { name: 'Partial', value: invoices.filter(i => i.paymentStatus === 'Partial').length, color: '#f59e0b' },
    { name: 'Pending', value: invoices.filter(i => i.paymentStatus === 'Pending').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const monthlyData = (() => {
    const map = {};
    const order = [];
    invoices.forEach(inv => {
      const raw = inv.billDate || inv.invoiceDate || inv.createdAt;
      if (!raw) return;
      const d = new Date(raw);
      const key = `${d.toLocaleString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
      if (!map[key]) { map[key] = { name: key, planned: 0, actual: 0, _ts: d.getTime() }; order.push(key); }
      map[key].planned += inv.totalInvoice || 0;
      map[key].actual  += (inv.receivedAmount || inv.received || 0) + (inv.tdsAmount || 0);
    });
    return order
      .filter((k, i) => order.indexOf(k) === i)
      .sort((a, b) => map[a]._ts - map[b]._ts)
      .slice(-8)
      .map(k => ({ name: map[k].name, planned: map[k].planned, actual: map[k].actual, variance: map[k].planned - map[k].actual }));
  })();

  const stats = [
    { label: 'Active Tenants',   value: tenants.length,         fmt: (v) => v,                        color: '#f97316', bg: '#fff7ed', icon: Users,          trend: '+12%', up: true  },
    { label: 'Monthly Revenue',  value: totalRevenue,           fmt: (v) => `₹${v.toLocaleString()}`, color: '#10b981', bg: '#f0fdf4', icon: IndianRupee,    trend: '+8%',  up: true  },
    { label: 'Rent Collected',   value: Math.round(collected),  fmt: (v) => `₹${v.toLocaleString()}`, color: '#3b82f6', bg: '#eff6ff', icon: TrendingUp,     trend: '+5%',  up: true  },
    { label: 'Pending Dues',     value: Math.round(totalDues),  fmt: (v) => `₹${v.toLocaleString()}`, color: '#ef4444', bg: '#fff1f2', icon: Clock,          trend: '-4%',  up: false },
    { label: 'Expiring Leases',  value: expiring,               fmt: (v) => v,                        color: '#f59e0b', bg: '#fffbeb', icon: Calendar,       trend: expiring > 0 ? 'Action!' : 'Clear', up: expiring === 0 },
    { label: 'Properties',       value: new Set(tenants.map(t => t.property)).size, fmt: (v) => v,   color: '#64748b', bg: '#f8fafc', icon: Building2,      trend: 'Stable', up: true  },
  ];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 12 }}>
      <Activity size={36} color="#f97316" style={{ animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading Dashboard…</p>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, padding: 24, textAlign: 'center' }}>
      <AlertCircle size={48} color="#ef4444" strokeWidth={1.5} />
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Connection Error</p>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{error}</p>
      </div>
      <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f97316', color: '#fff', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', fontFamily: 'inherit' }}>
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
  const userRole = authData?.role || 'MDO';

  return (
    <div style={{ padding: isMobile ? 12 : 24, width: '100%' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Dashboard Overview</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: '#fff', border: '1.5px solid #e8edf4', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <WorkflowPendingCards userRole={userRole}/>
      <div className="grid-responsive-6" style={{ marginBottom: 22 }}>
        {stats.map((st, i) => {
          const StatIcon = st.icon;
          return (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: '20px 20px 16px',
              position: 'relative', minHeight: 112,
              border: i === 0 ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
              boxShadow: i === 0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s', cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = i === 0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)'; }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ba8b5', margin: '0 0 10px', letterSpacing: '0.02em' }}>{st.label}</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{st.fmt(st.value)}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 7, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: st.up ? '#f0fdf4' : '#fff1f2', color: st.up ? '#15803d' : '#be123c' }}>
                {st.up ? <ArrowUpRight size={9}/> : <ArrowDownRight size={9}/>}{st.trend}
              </span>
              <div style={{ position: 'absolute', bottom: 14, right: 16 }}>
                <StatIcon size={26} color={st.color} strokeWidth={1.5}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16, marginBottom: 16 }}>

        {/* Cash Flow Analysis Chart */}
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Cash Flow Analysis</p>
              <p style={{ fontSize: 11, color: '#f97316', marginTop: 3, fontWeight: 600 }}>Planned vs Actual with Variance Trend</p>
            </div>
            <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
              {[{ k: 'combined', l: 'Combined' }, { k: 'bar', l: 'Bar' }, { k: 'line', l: 'Line' }].map(t => (
                <button key={t.k} onClick={() => setChartType(t.k)}
                  style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
                    background: chartType === t.k ? '#1a1a2e' : 'transparent',
                    color: chartType === t.k ? '#fff' : '#64748b',
                  }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ left: -10, right: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={v => v === 0 ? '₹0' : `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  formatter={(val, name) => [`₹${(val / 100000).toFixed(2)}L`, name]}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12, color: '#64748b' }} />
                {(chartType === 'combined' || chartType === 'bar') && (
                  <Bar dataKey="planned" name="Planned" fill="#1a1a2e" radius={[4, 4, 0, 0]} barSize={18} />
                )}
                {(chartType === 'combined' || chartType === 'bar') && (
                  <Bar dataKey="actual" name="Actual" fill="#5eead4" radius={[4, 4, 0, 0]} barSize={18} />
                )}
                {(chartType === 'combined' || chartType === 'line') && (
                  <Line type="monotone" dataKey="variance" name="Variance" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div style={{ ...S.card, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'stretch', marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Collection Health</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Payment distribution</p>
          </div>
          <div style={{ width: 140, height: 140, position: 'relative', margin: '12px 0' }}>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={48} outerRadius={62} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{paidPct}%</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Paid</span>
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No data</div>
            )}
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8fafc', borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row — All Tenants wider (3fr), Risk Signals narrower (2fr) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 16 }}>

        {/* ── All Tenants ── */}
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>All Tenants</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Manage and track leasing records</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: '1px solid #f0f2f5', borderRadius: 9, padding: '6px 12px', minWidth: 180 }}>
                <FileText size={13} color="#94a3b8"/>
                <input placeholder="Search tenants…" value={tenantQ} onChange={e => setTenantQ(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#0f172a', width: '100%', fontFamily: 'inherit' }}/>
              </div>
              <a href="/tenants" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: '#f97316', padding: '7px 14px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}>
                View All
              </a>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}
            className="tenant-scroll-list">
            <style>{`.tenant-scroll-list::-webkit-scrollbar{width:4px;height:4px}.tenant-scroll-list::-webkit-scrollbar-track{background:transparent}.tenant-scroll-list::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}`}</style>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#f8fafc' }}>
                  {['Tenant', 'Property', 'Lease End', 'Rent / Month', 'Status', 'Action'].map((h, idx) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #f0f2f5', textAlign: idx >= 2 && idx <= 3 ? 'right' : idx === 5 ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.filter(t => !tenantQ || t.name?.toLowerCase().includes(tenantQ.toLowerCase()) || t.property?.toLowerCase().includes(tenantQ.toLowerCase())).map((t, i) => {
                  const leaseEnd   = t.leaseEnd ? new Date(t.leaseEnd) : null;
                  const daysLeft   = leaseEnd ? Math.ceil((leaseEnd.getTime() - now.getTime()) / 86400000) : null;
                  const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
                  const isExpired  = daysLeft !== null && daysLeft <= 0;
                  const statusColor = isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#10b981';
                  const statusBg    = isExpired ? '#fff1f2' : isExpiring ? '#fffbeb' : '#f0fdf4';
                  const statusLabel = isExpired ? 'Expired' : isExpiring ? `${daysLeft}d left` : 'Active';
                  const avatarColors = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4'];
                  const ac = avatarColors[i % avatarColors.length];
                  return (
                    <tr key={t.id || i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.12s', cursor: 'pointer' }}
                      onClick={() => navigate(`/tenants/${t.id || t._id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      {/* Tenant Name */}
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${ac}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: ac, flexShrink: 0 }}>
                            {t.name?.[0]?.toUpperCase() || 'T'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{t.name}</p>
                            <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>{t.code || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Property */}
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.property || '—'}
                      </td>

                      {/* Lease End */}
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        {leaseEnd ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#475569', whiteSpace: 'nowrap' }}>
                            {leaseEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        ) : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                      </td>

                      {/* Rent */}
                      <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: (t.currentRent || 0) === 0 ? '#cbd5e1' : '#0f172a', whiteSpace: 'nowrap' }}>
                        {(t.currentRent || 0) === 0 ? '—' : `₹${t.currentRent.toLocaleString('en-IN')}`}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: statusBg, color: statusColor, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }}/>
                          {statusLabel}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); navigate(`/tenants/${t.id || t._id}`); }}
                          style={{ padding: '4px 12px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#f97316', cursor: 'pointer', fontFamily: 'inherit' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px 0', textAlign: 'center', color: '#cbd5e1' }}>
                    <Users size={28} strokeWidth={1.5} style={{ marginBottom: 6, display: 'block', margin: '0 auto 8px' }}/>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>No tenants yet</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Risk Signals ── */}
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Risk Signals</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#be123c', background: '#fff1f2', padding: '3px 9px', borderRadius: 6 }}>Priority</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoices.filter(i => i.paymentStatus !== 'Paid').slice(0, 5).map((inv, i) => (
              <div key={i}
                onClick={() => navigate('/invoices')}
                style={{ display: 'flex', gap: 10, padding: '10px 12px', background: inv.paymentStatus === 'Pending' ? '#fff8f8' : '#fffbeb', borderRadius: 10, border: `1px solid ${inv.paymentStatus === 'Pending' ? '#fecdd3' : '#fde68a'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget).style.transform = 'translateX(2px)'}
                onMouseLeave={e => (e.currentTarget).style.transform = 'none'}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: inv.paymentStatus === 'Pending' ? '#fff1f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={13} color={inv.paymentStatus === 'Pending' ? '#ef4444' : '#f59e0b'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{inv.invoiceNo}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: inv.paymentStatus === 'Pending' ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>₹{(inv.balanceAmount || inv.balance || 0).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.partyName}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, color: inv.paymentStatus === 'Pending' ? '#ef4444' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{inv.paymentStatus}</span>
                </div>
              </div>
            ))}
            {expiring > 0 && (
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={13} color="#3b82f6" />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0 }}>Lease Expiry Warning</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{expiring} lease{expiring > 1 ? 's' : ''} expiring in 30 days</p>
                </div>
              </div>
            )}
            {invoices.filter(i => i.paymentStatus === 'Pending').length === 0 && expiring === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={30} color="#10b981" strokeWidth={1.5} />
                <p style={{ fontSize: 12, fontWeight: 600, color: '#10b981', margin: 0 }}>All clear — no risk signals</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lease Expiry Card ── */}
      {expiringTenants.length > 0 && (
        <div style={{ ...S.card, padding: 24, marginTop: 16, border: '1.5px solid #fde68a' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} color="#f59e0b"/>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Lease Expiry Alert</p>
                <p style={{ fontSize: 11, color: '#f59e0b', margin: 0, fontWeight: 600 }}>
                  {expiringTenants.length} lease{expiringTenants.length > 1 ? 's' : ''} expiring within 30 days
                </p>
              </div>
            </div>
            <a href="/tenants" style={{ fontSize: 12, fontWeight: 600, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '4px 12px', borderRadius: 8, textDecoration: 'none' }}>
              View All
            </a>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fef9ee', borderBottom: '2px solid #fde68a' }}>
                  {['#', 'Tenant Name', 'Company', 'Property', 'Lease End Date', 'Days Left', 'Rent'].map((h, i) => (
                    <th key={h} style={{ padding: '9px 12px', fontWeight: 700, color: '#92400e', textAlign: i >= 5 ? 'center' : 'left', whiteSpace: 'nowrap', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiringTenants.map((t, i) => {
                  const daysLeft = Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / 86400000);
                  const urgency  = daysLeft <= 7 ? '#ef4444' : daysLeft <= 15 ? '#f97316' : '#f59e0b';
                  const urgencyBg= daysLeft <= 7 ? '#fff1f2' : daysLeft <= 15 ? '#fff7ed' : '#fffbeb';
                  return (
                    <tr key={t.id}
                      onClick={() => navigate(`/tenants/${t.id || (t)._id}`)}
                      style={{ borderBottom: '1px solid #f0f2f5', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget).style.background = '#fffbeb'}
                      onMouseLeave={e => (e.currentTarget).style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#f97316', flexShrink: 0 }}>
                            {t.name[0]?.toUpperCase()}
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t.name}</p>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{t.company}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.property}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                        {new Date(t.leaseEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: urgencyBg, color: urgency, fontWeight: 700, fontSize: 11 }}>
                          {daysLeft}d
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                        ₹{(t.currentRent || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}