import React from 'react';
import { Plus, Eye, Trash2, Clock, IndianRupee, FileText, History } from 'lucide-react';
import { motion } from 'motion/react';
import { FileCheck } from 'lucide-react';
import { type Tenant, type Company, type Invoice } from '../../src/types';
import { InvoiceStatusBadge, TimelineItemLarge, ConfigBlock } from './TenantPrimitives';
import { formatCurrency } from '../../src/utils/formatCurrency';

const SC: React.CSSProperties = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };

// ── FileViewer ────────────────────────────────────────────────────────────────
function FileViewer({ fileUrl }: { fileUrl: string }) {
  const base    = (import.meta as any).env?.VITE_API_URL || '';
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${base}${fileUrl}`;
  const isPDF   = fileUrl.includes('/raw/') || fileUrl.toLowerCase().endsWith('.pdf');
  return (
    <div style={{ ...SC, padding:24, maxWidth:380, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
      <div style={{ width:56, height:56, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <FileCheck size={26} color="#10b981"/>
      </div>
      <div>
        <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Agreement</p>
        <p style={{ fontSize:11, color:'#9ba8b5', marginTop:4 }}>{isPDF ? 'PDF Document' : 'Image Document'}</p>
      </div>
      <div style={{ display:'flex', gap:10, width:'100%' }}>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer"
          style={{ flex:1, padding:'9px', background:'#f8f9fb', color:'#5a6474', borderRadius:9, fontWeight:600, fontSize:12, textAlign:'center', textDecoration:'none', border:'1px solid #f0f2f5' }}>
          👁 Preview
        </a>
        <a href={fullUrl} download rel="noopener noreferrer"
          style={{ flex:1, padding:'9px', background:'#10b981', color:'#fff', borderRadius:9, fontWeight:700, fontSize:12, textAlign:'center', textDecoration:'none' }}>
          ⬇ Download
        </a>
      </div>
    </div>
  );
}

// ── Billing Tab ───────────────────────────────────────────────────────────────
interface BillingProps {
  invoices:         Invoice[];
  onPay:            (inv: Invoice) => void;
  onView:           (inv: Invoice) => void;
  onEdit:           (inv: Invoice) => void;
  onDelete:         (inv: Invoice) => void;
}

export function TenantBillingTab({ invoices, onPay, onView, onEdit, onDelete }: BillingProps) {
  return (
    <motion.div key="inv" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
      style={{ ...SC, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Billing History</p>
          <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>Complete record of generated invoices</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <InvoiceStatusBadge status="Paid"/><InvoiceStatusBadge status="Partial"/><InvoiceStatusBadge status="Pending"/>
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8f9fb' }}>
              {['Inv No.','Bill Date','Total','Received','TDS','Balance','Status','Actions'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f0f2f5', textAlign:i>=2&&i<=5?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length===0 ? (
              <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#9ba8b5', fontSize:13 }}>No billing records found.</td></tr>
            ) : invoices.map((inv: Invoice) => (
              <tr key={inv.id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#fafbfc'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                <td style={{ padding:'11px 16px', fontSize:11, fontWeight:700, color:'#9ba8b5' }}>#{inv.invoiceNo}</td>
                <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{inv.billDate}</td>
                <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#1a1a2e', textAlign:'right' }}>{formatCurrency(inv.totalInvoice??0)}</td>
                <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right' }}>{formatCurrency(inv.receivedAmount||inv.received||0)}</td>
                <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#8b5cf6', textAlign:'right' }}>{formatCurrency(inv.tdsAmount||0)}</td>
                <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#ef4444', textAlign:'right' }}>{formatCurrency(inv.balanceAmount||inv.balance||0)}</td>
                <td style={{ padding:'11px 16px' }}><InvoiceStatusBadge status={inv.paymentStatus}/></td>
                <td style={{ padding:'11px 16px' }}>
                  <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                    <button onClick={()=>onPay(inv)}    style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:700, color:'#15803d', display:'flex', alignItems:'center', gap:3, fontFamily:'inherit' }}><Plus size={11}/> Pay</button>
                    <button onClick={()=>onView(inv)}   style={{ padding:'4px 8px', background:'#f8f9fb', border:'1px solid #f0f2f5', borderRadius:6, cursor:'pointer', color:'#5a6474', display:'flex', alignItems:'center', fontFamily:'inherit' }}><Eye size={12}/></button>
                    <button onClick={()=>onEdit(inv)}   style={{ padding:'4px 8px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, cursor:'pointer', color:'#b45309', display:'flex', alignItems:'center', fontFamily:'inherit' }}><History size={12}/></button>
                    <button onClick={()=>onDelete(inv)} style={{ padding:'4px 8px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:6, cursor:'pointer', color:'#e11d48', display:'flex', alignItems:'center', fontFamily:'inherit' }}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ── Lease Tab ─────────────────────────────────────────────────────────────────
interface LeaseProps { tenant: Tenant; lockInExpiry: string | undefined; }

export function TenantLeaseTab({ tenant, lockInExpiry }: LeaseProps) {
  return (
    <motion.div key="ls" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
      style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ ...SC, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}><Clock size={15} color="#f97316"/></div>
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Roadmap</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <TimelineItemLarge label="Lease Commencement" date={tenant.leaseStart}  desc="Initial move-in and rent start date" active/>
          <TimelineItemLarge label="Lock-in Period Ends" date={lockInExpiry}      desc="Minimum commitment period ends"/>
          <TimelineItemLarge label="Lease Expiration"    date={tenant.leaseEnd}   desc="Agreement renewal or termination" danger/>
        </div>
      </div>
      <div style={{ ...SC, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}><IndianRupee size={15} color="#10b981"/></div>
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Configuration</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            ['Monthly Rent',     formatCurrency(tenant.currentRent??0),     true ],
            ['Security Deposit', formatCurrency(tenant.securityDeposit??0), true ],
            ['Rent-Free Period', `${tenant.rentFreePeriodDays} Days`,        false],
            ['Notice Period',    `${tenant.noticePeriod} Days`,              false],
            ['Lease Tenure',     `${tenant.tenure} Months`,                  false],
            ['Lock-in Period',   `${tenant.lockIn} Months`,                  false],
            ['Escalation',       `${tenant.escalationPercent}%`,             false],
            ['Purpose',          tenant.rentalPurpose||'—',                  false],
          ].map(([l,v,h])=><ConfigBlock key={l as string} label={l as string} value={v as string} highlight={h as boolean}/>)}
        </div>
      </div>
    </motion.div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
export function TenantDocumentsTab({ tenant }: { tenant: Tenant }) {
  return (
    <motion.div key="doc" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
      {tenant.agreementFileUrl ? (
        <FileViewer fileUrl={tenant.agreementFileUrl}/>
      ) : (
        <div style={{ ...SC, padding:40, maxWidth:300, display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center', border:'2px dashed #f0f2f5', background:'transparent' }}>
          <FileText size={32} color="#e0e4ea"/>
          <p style={{ fontSize:13, fontWeight:600, color:'#9ba8b5', margin:0 }}>No documents uploaded</p>
        </div>
      )}
    </motion.div>
  );
}
