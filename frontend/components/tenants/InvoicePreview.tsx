import React from 'react';
import { formatCurrencyExact } from '../../src/utils/formatCurrency';
import { type Invoice, type Tenant, type Company } from '../../src/types';
import { buildInvoiceData } from './invoicePdf';

function numberToWords(n: number): string {
  const u=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!n) return 'Zero';
  const c=(x:number):string=>{
    if(x<20) return u[x];
    if(x<100) return t[Math.floor(x/10)]+(x%10?' '+u[x%10]:'');
    if(x<1000) return u[Math.floor(x/100)]+' Hundred'+(x%100?' and '+c(x%100):'');
    if(x<100000) return c(Math.floor(x/1000))+' Thousand'+(x%1000?' '+c(x%1000):'');
    if(x<10000000) return c(Math.floor(x/100000))+' Lakh'+(x%100000?' '+c(x%100000):'');
    return c(Math.floor(x/10000000))+' Crore'+(x%10000000?' '+c(x%10000000):'');
  };
  return c(Math.floor(n));
}

interface Props { invoice: Invoice; tenant?: Tenant; company?: Company; }

export function InvoicePreview({ invoice, tenant, company }: Props) {
  const d  = buildInvoiceData(invoice, tenant);
  const p0: React.CSSProperties = { margin: 0 };
  const gr = '#4a4a4a', dk = '#1a1a1a';

  return (
    <div style={{ background:'#fff', width:'100%', maxWidth:800, padding:'36px 48px 48px', fontFamily:'Arial,sans-serif', color:dk, fontSize:11, lineHeight:1.6 }}>

      {/* ── Company Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
          <p style={{ ...p0, fontSize:14, fontWeight:700, marginBottom:6, wordBreak:'break-word' }}>
            {company?.companyName||invoice.company}
          </p>
          <div style={{ fontSize:10.5, color:gr, lineHeight:1.85 }}>
            {company?.address && <p style={{ ...p0, wordBreak:'break-word' }}>{company.address}</p>}
            <p style={p0}>Phone no. : {company?.phoneNumber||'N/A'}</p>
            <p style={p0}>Email : {company?.email||'N/A'}</p>
            <p style={p0}>GSTIN : {company?.gstNumber||'N/A'}</p>
            <p style={p0}>State: {company?.state||'Madhya Pradesh'}</p>
          </div>
        </div>
        {company?.logoUrl && (
          <img src={company.logoUrl} alt="Logo" referrerPolicy="no-referrer"
            style={{ width:68, height:68, objectFit:'contain', flexShrink:0 }}/>
        )}
      </div>

      {/* ── INVOICE Title — only top border ── */}
      <div style={{ borderTop:'1.5px solid #c8c8c8', textAlign:'center', padding:'10px 0 10px', margin:'0 0 20px' }}>
        <span style={{ fontSize:22, fontWeight:700, letterSpacing:'0.38em', color:'#8a8a8a' }}>INVOICE</span>
      </div>

      {/* ── Bill To / Ship To / Invoice Details ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 0.9fr', gap:12, marginBottom:20, fontSize:10.5 }}>

        {/* Bill To */}
        <div style={{ overflow:'hidden', minWidth:0 }}>
          <p style={{ ...p0, fontWeight:800, fontSize:11.5, marginBottom:6, color:dk }}>Bill To</p>
          <p style={{ ...p0, fontWeight:700, marginBottom:4, wordBreak:'break-word' }}>
            {tenant?.legalName||tenant?.name||invoice.partyName}
          </p>
          <div style={{ color:gr, lineHeight:1.85 }}>
            {tenant?.billingAddress && (
              <p style={{ ...p0, whiteSpace:'pre-line', wordBreak:'break-word' }}>{tenant.billingAddress}</p>
            )}
            <p style={p0}>GSTIN : {tenant?.gstNo||'Unregistered'}</p>
            <p style={p0}>State: 23-Madhya Pradesh</p>
            <p style={p0}>Security Deposit : {tenant?.securityDeposit?`${tenant.securityDeposit}/-`:'-'}</p>
            {tenant?.leaseStart && <p style={p0}>Rent Start Date : {d.lng(tenant.leaseStart)}</p>}
            {tenant?.leaseEnd   && <p style={p0}>Agreement End Date: {d.lng(tenant.leaseEnd)}</p>}
            {tenant?.nextEscalationDate && (
              <p style={p0}>Rent Escalation : {new Date(tenant.nextEscalationDate).toLocaleDateString('en-GB')}</p>
            )}
          </div>
        </div>

        {/* Ship To — only property, no tenant name */}
        <div style={{ overflow:'hidden', minWidth:0 }}>
          <p style={{ ...p0, fontWeight:800, fontSize:11.5, marginBottom:6, color:dk }}>Ship To</p>
          <p style={{ ...p0, color:gr, whiteSpace:'pre-line', lineHeight:1.85, wordBreak:'break-word' }}>
            {tenant?.property||''}
          </p>
        </div>

        {/* Invoice Details — right aligned */}
        <div style={{ textAlign:'right', minWidth:0 }}>
          <p style={{ ...p0, fontWeight:800, fontSize:11.5, marginBottom:6, color:dk }}>Invoice Details</p>
          <div style={{ color:gr, lineHeight:2.0 }}>
            <p style={p0}>Invoice No. : {invoice.invoiceNo}</p>
            <p style={p0}>Date : {d.fmt(d.bd)}</p>
            <p style={p0}>Due Date : {d.fmt(d.due)}</p>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            {[
              {h:'#',          w:'5%',  right:false},
              {h:'Particular', w:'35%', right:false},
              {h:'HSN/ SAC',   w:'12%', right:false},
              {h:'Month',      w:'13%', right:false},
              {h:'From',       w:'11%', right:false},
              {h:'To',         w:'11%', right:false},
              {h:'Amount',     w:'13%', right:true },
            ].map(({h, w, right}) => (
              <th key={h} style={{ padding:'9px 10px', fontSize:10.5, fontWeight:700, color:'#fff', backgroundColor:'#232323', textAlign:right?'right':'left', whiteSpace:'nowrap', width:w }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.rows.map((item:any, i:number) => (
            <tr key={i} style={{ borderBottom:'1px solid #e0e0e0' }}>
              <td style={{ padding:'9px 10px', fontSize:10.5 }}>{i+1}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5, fontWeight:700 }}>{item.particular}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5 }}>{item.hsnSac}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5 }}>{item.month}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5 }}>{item.fromDate ? new Date(item.fromDate).toLocaleDateString('en-GB') : '-'}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5 }}>{item.toDate   ? new Date(item.toDate).toLocaleDateString('en-GB')   : '-'}</td>
              <td style={{ padding:'9px 10px', fontSize:10.5, textAlign:'right' }}>{formatCurrencyExact(item.amount||0)}</td>
            </tr>
          ))}
          {/* Total row */}
          <tr style={{ borderTop:'2px solid #1a1a1a' }}>
            <td colSpan={5} style={{ padding:'9px 10px' }}/>
            <td style={{ padding:'9px 10px', fontWeight:700, fontSize:11, textAlign:'left' }}>Total</td>
            <td style={{ padding:'9px 10px', fontWeight:700, fontSize:13, textAlign:'right' }}>
              {formatCurrencyExact(d.base)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Description + GST Summary ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 230px', gap:24, marginBottom:22 }}>

        <div style={{ fontSize:10.5 }}>
          <div style={{ marginBottom:11 }}>
            <p style={{ ...p0, fontWeight:700, marginBottom:3 }}>Description</p>
            <p style={{ ...p0, color:gr, lineHeight:1.85 }}>{d.desc}</p>
          </div>
          <div style={{ marginBottom:11 }}>
            <p style={{ ...p0, fontWeight:700, marginBottom:3 }}>Invoice Amount In Words</p>
            <p style={{ ...p0, color:gr, fontStyle:'italic', lineHeight:1.85 }}>
              {numberToWords(d.fin)} Rupees Only
            </p>
          </div>
          <div>
            <p style={{ ...p0, fontWeight:700, marginBottom:3 }}>Terms and Conditions</p>
            <p style={{ ...p0, color:gr, lineHeight:1.85 }}>
              Please pay before due date.<br/>
              Late payment penalty charges # 1.5% Per Month
            </p>
          </div>
        </div>

        {/* GST summary — no border between rows */}
        <div style={{ fontSize:11 }}>
          {[
            { l:'Sub Total',        v: d.base },
            { l:`SGST@${d.tax}%`,   v: d.sgst },
            { l:`CGST@${d.tax}%`,   v: d.cgst },
            { l:'Round off',        v: d.ro   },
          ].map(({ l, v }, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <span style={{ color:gr }}>{l}</span>
              <span style={{ fontWeight:600, color:dk }}>{formatCurrencyExact(Math.abs(v))}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#232323', padding:'9px 12px', marginTop:8 }}>
            <span style={{ fontWeight:700, fontSize:12, letterSpacing:'0.05em', color:'#fff' }}>Total</span>
            <span style={{ fontWeight:800, fontSize:14, color:'#fff' }}>{formatCurrencyExact(d.fin)}</span>
          </div>
        </div>
      </div>

      {/* ── Pay To + Signature ── */}
      <div style={{ borderTop:'1px solid #c8c8c8', paddingTop:18, display:'grid', gridTemplateColumns:'1fr auto', gap:0, fontSize:10.5 }}>
        <div>
          <p style={{ ...p0, fontWeight:700, fontSize:12, marginBottom:10 }}>Pay To:</p>
          <div style={{ lineHeight:2.0 }}>
            <p style={p0}>Bank Name : {company?.bankName||'N/A'}</p>
            <p style={p0}>Bank Account No. : {company?.accountNumber||'N/A'}</p>
            <p style={p0}>Bank IFSC code : {company?.ifscCode||'N/A'}</p>
            <p style={p0}>Account holder's name : {company?.accountHolderName||company?.companyName||invoice.company}</p>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:170, paddingLeft:20 }}>
          <p style={{ ...p0, fontSize:11, marginBottom:10, alignSelf:'flex-start' }}>
            For :{company?.companyName||invoice.company}
          </p>
          {/* Empty space for physical seal */}
          <div style={{ width:68, height:68, marginBottom:10 }}/>
          <div style={{ borderTop:'1px solid #bbb', paddingTop:5, textAlign:'center', width:'100%' }}>
            <p style={{ ...p0, fontSize:11, fontWeight:700 }}>Authorized Signatory</p>
          </div>
        </div>
      </div>

    </div>
  );
}
