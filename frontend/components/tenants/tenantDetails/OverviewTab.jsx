import { TrendingUp, CheckCircle2, ShieldCheck, IndianRupee,
         User, Phone, Mail, MapPin, Building } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const SC = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };
const fmt = (v) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;

const STAT_CARDS = (paymentSummary) => [
  { label:'Total Invoiced',  val: paymentSummary.totalInvoiced  || 0, color:'#6366f1', bg:'#eef2ff', Icon: IndianRupee  },
  { label:'Total Received',  val: paymentSummary.totalReceived  || 0, color:'#10b981', bg:'#f0fdf4', Icon: CheckCircle2 },
  { label:'TDS Deducted',    val: paymentSummary.totalTds       || 0, color:'#8b5cf6', bg:'#f5f3ff', Icon: ShieldCheck  },
  { label:'Pending Balance', val: paymentSummary.pendingBalance || 0,
    color: paymentSummary.pendingBalance > 0 ? '#ef4444' : '#10b981',
    bg:    paymentSummary.pendingBalance > 0 ? '#fff1f2' : '#f0fdf4',
    Icon:  TrendingUp },
];

const CONTACT_FIELDS = (tenant) => [
  { Icon: User,   label:'Contact',   val: tenant.contactPerson          },
  { Icon: User,   label:'Alternate', val: tenant.alternateContactPerson },
  { Icon: Phone,  label:'Mobile',    val: tenant.mobile                 },
  { Icon: Mail,   label:'Email',     val: tenant.email                  },
  { Icon: MapPin, label:'Address',   val: tenant.billingAddress         },
];

export default function OverviewTab({ tenant, paymentSummary = {}, analytics = {} }) {
  const [chartType, setChartType] = useState('bar');
  return (
    <motion.div key="ov" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {STAT_CARDS(paymentSummary).map((s, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', borderLeft:`4px solid ${s.color}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', padding:'18px 20px' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <s.Icon size={17} color={s.color}/>
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.6px', lineHeight:1.2 }}>
              {fmt(s.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Contact */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:14 }}>

        {/* Revenue Chart */}
        <div style={{ ...SC, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>Financial Analytics</p>
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>Planned vs Actual — last 6 months</p>
            </div>
            {/* Toggle buttons */}
            <div style={{ display:'flex', gap:3, background:'#f1f5f9', borderRadius:10, padding:3 }}>
              {[{ k:'combined', l:'Combined' }, { k:'bar', l:'Bar' }, { k:'line', l:'Line' }].map(t => (
                <button key={t.k} onClick={() => setChartType(t.k)}
                  style={{ padding:'5px 11px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', transition:'all 0.15s',
                    background: chartType === t.k ? '#1e3a5f' : 'transparent',
                    color:      chartType === t.k ? '#fff'    : '#64748b',
                  }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height:230 }}>
            {analytics.monthlyTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.monthlyTrend} margin={{ left:-8, right:8 }} barGap={4}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8edf4"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:600, fill:'#94a3b8' }} dy={6}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:600, fill:'#94a3b8' }}
                    tickFormatter={v => v === 0 ? '₹0L' : `₹${(v/100000).toFixed(0)}L`}/>
                  <Tooltip contentStyle={{ borderRadius:12, border:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', fontSize:12 }}
                    formatter={(v, name) => [`₹${(v/100000).toFixed(2)}L`, name === 'invoiced' ? 'Planned' : name === 'received' ? 'Actual' : 'Variance']}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, paddingTop:12, color:'#64748b' }}
                    formatter={name => name === 'invoiced' ? 'Planned' : name === 'received' ? 'Actual' : 'Variance'}/>
                  {(chartType === 'combined' || chartType === 'bar') && (
                    <Bar dataKey="invoiced" name="invoiced" fill="#1e3a5f" radius={[4,4,0,0]} barSize={20}/>
                  )}
                  {(chartType === 'combined' || chartType === 'bar') && (
                    <Bar dataKey="received" name="received" fill="#5bc4c4" radius={[4,4,0,0]} barSize={20}/>
                  )}
                  {(chartType === 'combined' || chartType === 'line') && (
                    <Line type="monotone" dataKey="received" name="received" stroke="#5bc4c4" strokeWidth={2.5} dot={{ fill:'#5bc4c4', r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                <TrendingUp size={32} color="#e2e8f0" strokeWidth={1}/>
                <p style={{ fontSize:12, color:'#94a3b8' }}>Not enough data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact + GST */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ ...SC, padding:16 }}>
            <p style={{ fontSize:12, fontWeight:800, color:'#1a1a2e', margin:'0 0 10px' }}>Contact Dossier</p>
            {CONTACT_FIELDS(tenant).map((f, i) => (
              <div key={i} style={{ display:'flex', gap:8, padding:'7px 0', borderBottom: i < 4 ? '1px solid #f8f9fb' : 'none' }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <f.Icon size={11} color="#9ba8b5"/>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:8, fontWeight:700, color:'#c5cdd6', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{f.label}</p>
                  <p style={{ fontSize:11, fontWeight:600, color:'#1a1a2e', margin:'1px 0 0', wordBreak:'break-word' }}>{f.val || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...SC, padding:14, background:'rgba(249,115,22,0.03)', border:'1px solid rgba(249,115,22,0.1)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
              <ShieldCheck size={12} color="#f97316"/>
              <p style={{ fontSize:9, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>GST Compliance</p>
            </div>
            <p style={{ fontSize:11, fontWeight:700, color:'#1a1a2e', margin:'0 0 8px' }}>{tenant.legalName || tenant.name}</p>
            <div style={{ background:'#fff', padding:'4px 10px', borderRadius:7, border:'1px solid rgba(249,115,22,0.12)', display:'inline-block' }}>
              <p style={{ fontSize:8, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', margin:0 }}>GSTIN</p>
              <p style={{ fontSize:11, fontWeight:800, color:'#f97316', margin:0 }}>{tenant.gstNo || 'Not Provided'}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}