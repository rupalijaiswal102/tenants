import jsPDF from 'jspdf';
import { type Invoice, type Tenant, type Company } from '../../src/types';

function numberToWords(num: number): string {
  const u = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (!num) return 'Zero';
  const c = (n: number): string => {
    if (n<20) return u[n];
    if (n<100) return t[Math.floor(n/10)]+(n%10?' '+u[n%10]:'');
    if (n<1000) return u[Math.floor(n/100)]+' Hundred'+(n%100?' and '+c(n%100):'');
    if (n<100000) return c(Math.floor(n/1000))+' Thousand'+(n%1000?' '+c(n%1000):'');
    if (n<10000000) return c(Math.floor(n/100000))+' Lakh'+(n%100000?' '+c(n%100000):'');
    return c(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+c(n%10000000):'');
  };
  return c(Math.floor(num));
}

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
  const fmt  = (d: Date) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  const lng  = (s: string) => new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const dot  = (p: string) => `${p}.${mm}.${yyyy}`;
  const base = invoice.baseRent||0, sgst=invoice.sgst||0, cgst=invoice.cgst||0;
  const raw  = base+sgst+cgst, fin=Math.round(raw), ro=Math.abs(fin-raw);
  const tax  = invoice.taxOption==='None'?0:9;
  const rows = (invoice as any).items?.length>0 ? (invoice as any).items
    : [{particular:'Rental Charges',hsnSac:'997212',month:mon,fromDate:from,toDate:to,amount:base}];
  const desc = invoice.remarks?.trim() || `Period - ${dot('01')} to ${dot(String(last))}`;
  return { bd, due, last, mm, yyyy, mon, from, to, fmt, lng, dot, base, sgst, cgst, fin, ro, tax, rows, desc };
}

export function generateInvoicePDF(invoice: Invoice, tenant?: Tenant, company?: Company) {
  const pdf = new jsPDF('p','mm','a4');
  const mg=15, cw=210-mg*2;
  let y=mg;
  const d = buildInvoiceData(invoice, tenant);

  const S = (sz: number, st: 'normal'|'bold'|'italic', r: number, g: number, b: number) => {
    pdf.setFont('helvetica',st); pdf.setFontSize(sz); pdf.setTextColor(r,g,b);
  };
  const L = (yy: number) => { pdf.setDrawColor(160,160,160); pdf.setLineWidth(0.4); pdf.line(mg,yy,mg+cw,yy); };

  // 1. Header
  S(13,'bold',26,26,26); pdf.text(company?.companyName||invoice.company,mg,y); y+=6;
  S(8.5,'normal',80,80,80);
  [company?.address||'',`Phone no. : ${company?.phoneNumber||'N/A'}`,`Email : ${company?.email||'N/A'}`,
   `GSTIN : ${company?.gstNumber||'N/A'}`,`State: ${company?.state||'Madhya Pradesh'}`]
    .filter(Boolean).forEach(l=>{ pdf.text(l,mg,y); y+=4.5; });
  y+=2;

  // 2. INVOICE title
  L(y); y+=8;
  S(22,'bold',130,130,130);
  const iw=pdf.getTextWidth('INVOICE');
  pdf.text('INVOICE',mg+(cw-iw)/2,y); y+=7;
  L(y); y+=10;

  // 3. Columns
  const c1=mg, c2=mg+cw*0.41, c3=mg+cw, sY=y;
  S(10,'bold',26,26,26); pdf.text('Bill To',c1,y); y+=5;
  S(9.5,'bold',26,26,26); pdf.text((tenant?.legalName||tenant?.name||invoice.partyName).slice(0,40),c1,y); y+=4.5;
  S(8.5,'normal',70,70,70);
  [
    ...(tenant?.billingAddress||'').split('\n').filter(Boolean),
    `GSTIN : ${tenant?.gstNo||'Unregistered'}`, 'State: 23-Madhya Pradesh',
    `Security Deposit : ${tenant?.securityDeposit?`${tenant.securityDeposit}/-`:'-'}`,
    ...(tenant?.leaseStart?[`Rent Start Date : ${d.lng(tenant.leaseStart)}`]:[]),
    ...(tenant?.leaseEnd?[`Agreement End Date: ${d.lng(tenant.leaseEnd)}`]:[]),
    ...(tenant?.nextEscalationDate?[`Rent Escalation : ${new Date(tenant.nextEscalationDate).toLocaleDateString('en-GB')}`]:[]),
  ].forEach(l=>{ pdf.text(l.length>42?l.slice(0,40)+'..':l,c1,y); y+=4; });

  let sy=sY;
  S(10,'bold',26,26,26); pdf.text('Ship To',c2,sy); sy+=5;
  S(9.5,'bold',26,26,26); pdf.text((tenant?.name||invoice.partyName).slice(0,30),c2,sy); sy+=4.5;
  S(8.5,'normal',70,70,70);
  pdf.splitTextToSize(tenant?.property||'',cw*0.30).forEach((l:string)=>{ pdf.text(l,c2,sy); sy+=4.2; });

  let iy=sY;
  S(10,'bold',26,26,26); pdf.text('Invoice Details',c3-pdf.getTextWidth('Invoice Details'),iy); iy+=5;
  S(8.5,'normal',70,70,70);
  [`Invoice No. : ${invoice.invoiceNo}`,`Date : ${d.fmt(d.bd)}`,`Due Date : ${d.fmt(d.due)}`]
    .forEach(l=>{ pdf.text(l,c3-pdf.getTextWidth(l),iy); iy+=4.8; });
  y=Math.max(y,sy,iy)+7;

  // 4. Table
  const COLS=[7,58,20,20,17,17,0]; COLS[6]=cw-COLS.slice(0,6).reduce((a,b)=>a+b,0);
  pdf.setFillColor(35,35,35); pdf.rect(mg,y,cw,7.5,'F');
  S(9,'bold',255,255,255);
  let cx=mg;
  ['#','Particular','HSN/ SAC','Month','From','To','Amount'].forEach((h,i)=>{
    pdf.text(h,i===6?cx+COLS[i]-pdf.getTextWidth(h)-2:cx+2.5,y+5.2); cx+=COLS[i];
  });
  y+=7.5;

  S(8.5,'normal',26,26,26);
  d.rows.forEach((r:any,i:number)=>{
    pdf.setDrawColor(210,210,210); pdf.setLineWidth(0.15); pdf.line(mg,y+7.5,mg+cw,y+7.5);
    cx=mg;
    [String(i+1),r.particular||'',r.hsnSac||'',r.month||'',
      r.fromDate?new Date(r.fromDate).toLocaleDateString('en-GB'):'-',
      r.toDate?new Date(r.toDate).toLocaleDateString('en-GB'):'-',
      `Rs ${(r.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`
    ].forEach((v,j)=>{
      if(j===1) pdf.setFont('helvetica','bold');
      pdf.text(v.length>24&&j===1?v.slice(0,22)+'..':v, j===6?cx+COLS[j]-pdf.getTextWidth(v)-2:cx+2.5, y+5); cx+=COLS[j];
      if(j===1) pdf.setFont('helvetica','normal');
    });
    y+=7.5;
  });

  pdf.setDrawColor(35,35,35); pdf.setLineWidth(0.8); pdf.line(mg,y,mg+cw,y); y+=2;
  S(9,'bold',26,26,26);
  const ts=`Rs ${d.base.toLocaleString('en-IN',{minimumFractionDigits:2})}`;
  pdf.text('Total',mg+cw-55,y+5.5); pdf.text(ts,mg+cw-pdf.getTextWidth(ts)-2,y+5.5);
  pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3); pdf.line(mg,y+8,mg+cw,y+8); y+=14;

  // 5. Description + GST
  const lX=mg, rX=mg+cw*0.54, rW=cw*0.46;
  let ly=y, ry=y;

  S(9,'bold',26,26,26); pdf.text('Description',lX,ly); ly+=5;
  S(8.5,'normal',70,70,70);
  pdf.splitTextToSize(d.desc,cw*0.51).forEach((l:string)=>{ pdf.text(l,lX,ly); ly+=4; });
  ly+=5;
  S(9,'bold',26,26,26); pdf.text('Invoice Amount In Words',lX,ly); ly+=5;
  S(8.5,'italic',70,70,70);
  pdf.splitTextToSize(`${numberToWords(d.fin)} Rupees Only`,cw*0.51).forEach((l:string)=>{ pdf.text(l,lX,ly); ly+=4; });
  ly+=5;
  S(9,'bold',26,26,26); pdf.text('Terms and Conditions',lX,ly); ly+=5;
  S(8.5,'normal',70,70,70);
  pdf.text('Please pay before due date.',lX,ly); ly+=4;
  pdf.text('Late payment penalty charges # 1.5% Per Month',lX,ly);

  [{l:'Sub Total',v:d.base},{l:`SGST@${d.tax}%`,v:d.sgst},{l:`CGST@${d.tax}%`,v:d.cgst},{l:'Round off',v:d.ro}]
    .forEach(({l,v})=>{
      const vs=`Rs ${Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2})}`;
      S(9,'normal',80,80,80); pdf.text(l,rX,ry+5);
      S(9,'bold',26,26,26); pdf.text(vs,rX+rW-pdf.getTextWidth(vs)-1,ry+5);
      pdf.setDrawColor(210,210,210); pdf.setLineWidth(0.15); pdf.line(rX,ry+7,rX+rW,ry+7);
      ry+=7;
    });
  ry+=2;
  pdf.setFillColor(35,35,35); pdf.rect(rX,ry,rW,10,'F');
  S(10,'bold',255,255,255); pdf.text('Total',rX+3,ry+6.8);
  const fs=`Rs ${d.fin.toLocaleString('en-IN',{minimumFractionDigits:2})}`;
  S(11,'bold',255,255,255); pdf.text(fs,rX+rW-pdf.getTextWidth(fs)-2,ry+6.8);

  y=Math.max(ly,ry+10)+12;

  // 6. Pay To + Signature (side by side, NO separator line)
  // Draw only a thin top border
  pdf.setDrawColor(190,190,190); pdf.setLineWidth(0.4); pdf.line(mg,y,mg+cw,y); y+=9;

  const payX = mg;
  const sigX = mg + cw*0.62; // ← right side (62% from left)
  let payY = y;
  let sigY = y;

  // Pay To — left column
  S(10.5,'bold',26,26,26); pdf.text('Pay To:', payX, payY); payY+=6;
  S(8.5,'normal',26,26,26);
  [
    `Bank Name : ${company?.bankName||'N/A'}`,
    `Bank Account No. : ${company?.accountNumber||'N/A'}`,
    `Bank IFSC code : ${company?.ifscCode||'N/A'}`,
    `Account holder's name : ${company?.accountHolderName||company?.companyName||invoice.company}`,
  ].forEach(l=>{ pdf.text(l, payX, payY); payY+=5; });

  // Signature — right column (starts at same Y as Pay To)
  S(9,'normal',26,26,26);
  pdf.text(`For :${company?.companyName||invoice.company}`, sigX, sigY); sigY+=18;
  pdf.setDrawColor(140,140,140); pdf.setLineWidth(0.5); pdf.circle(sigX+14, sigY, 11);
  S(7.5,'normal',140,140,140); pdf.text('SEAL', sigX+10, sigY+1.5);
  sigY+=17;
  pdf.setDrawColor(140,140,140); pdf.setLineWidth(0.4);
  pdf.line(sigX, sigY, sigX+54, sigY); sigY+=5;
  S(9,'bold',26,26,26); pdf.text('Authorized Signatory', sigX, sigY);

  pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
}
