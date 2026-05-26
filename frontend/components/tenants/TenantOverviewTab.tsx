import React from 'react';
import { IndianRupee, Phone, Mail, MapPin, Building, User as UserIcon, Receipt, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { type Tenant, type Company, type LedgerSummary } from '../../src/types';
import { SummaryItem } from './TenantPrimitives';
import { formatCurrency } from '../../src/utils/formatCurrency';

const SC: React.CSSProperties = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };
const p0: React.CSSProperties = { margin:0 };

interface Props {
  tenant:         Tenant;
  company?:       Company;
  paymentSummary: any;
  ledgerData:     { summary: LedgerSummary } | null;
  chartData:      any[];
}

export function TenantOverviewTab({ tenant, company, paymentSummary, ledgerData, chartData }: Props) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Monthly Rent',    val:tenant.currentRent||0,                    color:'#f97316', bg:'#fff7ed', Icon:IndianRupee  },
          { label:'Total Invoiced',  val:paymentSummary.totalInvoiced||0,          color:'#6366f1', bg:'#eef2ff', Icon:Receipt      },
          { label:'Total Received',  val:paymentSummary.totalReceived||0,          color:'#10b981', bg:'#f0fdf4', Icon:CheckCircle2 },
          { label:'Pending Balance', val:paymentSummary.pendingBalance||0,
            color:paymentSummary.pendingBalance>0?'#ef4444':'#10b981',
            bg:paymentSummary.pendingBalance>0?'#fff1f2':'#f0fdf4', Icon:Clock },
        ].map(s => (
          <div key={s.label} style={{ ...SC, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <s.Icon size={20} color={s.color}/>
            </div>
            <div>
              <p style={{ ...p0, fontSize:10, color:'#9ba8b5', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</p>
              <p style={{ ...p0, fontSize:18, fontWeight:800, color:s.color, whiteSpace:'nowrap' }}>{formatCurrency(s.val)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Details */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>
        {/* Area Chart */}
        <div style={{ ...SC, padding:20 }}>
          <p style={{ ...p0, fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:16 }}>Payment Trend</p>
          {chartData.length > 0 ? (
            <div style={{ height:200, minHeight:200, width:'100%', minWidth:0 }}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} barGap={2} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:9, fill:'#9ba8b5' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:9, fill:'#9ba8b5' }} axisLine={false} tickLine={false}
                    tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(0)}K`:String(v)}/>
                  <Tooltip
                    contentStyle={{ borderRadius:10, border:'1px solid #f0f2f5', fontSize:11, fontFamily:'inherit' }}
                    formatter={(v:any, name:string)=>[formatCurrency(v), name==='invoiced'?'Invoiced':'Received']}/>
                  {/* Invoiced — Orange candle */}
                  <Bar dataKey="invoiced" name="invoiced" fill="#f97316" radius={[4,4,0,0]} maxBarSize={32}>
                    {chartData.map((_:any, i:number) => (
                      <Cell key={i} fill="#f97316" fillOpacity={0.85}/>
                    ))}
                  </Bar>
                  {/* Received — Green candle */}
                  <Bar dataKey="received" name="received" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32}>
                    {chartData.map((_:any, i:number) => (
                      <Cell key={i} fill="#10b981" fillOpacity={0.85}/>
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:'#f97316' }}/>
                  <span style={{ fontSize:10, color:'#9ba8b5', fontWeight:600 }}>Invoiced</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:12, height:12, borderRadius:3, background:'#10b981' }}/>
                  <span style={{ fontSize:10, color:'#9ba8b5', fontWeight:600 }}>Received</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ color:'#c5cdd6', fontSize:12 }}>No data yet</p>
            </div>
          )}
        </div>

        {/* Tenant Info */}
        <div style={{ ...SC, padding:20 }}>
          <p style={{ ...p0, fontSize:13, fontWeight:700, color:'#1a1a2e', marginBottom:14 }}>Tenant Details</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { icon:UserIcon,    val: tenant.contactPerson||'-',          label:'Contact Person' },
              { icon:Phone,       val: tenant.mobile||'-',                 label:'Mobile'         },
              { icon:Mail,        val: (tenant.email||'-').slice(0,28),    label:'Email'          },
              { icon:MapPin,      val: (tenant.property||'-').slice(0,32), label:'Property'       },
              { icon:Building,    val: company?.companyName||tenant.company||'-', label:'Company'},
              { icon:IndianRupee, val: formatCurrency(tenant.securityDeposit||0), label:'Security Deposit'},
            ].map(({ icon:Icon, val, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Icon size={14} color="#f97316" style={{ flexShrink:0 }}/>
                <div>
                  <p style={{ ...p0, fontSize:9, color:'#9ba8b5', fontWeight:600 }}>{label}</p>
                  <p style={{ ...p0, fontSize:11, fontWeight:600, color:'#1a1a2e' }}>{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      {ledgerData && (
        <div style={{ display:'flex', gap:10 }}>
          {[
            { label:'Opening Bal', val: formatCurrency(ledgerData.summary.openingBalance||0),
              style:{ background:'#f8f9fb', border:'1px solid #f0f2f5', color:'#5a6474' } },
            { label:(ledgerData.summary.closingBalance||0)<0?'Advance Bal':'Closing Bal',
              val: formatCurrency(Math.abs(ledgerData.summary.closingBalance||0)),
              style:{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316' } },
          ].map((b,i) => (
            <div key={i} style={{ padding:'8px 14px', borderRadius:10, textAlign:'center', ...b.style }}>
              <p style={{ ...p0, fontSize:9, fontWeight:700, opacity:0.7 }}>{b.label}</p>
              <p style={{ ...p0, fontSize:14, fontWeight:800 }}>{b.val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
