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
      <div style={{ borderTop:'1.5px solid #c8c8c8', textAlign:'center', padding:'10px 0 14px', margin:'0 0 20px' }}>
        <span style={{ fontSize:22, fontWeight:700, letterSpacing:'0.38em', color:'#8a8a8a' }}>INVOICE</span>
      </div>

      {/* ── Bill To / Ship To / Invoice Details — no top border ── */}
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
            {/* GSTIN — hide if empty or Unregistered */}
            {tenant?.gstNo && tenant.gstNo !== 'Unregistered' && (
              <p style={p0}>GSTIN : {tenant.gstNo}</p>
            )}
            <p style={p0}>State: 23-Madhya Pradesh</p>
            {/* Security Deposit — hide if 0 or empty */}
            {tenant?.securityDeposit && Number(tenant.securityDeposit) > 0 && (
              <p style={p0}>Security Deposit : {tenant.securityDeposit}/-</p>
            )}
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
            {/* CRM Contact — show only if filled, no border line */}
            {(invoice.crmName || invoice.crmPhone || invoice.crmEmail) && (
              <div style={{ marginTop:6 }}>
                {invoice.crmName  && <p style={p0}>CRM : {invoice.crmName}</p>}
                {invoice.crmPhone && <p style={p0}>Phone : {invoice.crmPhone}</p>}
                {invoice.crmEmail && <p style={p0}>Email : {invoice.crmEmail}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20, borderTop:'none' }}>
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
              <th key={h} style={{ padding:'9px 10px', fontSize:10.5, fontWeight:700, color:'#fff', backgroundColor:'#555555', textAlign:right?'right':'left', whiteSpace:'nowrap', width:w }}>
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
          {/* Total row — "Total" under Particular column */}
          <tr style={{ borderTop:'1.5px solid #aaaaaa', borderBottom:'1.5px solid #d0d0d0' }}>
            <td style={{ padding:'9px 10px' }}/>
            <td style={{ padding:'9px 10px', fontWeight:800, fontSize:12, textAlign:'left', color:'#1a1a1a' }}>Total</td>
            <td colSpan={4} style={{ padding:'9px 10px' }}/>
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
            { l:'Sub Total',        v: d.base, always: true  },
            { l:`CGST@${d.tax}%`,   v: d.cgst, always: false },
            { l:`SGST@${d.tax}%`,   v: d.sgst, always: false },
            { l:'Round off',        v: d.ro,   always: true  },
          ].filter(row => row.always || row.v > 0)   // hide GST rows if 0
           .map(({ l, v }, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <span style={{ color:gr }}>{l}</span>
              <span style={{ fontWeight:600, color:dk }}>{formatCurrencyExact(Math.abs(v))}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#555555', padding:'9px 12px', marginTop:8 }}>
            <span style={{ fontWeight:700, fontSize:12, letterSpacing:'0.05em', color:'#fff' }}>Total</span>
            <span style={{ fontWeight:800, fontSize:14, color:'#fff' }}>{formatCurrencyExact(d.fin)}</span>
          </div>
        </div>
      </div>

      {/* ── Pay To + Signature + Seal ── */}
      <div style={{ borderTop:'1px solid #c8c8c8', paddingTop:16, display:'grid', gridTemplateColumns:'1fr auto', gap:0, fontSize:10.5 }}>

        {/* Pay To — left */}
        <div>
          <p style={{ ...p0, fontWeight:700, fontSize:12, marginBottom:10 }}>Pay To:</p>
          <div style={{ lineHeight:2.0 }}>
            <p style={{ ...p0, whiteSpace:'pre-line', wordBreak:'break-word' }}>Bank Name : {company?.bankName||'N/A'}</p>
            <p style={p0}>Bank Account No. : {company?.accountNumber||'N/A'}</p>
            <p style={p0}>Bank IFSC code : {company?.ifscCode||'N/A'}</p>
            <p style={p0}>Account holder's name : {company?.accountHolderName||company?.companyName||invoice.company}</p>
          </div>
        </div>

        {/* Signature + Seal — right */}
        <div style={{ minWidth:190, paddingLeft:20, display:'flex', flexDirection:'column' }}>
          {/* For: Company */}
          <p style={{ ...p0, fontSize:10.5, fontWeight:600, marginBottom:12 }}>
            For : {company?.companyName||invoice.company}
          </p>

          {/* Signature + Seal — ONLY when approved */}
          {invoice.approved ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                {/* Signature image */}
                {invoice.signatureImage && (
                  <img src={invoice.signatureImage} alt="Signature"
                    style={{ maxWidth:88, maxHeight:50, objectFit:'contain' }}/>
                )}
                {/* Circular Seal */}
                <div style={{
                  width:64, height:64, borderRadius:'50%',
                  border:'2px solid #1a1a2e',
                  display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  position:'relative', overflow:'hidden',
                  background:'#fff', flexShrink:0,
                }}>
                  <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:'1px solid #1a1a2e' }}/>
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt="Seal" referrerPolicy="no-referrer"
                      style={{ width:52, height:52, objectFit:'contain', borderRadius:'50%', position:'relative', zIndex:1 }}/>
                  ) : (
                    <>
                      <p style={{ ...p0, fontSize:16, fontWeight:900, color:'#1a1a2e', lineHeight:1, position:'relative', zIndex:1 }}>
                        {(company?.companyName||invoice.company).split(' ').map((w:string)=>w[0]?.toUpperCase()||'').slice(0,3).join('')}
                      </p>
                      <p style={{ ...p0, fontSize:5.5, fontWeight:700, color:'#1a1a2e', textAlign:'center', maxWidth:50, wordBreak:'break-word', lineHeight:1.3, position:'relative', zIndex:1, marginTop:2 }}>
                        {(company?.companyName||invoice.company).toUpperCase().slice(0,18)}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {invoice.approvedBy && (
                <p style={{ ...p0, fontSize:8, color:'#10b981', fontWeight:600, marginBottom:6 }}>
                  ✓ Approved by: {invoice.approvedBy}
                </p>
              )}
            </>
          ) : (
            /* Not approved — blank space */
            <div style={{ height:70 }}/>
          )}

          {/* Separator line + Authorized Signatory */}
          <div style={{ borderTop:'1px solid #999', paddingTop:5 }}>
            <p style={{ ...p0, fontSize:10.5, fontWeight:700 }}>Authorized Signatory</p>
          </div>
        </div>
      </div>

    </div>
  );
}
