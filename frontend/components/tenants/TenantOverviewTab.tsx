import React from 'react';
import { IndianRupee, Phone, Mail, MapPin, Building, User as UserIcon, Receipt, CheckCircle2, Clock, TrendingUp, Calendar, Shield } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { type Tenant, type Company, type LedgerSummary } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { useResponsive } from '../../src/hooks/useResponsive';

interface Props {
  tenant:         Tenant;
  company?:       Company;
  paymentSummary: any;
  ledgerData:     { summary: LedgerSummary } | null;
  chartData:      any[];
}

export function TenantOverviewTab({ tenant, company, paymentSummary, ledgerData, chartData }: Props) {
  const { isMobile, isTablet } = useResponsive();
  const p0: React.CSSProperties = { margin: 0 };

  const stats = [
    { label:'Monthly Rent',    val:tenant.currentRent||0,           color:'#f97316', bg:'#fff7ed', Icon:IndianRupee  },
    { label:'Total Invoiced',  val:paymentSummary.totalInvoiced||0, color:'#6366f1', bg:'#eef2ff', Icon:Receipt      },
    { label:'Total Received',  val:paymentSummary.totalReceived||0, color:'#10b981', bg:'#f0fdf4', Icon:CheckCircle2 },
    { label:'Pending Balance', val:paymentSummary.pendingBalance||0,
      color: paymentSummary.pendingBalance > 0 ? '#ef4444' : '#10b981',
      bg:    paymentSummary.pendingBalance > 0 ? '#fff1f2' : '#f0fdf4', Icon: Clock },
  ];

  const details = [
    { icon:UserIcon,    val: tenant.contactPerson||'—',       label:'Contact Person' },
    { icon:Phone,       val: tenant.mobile||'—',              label:'Mobile'         },
    { icon:Mail,        val: (tenant.email||'—').slice(0,28), label:'Email'          },
    { icon:MapPin,      val: (tenant.property||'—'),          label:'Property'       },
    { icon:Building,    val: company?.companyName||tenant.company||'—', label:'Company' },
    { icon:Calendar,    val: tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString('en-IN') : '—', label:'Lease End' },
    { icon:IndianRupee, val: formatCurrency(tenant.securityDeposit||0), label:'Security Deposit' },
    { icon:Shield,      val: tenant.gstNo||'Unregistered',    label:'GSTIN'          },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f2f5', padding: isMobile ? '14px 12px' : '18px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <s.Icon size={isMobile ? 16 : 20} color={s.color}/>
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ ...p0, fontSize: isMobile ? 9 : 10, color:'#9ba8b5', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.label}</p>
              <p style={{ ...p0, fontSize: isMobile ? 14 : 18, fontWeight:800, color:s.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{formatCurrency(s.val)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Details ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:14 }}>

        {/* Chart */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ ...p0, fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:16 }}>Payment Trend</p>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 140 : 180}>
                <ComposedChart data={chartData} barGap={2} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:'#9ba8b5' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:9, fill:'#9ba8b5' }} axisLine={false} tickLine={false}
                    tickFormatter={(v:number) => v>=1000?`${(v/1000).toFixed(0)}K`:String(v)}/>
                  <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #f0f2f5', fontSize:11 }}
                    formatter={(v:any, name:string) => [formatCurrency(v), name==='invoiced'?'Invoiced':'Received']}/>
                  <Bar dataKey="invoiced" fill="#f97316" radius={[4,4,0,0]} maxBarSize={28}>
                    {chartData.map((_:any, i:number) => <Cell key={i} fill="#f97316" fillOpacity={0.85}/>)}
                  </Bar>
                  <Bar dataKey="received" fill="#10b981" radius={[4,4,0,0]} maxBarSize={28}>
                    {chartData.map((_:any, i:number) => <Cell key={i} fill="#10b981" fillOpacity={0.85}/>)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8 }}>
                {[['#f97316','Invoiced'],['#10b981','Received']].map(([c,l]) => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:c }}/>
                    <span style={{ fontSize:10, color:'#9ba8b5', fontWeight:600 }}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height:isMobile?140:180, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center' }}>
                <TrendingUp size={32} color="#f0f2f5"/>
                <p style={{ ...p0, fontSize:12, color:'#c5cdd6', marginTop:8 }}>No payment data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Tenant Info */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ ...p0, fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>Tenant Details</p>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: isMobile ? 10 : 10 }}>
            {details.map(({ icon:Icon, val, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(249,115,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={13} color="#f97316"/>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ ...p0, fontSize:9, color:'#9ba8b5', fontWeight:600 }}>{label}</p>
                  <p style={{ ...p0, fontSize:11, fontWeight:600, color:'#1a1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Balance Summary ── */}
      {ledgerData && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { label:'Opening Balance', val: formatCurrency(ledgerData.summary.openingBalance||0),
              style:{ background:'#f8f9fb', border:'1px solid #f0f2f5', color:'#5a6474' } },
            { label: (ledgerData.summary.closingBalance||0) < 0 ? 'Advance Balance' : 'Closing Balance',
              val: formatCurrency(Math.abs(ledgerData.summary.closingBalance||0)),
              style:{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316' } },
          ].map((b,i) => (
            <div key={i} style={{ padding:'10px 18px', borderRadius:12, ...b.style, flex: isMobile ? '1' : 'unset' }}>
              <p style={{ ...p0, fontSize:9, fontWeight:700, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.06em' }}>{b.label}</p>
              <p style={{ ...p0, fontSize:16, fontWeight:800 }}>{b.val}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
