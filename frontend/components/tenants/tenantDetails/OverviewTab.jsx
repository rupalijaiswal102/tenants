import { TrendingUp, CheckCircle2, ShieldCheck, IndianRupee,
         User, Phone, Mail, MapPin, Building } from 'lucide-react';
import { motion } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

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
  return (
    <motion.div key="ov" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {STAT_CARDS(paymentSummary).map((s, i) => (
          <div key={i} style={{ ...SC, borderLeft:`3px solid ${s.color}`, borderRadius:'0 16px 16px 0', padding:'16px 18px' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <s.Icon size={15} color={s.color}/>
            </div>
            <div style={{ fontSize:9, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.5px', marginTop:2 }}>
              {fmt(s.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Contact */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:14 }}>

        {/* Revenue Chart */}
        <div style={{ ...SC, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Analytics</p>
              <p style={{ fontSize:11, color:'#9ba8b5', marginTop:2 }}>Revenue trends — last 6 months</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[{ c:'#f97316', l:'Invoiced' }, { c:'#10b981', l:'Received' }].map(x => (
                <span key={x.l} style={{ fontSize:10, fontWeight:600, color:'#9ba8b5', background:'#f8f9fb', padding:'3px 9px', borderRadius:6, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:x.c, display:'inline-block' }}/> {x.l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height:210 }}>
            {analytics.monthlyTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrend}>
                  <defs>
                    <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:600, fill:'#9ba8b5' }} dy={6}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:600, fill:'#9ba8b5' }}
                    tickFormatter={v => `₹${Math.round(v/1000)}k`}/>
                  <Tooltip contentStyle={{ borderRadius:12, border:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.08)', fontSize:12 }}
                    formatter={(v) => [fmt(v), '']}/>
                  <Area type="monotone" dataKey="invoiced" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#gi)"/>
                  <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gr)"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#c5cdd6', gap:8 }}>
                <TrendingUp size={28} strokeWidth={1}/>
                <p style={{ fontSize:12 }}>Not enough data</p>
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