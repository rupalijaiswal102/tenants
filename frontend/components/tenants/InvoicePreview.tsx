import React from 'react';
import { formatCurrencyExact } from '../../src/utils/formatCurrency';
import { type Invoice, type Tenant, type Company } from '../../src/types';
import { buildInvoiceData } from './invoicePdf';

function numberToWords(n: number): string {
  const u=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!n) return 'Zero';
  const c=(x:number):string=>{
    if(x<20)return u[x];
    if(x<100)return t[Math.floor(x/10)]+(x%10?' '+u[x%10]:'');
    if(x<1000)return u[Math.floor(x/100)]+' Hundred'+(x%100?' and '+c(x%100):'');
    if(x<100000)return c(Math.floor(x/1000))+' Thousand'+(x%1000?' '+c(x%1000):'');
    if(x<10000000)return c(Math.floor(x/100000))+' Lakh'+(x%100000?' '+c(x%100000):'');
    return c(Math.floor(x/10000000))+' Crore'+(x%10000000?' '+c(x%10000000):'');
  };
  return c(Math.floor(n));
}

// Local date helpers (replaces d.lng which no longer exists)
const fmtDot  = (s:string) => { try { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; } catch { return s; } };
const fmtLong = (s:string) => { try { return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); } catch { return s; } };

interface Props { invoice: Invoice; tenant?: Tenant; company?: Company; }

export function InvoicePreview({ invoice, tenant, company }: Props) {
  const d   = buildInvoiceData(invoice, tenant);
  const inv = invoice as any;
  const p0: React.CSSProperties = { margin: 0 };
  const gr  = '#555', dk = '#1a1a1a';

  const Cell = ({ children, right=false, bold=false }: any) => (
    <td style={{ padding:'9px 9px', fontSize:10.5, textAlign:right?'right':'left', fontWeight:bold?700:'normal' }}>
      {children}
    </td>
  );

  return (
    <div style={{ background:'#fff', width:'100%', maxWidth:800, padding:'44px 56px 52px', fontFamily:'Arial,sans-serif', color:dk, fontSize:11, lineHeight:1.6 }}>

      {/* Company Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <p style={{ ...p0, fontSize:15, fontWeight:700, marginBottom:7 }}>{company?.companyName||invoice.company}</p>
          <div style={{ fontSize:10.5, color:gr, lineHeight:1.9 }}>
            {company?.address && <p style={p0}>{company.address}</p>}
            <p style={p0}>Phone no. : {company?.phoneNumber||'N/A'}</p>
            <p style={p0}>Email : {company?.email||'N/A'}</p>
            <p style={p0}>GSTIN : {company?.gstNumber||'N/A'}</p>
            <p style={p0}>State: {company?.state||'Madhya Pradesh'}</p>
          </div>
        </div>
        {company?.logoUrl && (
          <img src={company.logoUrl} alt="Logo" referrerPolicy="no-referrer"
            style={{ width:72, height:72, objectFit:'contain' }}/>
        )}
      </div>

      {/* INVOICE Title */}
      <div style={{ borderTop:'1.5px solid #c8c8c8', textAlign:'center', padding:'10px 0 9px', margin:'0 0 22px' }}>
        <span style={{ fontSize:25, fontWeight:700, letterSpacing:'0.38em', color:'#8a8a8a' }}>INVOICE</span>
      </div>

      {/* Bill To / Ship To / Invoice Details */}
      <div style={{ display:'grid', gridTemplateColumns:'1.35fr 1fr 0.85fr', gap:16, marginBottom:22, fontSize:10.5 }}>
        {/* Bill To */}
        <div>
          <p style={{ ...p0, fontWeight:700, fontSize:11, marginBottom:5 }}>Bill To</p>
          <p style={{ ...p0, fontWeight:700, marginBottom:4 }}>{tenant?.legalName||tenant?.name||invoice.partyName}</p>
          <div style={{ color:gr, lineHeight:1.9 }}>
            {tenant?.billingAddress && <p style={{ ...p0, whiteSpace:'pre-line' }}>{tenant.billingAddress}</p>}
            {tenant?.gstNo && tenant.gstNo !== 'Unregistered' && <p style={p0}>GSTIN : {tenant.gstNo}</p>}
            <p style={p0}>State: 23-Madhya Pradesh</p>
            {tenant?.securityDeposit && Number(tenant.securityDeposit) > 0 && (
              <p style={p0}>Security Deposit : {Number(tenant.securityDeposit).toLocaleString('en-IN')}</p>
            )}
            {tenant?.leaseStart && <p style={p0}>Agreement Start: {fmtDot(tenant.leaseStart)}</p>}
            {tenant?.leaseEnd   && <p style={p0}>Agreement End : {fmtDot(tenant.leaseEnd)}</p>}
            {tenant?.nextEscalationDate && <p style={p0}>Rent Escalation : {fmtLong(tenant.nextEscalationDate)}</p>}
          </div>
        </div>

        {/* Ship To */}
        <div>
          <p style={{ ...p0, fontWeight:700, fontSize:11, marginBottom:5 }}>Ship To</p>
          <p style={{ ...p0, color:gr, whiteSpace:'pre-line', lineHeight:1.9 }}>{tenant?.property||''}</p>
        </div>

        {/* Invoice Details */}
        <div style={{ textAlign:'right' }}>
          <p style={{ ...p0, fontWeight:700, fontSize:11, marginBottom:5 }}>Invoice Details</p>
          <div style={{ color:gr, lineHeight:2.1 }}>
            <p style={p0}>Invoice No. : {invoice.invoiceNo}</p>
            <p style={p0}>Date : {d.fmt(d.bd)}</p>
            <p style={p0}>Due Date : {d.fmt(d.due)}</p>
            {(inv.crmName||inv.crmPhone||inv.crmEmail) && (
              <div style={{ marginTop:6 }}>
                {inv.crmName  && <p style={p0}>CRM : {inv.crmName}</p>}
                {inv.crmPhone && <p style={p0}>Phone : {inv.crmPhone}</p>}
                {inv.crmEmail && <p style={p0}>Email : {inv.crmEmail}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
        <thead>
          <tr>
            {['#','Item name','HSN/ SAC','Month','From','To','Amount'].map((h,i) => (
              <th key={h} style={{ padding:'9px 9px', fontSize:10.5, fontWeight:700, color:'#fff', backgroundColor:'#555555', textAlign:i===6?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.rows.map((item:any, i:number) => (
            <tr key={i} style={{ borderBottom:'1px solid #e0e0e0' }}>
              <Cell>{i+1}</Cell>
              <Cell bold>{item.particular}</Cell>
              <Cell>{item.hsnSac}</Cell>
              <Cell>{item.month}</Cell>
              <Cell>{item.fromDate?new Date(item.fromDate).toLocaleDateString('en-GB'):'-'}</Cell>
              <Cell>{item.toDate?new Date(item.toDate).toLocaleDateString('en-GB'):'-'}</Cell>
              <Cell right>Rs {(item.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</Cell>
            </tr>
          ))}
          {/* Total Row */}
          <tr style={{ borderTop:'1.5px solid #aaaaaa', borderBottom:'1.5px solid #d0d0d0' }}>
            <td style={{ padding:'9px 9px' }}/>
            <td style={{ padding:'9px 9px', fontWeight:800, fontSize:12 }}>Total</td>
            <td colSpan={4} style={{ padding:'9px 9px' }}/>
            <td style={{ padding:'9px 9px', fontWeight:700, fontSize:13, textAlign:'right' }}>
              Rs {d.base.toLocaleString('en-IN',{minimumFractionDigits:2})}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Description + GST */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:26, marginBottom:24 }}>
        <div style={{ fontSize:10.5 }}>
          {[
            { label:'Description',            text:d.desc,                                    italic:false },
            { label:'Invoice Amount In Words', text:`${numberToWords(d.fin)} Rupees Only`,     italic:true  },
            { label:'Terms and Conditions',    text:'Please pay before due date.\nLate payment penalty charges # 1.5% Per Month', italic:false },
          ].map(({label,text,italic}) => (
            <div key={label} style={{ marginBottom:12 }}>
              <p style={{ ...p0, fontWeight:700, marginBottom:4 }}>{label}</p>
              <p style={{ ...p0, color:gr, fontStyle:italic?'italic':'normal', whiteSpace:'pre-line', lineHeight:1.9 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ fontSize:11 }}>
          {[
            {l:'Sub Total',      v:d.base, always:true },
            {l:`CGST@${d.tax}%`, v:d.cgst, always:false},
            {l:`SGST@${d.tax}%`, v:d.sgst, always:false},
            {l:'Round off',      v:d.ro,   always:true },
          ].filter(row=>row.always||row.v>0).map(({l,v},i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #e8e8e8' }}>
              <span style={{ color:gr }}>{l}</span>
              <span style={{ fontWeight:600, color:dk }}>Rs {Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#555555', padding:'10px 13px', marginTop:8 }}>
            <span style={{ fontWeight:700, fontSize:12, letterSpacing:'0.06em', color:'#fff' }}>Total</span>
            <span style={{ fontWeight:800, fontSize:15, color:'#fff' }}>Rs {d.fin.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
          </div>
        </div>
      </div>

      {/* Pay To + Signature */}
      <div style={{ borderTop:'1px solid #c8c8c8', paddingTop:18, display:'grid', gridTemplateColumns:'1fr auto', gap:20, fontSize:10.5 }}>
        <div>
          <p style={{ ...p0, fontWeight:700, fontSize:12, marginBottom:10 }}>Pay To:</p>
          <div style={{ lineHeight:2.1 }}>
            <p style={{ ...p0, whiteSpace:'pre-line', wordBreak:'break-word' }}>Bank Name : {company?.bankName||'N/A'}</p>
            <p style={p0}>Bank Account No. : {company?.accountNumber||'N/A'}</p>
            <p style={p0}>Bank IFSC code : {company?.ifscCode||'N/A'}</p>
            <p style={p0}>Account holder's name : {company?.accountHolderName||company?.companyName||invoice.company}</p>
          </div>
        </div>

        <div style={{ minWidth:190, paddingLeft:20, display:'flex', flexDirection:'column' }}>
          <p style={{ ...p0, fontSize:10.5, fontWeight:600, marginBottom:12 }}>
            For : {company?.companyName||invoice.company}
          </p>
          {inv.approved ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                {inv.signatureImage && (
                  <img src={inv.signatureImage} alt="Signature"
                    style={{ maxWidth:88, maxHeight:50, objectFit:'contain' }}/>
                )}
                {(company?.sealUrl||company?.logoUrl) && (
                  <div style={{ width:64, height:64, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img src={company?.sealUrl||company?.logoUrl} alt="Seal"
                      referrerPolicy="no-referrer"
                      style={{ width:64, height:64, objectFit:'contain' }}/>
                  </div>
                )}
              </div>
              {inv.approvedBy && (
                <p style={{ ...p0, fontSize:8, color:'#10b981', fontWeight:600, marginBottom:6 }}>
                  ✓ Approved by: {inv.approvedBy}
                </p>
              )}
            </>
          ) : (
            <div style={{ height:60 }}/>
          )}
          <div style={{ borderTop:'1px solid #999', paddingTop:5 }}>
            <p style={{ ...p0, fontSize:10.5, fontWeight:700 }}>Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop:18, borderTop:'1px solid #eee', paddingTop:6, display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:9, color:'#aaa' }}>This is a computer generated invoice.</span>
        <span style={{ fontSize:9, color:'#aaa' }}>Invoice No: {invoice.invoiceNo}</span>
      </div>

    </div>
  );
}
