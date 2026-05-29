import jsPDF from 'jspdf';
import { type Invoice, type Tenant, type Company } from '../../src/types';

function numberToWords(num: number): string {
  const u=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!num) return 'Zero';
  const c=(n:number):string=>{
    if(n<20) return u[n];
    if(n<100) return t[Math.floor(n/10)]+(n%10?' '+u[n%10]:'');
    if(n<1000) return u[Math.floor(n/100)]+' Hundred'+(n%100?' and '+c(n%100):'');
    if(n<100000) return c(Math.floor(n/1000))+' Thousand'+(n%1000?' '+c(n%1000):'');
    if(n<10000000) return c(Math.floor(n/100000))+' Lakh'+(n%100000?' '+c(n%100000):'');
    return c(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+c(n%10000000):'');
  };
  return c(Math.floor(num));
}

const fmtAmt = (v: number) =>
  `Rs ${Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function buildInvoiceData(invoice: Invoice, tenant?: Tenant) {
  const bd   = new Date(invoice.billDate);
  const due  = new Date(bd); due.setDate(due.getDate()+7);
  const MN   = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const last = new Date(bd.getFullYear(), bd.getMonth()+1, 0).getDate();
  const mm   = String(bd.getMonth()+1).padStart(2,'0');
  const yyyy = bd.getFullYear();
  const mon  = `${MN[bd.getMonth()]}'${yyyy}`;
  const from = `01/${mm}/${yyyy}`;
  const to   = `${last}/${mm}/${yyyy}`;
  const fmt  = (d:Date) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  const lng  = (s:string) => new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const dot  = (p:string) => `${p}.${mm}.${yyyy}`;
  const base = invoice.baseRent||0, sgst=invoice.sgst||0, cgst=invoice.cgst||0;
  const raw  = base+sgst+cgst, fin=Math.round(raw), ro=Math.abs(fin-raw);
  const tax  = invoice.taxOption==='None'?0:9;
  const rows = (invoice as any).items?.length>0
    ? (invoice as any).items
    : [{particular:'Rental Charges',hsnSac:'997212',month:mon,fromDate:from,toDate:to,amount:base}];
  const desc = invoice.remarks?.trim() || `Period - ${dot('01')} to ${dot(String(last))}`;
  return { bd, due, last, mm, yyyy, mon, from, to, fmt, lng, dot, base, sgst, cgst, fin, ro, tax, rows, desc };
}

export function generateInvoicePDF(invoice: Invoice, tenant?: Tenant, company?: Company) {
  const pdf = new jsPDF('p','mm','a4');
  const mg=15, cw=210-mg*2;
  let y = mg;
  const d = buildInvoiceData(invoice, tenant);

  const S = (sz:number, st:'normal'|'bold'|'italic', r:number, g:number, b:number) => {
    pdf.setFont('helvetica',st); pdf.setFontSize(sz); pdf.setTextColor(r,g,b);
  };

  // ── 1. Company Header ─────────────────────────────────────────────────────
  const compName = company?.companyName||invoice.company;
  S(13,'bold',26,26,26);
  const nameLines = pdf.splitTextToSize(compName, cw*0.75);
  nameLines.forEach((l:string) => { pdf.text(l, mg, y); y+=5.5; });
  S(8.5,'normal',74,74,74);
  [
    company?.address||'',
    `Phone no. : ${company?.phoneNumber||'N/A'}`,
    `Email : ${company?.email||'N/A'}`,
    `GSTIN : ${company?.gstNumber||'N/A'}`,
    `State: ${company?.state||'Madhya Pradesh'}`,
  ].filter(Boolean).forEach(l=>{
    const lines = pdf.splitTextToSize(l, cw*0.72);
    lines.forEach((ll:string)=>{ pdf.text(ll, mg, y); y+=4.2; });
  });
  y+=3;

  // ── 2. INVOICE Title — top line only ─────────────────────────────────────
  pdf.setDrawColor(160,160,160); pdf.setLineWidth(0.4); pdf.line(mg,y,mg+cw,y); y+=8;
  S(20,'bold',130,130,130);
  const iw = pdf.getTextWidth('INVOICE');
  pdf.text('INVOICE', mg+(cw-iw)/2, y); y+=11;

  // ── 3. Bill To / Ship To / Invoice Details ────────────────────────────────
  // Column widths: 40% | 33% | 27%
  const c1=mg, c2=mg+cw*0.42, c3=mg+cw;
  const w1=cw*0.38, w2=cw*0.28;
  const sY = y;

  // Bill To
  S(11,'bold',26,26,26); pdf.text('Bill To', c1, y); y+=5.5;
  S(9.5,'bold',26,26,26);
  pdf.splitTextToSize(tenant?.legalName||tenant?.name||invoice.partyName, w1)
    .forEach((l:string)=>{ pdf.text(l, c1, y); y+=4.5; });
  S(8.5,'normal',70,70,70);
  [
    ...(tenant?.billingAddress||'').split('\n').filter(Boolean),
    ...(tenant?.gstNo && tenant.gstNo !== 'Unregistered' ? [`GSTIN : ${tenant.gstNo}`] : []),
    'State: 23-Madhya Pradesh',
    ...(tenant?.securityDeposit && Number(tenant.securityDeposit) > 0 ? [`Security Deposit : ${tenant.securityDeposit}/-`] : []),
    ...(tenant?.leaseStart?[`Rent Start Date : ${d.lng(tenant.leaseStart)}`]:[]),
    ...(tenant?.leaseEnd?[`Agreement End Date: ${d.lng(tenant.leaseEnd)}`]:[]),
    ...(tenant?.nextEscalationDate?[`Rent Escalation : ${new Date(tenant.nextEscalationDate).toLocaleDateString('en-GB')}`]:[]),
  ].forEach(l=>{
    pdf.splitTextToSize(l, w1).forEach((ll:string)=>{ pdf.text(ll, c1, y); y+=4; });
  });

  // Ship To — only property, no tenant name
  let sy = sY;
  S(11,'bold',26,26,26); pdf.text('Ship To', c2, sy); sy+=5.5;
  S(8.5,'normal',70,70,70);
  pdf.splitTextToSize(tenant?.property||'', w2)
    .forEach((l:string)=>{ pdf.text(l, c2, sy); sy+=4.2; });

  // Invoice Details — right aligned
  let iy = sY;
  S(11,'bold',26,26,26);
  pdf.text('Invoice Details', c3-pdf.getTextWidth('Invoice Details'), iy); iy+=5.5;
  S(8.5,'normal',70,70,70);
  [`Invoice No. : ${invoice.invoiceNo}`, `Date : ${d.fmt(d.bd)}`, `Due Date : ${d.fmt(d.due)}`]
    .forEach(l=>{ pdf.text(l, c3-pdf.getTextWidth(l), iy); iy+=4.8; });
  // CRM Contact — no line, simple format
  const inv = invoice as any;
  if (inv.crmName || inv.crmPhone || inv.crmEmail) {
    S(8.5,'normal',70,70,70);
    iy+=2; // small gap only
    if (inv.crmName)  { const t=`CRM : ${inv.crmName}`;    pdf.text(t, c3-pdf.getTextWidth(t), iy); iy+=4.5; }
    if (inv.crmPhone) { const t=`Phone : ${inv.crmPhone}`; pdf.text(t, c3-pdf.getTextWidth(t), iy); iy+=4.5; }
    if (inv.crmEmail) {
      const emailLines = pdf.splitTextToSize(`Email : ${inv.crmEmail}`, cw*0.28);
      emailLines.forEach((l:string) => { pdf.text(l, c3-pdf.getTextWidth(l), iy); iy+=4; });
    }
  }

  y = Math.max(y, sy, iy) + 7;

  // ── 4. Items Table ────────────────────────────────────────────────────────
  // Column widths in mm: #(7) Particular(57) HSN(20) Month(20) From(17) To(17) Amount(rest)
  const COLS=[7,57,20,20,17,17,0]; COLS[6]=cw-COLS.slice(0,6).reduce((a,b)=>a+b,0);
  const RH=7.5;

  pdf.setFillColor(35,35,35); pdf.rect(mg, y, cw, RH, 'F');
  S(9,'bold',255,255,255);
  let cx=mg;
  ['#','Particular','HSN/ SAC','Month','From','To','Amount'].forEach((h,i)=>{
    pdf.text(h, i===6 ? cx+COLS[i]-pdf.getTextWidth(h)-2 : cx+2.5, y+5.2);
    cx+=COLS[i];
  });
  y+=RH;

  S(8.5,'normal',26,26,26);
  d.rows.forEach((r:any, i:number)=>{
    pdf.setDrawColor(210,210,210); pdf.setLineWidth(0.15); pdf.line(mg, y+RH, mg+cw, y+RH);
    cx=mg;
    [String(i+1), r.particular||'', r.hsnSac||'', r.month||'',
      r.fromDate ? new Date(r.fromDate).toLocaleDateString('en-GB') : '-',
      r.toDate   ? new Date(r.toDate).toLocaleDateString('en-GB')   : '-',
      fmtAmt(r.amount||0)
    ].forEach((v,j)=>{
      if(j===1) pdf.setFont('helvetica','bold');
      const disp = v.length>26&&j===1 ? v.slice(0,24)+'..' : v;
      pdf.text(disp, j===6 ? cx+COLS[j]-pdf.getTextWidth(disp)-2 : cx+2.5, y+5);
      if(j===1) pdf.setFont('helvetica','normal');
      cx+=COLS[j];
    });
    y+=RH;
  });

  // Total row — "Total" under Particular column, amount right-aligned
  pdf.setDrawColor(35,35,35); pdf.setLineWidth(0.8); pdf.line(mg, y, mg+cw, y); y+=2;
  S(9,'bold',26,26,26);
  const totStr = fmtAmt(d.base);
  // "Total" text under Particular column (col 1 = after # col)
  const particularColX = mg + COLS[0] + 2.5;   // under Particular column
  pdf.text('Total', particularColX, y+5.5);
  // Amount right-aligned in last column
  pdf.text(totStr, mg+cw-pdf.getTextWidth(totStr)-2, y+5.5);
  y+=14;

  // ── 5. Description + GST ─────────────────────────────────────────────────
  const lX=mg, rX=mg+cw*0.54, rW=cw*0.46;
  let ly=y, ry=y;

  S(9,'bold',26,26,26); pdf.text('Description', lX, ly); ly+=5;
  S(8.5,'normal',70,70,70);
  pdf.splitTextToSize(d.desc, cw*0.51).forEach((l:string)=>{ pdf.text(l, lX, ly); ly+=4; });
  ly+=5;

  S(9,'bold',26,26,26); pdf.text('Invoice Amount In Words', lX, ly); ly+=5;
  S(8.5,'italic',70,70,70);
  pdf.splitTextToSize(`${numberToWords(d.fin)} Rupees Only`, cw*0.51)
    .forEach((l:string)=>{ pdf.text(l, lX, ly); ly+=4; });
  ly+=5;

  S(9,'bold',26,26,26); pdf.text('Terms and Conditions', lX, ly); ly+=5;
  S(8.5,'normal',70,70,70);
  pdf.text('Please pay before due date.', lX, ly); ly+=4;
  pdf.text('Late payment penalty charges # 1.5% Per Month', lX, ly);

  // GST rows — no border lines
  [{l:'Sub Total',v:d.base,always:true},{l:`CGST@${d.tax}%`,v:d.cgst,always:false},{l:`SGST@${d.tax}%`,v:d.sgst,always:false},{l:'Round off',v:d.ro,always:true}]
    .filter(row => row.always || row.v > 0)  // hide 0 GST rows in PDF
    .forEach(({l,v})=>{
      const vs = fmtAmt(v);
      S(9,'normal',80,80,80); pdf.text(l, rX, ry+5);
      S(9,'bold',26,26,26);   pdf.text(vs, rX+rW-pdf.getTextWidth(vs)-1, ry+5);
      ry+=7;
    });
  ry+=2;

  pdf.setFillColor(35,35,35); pdf.rect(rX, ry, rW, 10, 'F');
  S(10,'bold',255,255,255); pdf.text('Total', rX+3, ry+6.8);
  const fs = fmtAmt(d.fin);
  S(11,'bold',255,255,255); pdf.text(fs, rX+rW-pdf.getTextWidth(fs)-2, ry+6.8);

  y = Math.max(ly, ry+10) + 12;

  // ── 6. Pay To + Signature + Seal (matches Preview exactly) ─────────────────
  
  const payX = mg;
  const sigX = mg + cw * 0.62;
  let payY   = y;
  let sigY   = y;

  // Pay To — left column
  S(10.5,'bold',26,26,26); pdf.text('Pay To:', payX, payY); payY+=6;
  S(8.5,'normal',26,26,26);
  [
    { label: `Bank Name : ${company?.bankName||'N/A'}`, multiline: true  },
    { label: `Bank Account No. : ${company?.accountNumber||'N/A'}`, multiline: false },
    { label: `Bank IFSC code : ${company?.ifscCode||'N/A'}`,        multiline: false },
    { label: `Account holder's name : ${company?.accountHolderName||company?.companyName||invoice.company}`, multiline: false },
  ].forEach(item => {
    if (item.multiline) {
      pdf.splitTextToSize(item.label, cw * 0.55)
        .forEach((l:string) => { pdf.text(l, payX, payY); payY+=4.5; });
    } else {
      pdf.text(item.label, payX, payY); payY+=5;
    }
  });

  // ── For: Company Name ──────────────────────────────────────────────────────
  S(9,'normal',26,26,26);
  pdf.text(`For : ${company?.companyName||invoice.company}`, sigX, sigY); sigY+=8;

  // ── Signature box (left) + Circular Seal (right) ─────────────────────────
  const signBoxX = sigX;
  const signBoxW = 28, signBoxH = 18;
  const sealCX   = sigX + signBoxW + 8 + 12;  // seal center X
  const sealCY   = sigY + 12;                   // seal center Y
  const sealR    = 12;                           // seal radius mm

  // Signature box border
  pdf.setDrawColor(220,220,220); pdf.setLineWidth(0.3);
  pdf.rect(signBoxX, sigY, signBoxW, signBoxH);

  // Draw digital signature inside box if approved
  if ((invoice as any).approved && (invoice as any).signatureImage) {
    try {
      pdf.addImage(
        (invoice as any).signatureImage, 'PNG',
        signBoxX+1, sigY+1, signBoxW-2, signBoxH-2
      );
    } catch {}
  }

  // ── Circular company seal ─────────────────────────────────────────────────
  pdf.setDrawColor(26,26,26); pdf.setLineWidth(0.7);
  pdf.circle(sealCX, sealCY, sealR);           // outer circle
  pdf.setLineWidth(0.3);
  pdf.circle(sealCX, sealCY, sealR - 2);       // inner ring

  if (company?.logoUrl) {
    try {
      pdf.addImage(
        company.logoUrl, 'PNG',
        sealCX - (sealR-3), sealCY - (sealR-3),
        (sealR-3)*2, (sealR-3)*2
      );
    } catch {}
  } else {
    // Company initials
    const initials = (company?.companyName||invoice.company)
      .split(' ').map((w:string) => w[0]?.toUpperCase()||'').slice(0,3).join('');
    S(9,'bold',26,26,26);
    pdf.text(initials, sealCX - pdf.getTextWidth(initials)/2, sealCY+1);
    S(4.5,'bold',26,26,26);
    const shortName = (company?.companyName||invoice.company).toUpperCase().slice(0,16);
    pdf.text(shortName, sealCX - pdf.getTextWidth(shortName)/2, sealCY+6);
  }

  sigY += signBoxH + 5;

  // Approved by (small text, green)
  

  // Line + Authorized Signatory
 
  S(9,'bold',26,26,26); pdf.text('Authorized Signatory', sigX, sigY);

  pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
}
