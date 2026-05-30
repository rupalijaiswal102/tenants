import jsPDF from 'jspdf';
import { type Invoice, type Tenant, type Company } from '../../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function numberToWords(num: number): string {
  const u=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!num) return 'Zero';
  const c=(n:number):string=>{
    if(n<20)return u[n];
    if(n<100)return t[Math.floor(n/10)]+(n%10?' '+u[n%10]:'');
    if(n<1000)return u[Math.floor(n/100)]+' Hundred'+(n%100?' and '+c(n%100):'');
    if(n<100000)return c(Math.floor(n/1000))+' Thousand'+(n%1000?' '+c(n%1000):'');
    if(n<10000000)return c(Math.floor(n/100000))+' Lakh'+(n%100000?' '+c(n%100000):'');
    return c(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+c(n%10000000):'');
  };
  return c(Math.floor(num));
}

const fmtAmt = (v:number) =>
  `Rs ${Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const fmtDate = (s:string) => {
  try { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
  catch { return s; }
};
const fmtLong = (s:string) => {
  try { return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); }
  catch { return s; }
};
const fmtDot = (s:string) => {
  try { const d=new Date(s); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; }
  catch { return s; }
};

export function buildInvoiceData(invoice:Invoice, tenant?:Tenant) {
  const bd   = new Date(invoice.billDate);
  const due  = new Date(bd); due.setDate(due.getDate()+7);
  const MN   = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const last = new Date(bd.getFullYear(), bd.getMonth()+1, 0).getDate();
  const mm   = String(bd.getMonth()+1).padStart(2,'0');
  const yyyy = bd.getFullYear();
  const mon  = `${MN[bd.getMonth()]}'${yyyy}`;
  const fmt  = (d:Date) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  const lng  = fmtLong;
  const base = invoice.baseRent||0, sgst=invoice.sgst||0, cgst=invoice.cgst||0;
  const raw  = base+sgst+cgst, fin=Math.round(raw), ro=Math.abs(fin-raw);
  const tax  = invoice.taxOption==='None'?0:9;
  const rows = (invoice as any).items?.length>0
    ? (invoice as any).items
    : [{particular:'Rental Charges',hsnSac:'997212',month:mon,fromDate:`01/${mm}/${yyyy}`,toDate:`${last}/${mm}/${yyyy}`,amount:base}];
  const desc = invoice.remarks?.trim() || `Period - ${fmtDot(invoice.billDate||'')} to ${fmtDot(new Date(bd.getFullYear(),bd.getMonth(),last).toISOString())}`;
  return { bd, due, last, mm, yyyy, mon, fmt, lng, base, sgst, cgst, fin, ro, tax, rows, desc };
}

// ── Main PDF Generator ────────────────────────────────────────────────────────
export function generateInvoicePDF(invoice:Invoice, tenant?:Tenant, company?:Company) {
  const pdf  = new jsPDF('p','mm','a4');
  const pw   = 210, ph = 297;
  const mg   = 16, cw = pw - mg*2;
  const d    = buildInvoiceData(invoice, tenant);
  const inv  = invoice as any;
  let y      = mg;

  const S = (sz:number, bold:boolean, r:number, g:number, b:number) => {
    pdf.setFont('helvetica', bold?'bold':'normal');
    pdf.setFontSize(sz); pdf.setTextColor(r,g,b);
  };
  const R = (x:number, yy:number, w:number, h:number, r:number, g:number, b:number) => {
    pdf.setFillColor(r,g,b); pdf.rect(x,yy,w,h,'F');
  };
  const HR = (yy:number, thick=0.3, color=180) => {
    pdf.setDrawColor(color,color,color); pdf.setLineWidth(thick);
    pdf.line(mg,yy,mg+cw,yy);
  };

  // ── 1. COMPANY HEADER ────────────────────────────────────────────────────
  const coName = company?.companyName||invoice.company||'';
  S(14,true,26,26,26);
  const nameLines = pdf.splitTextToSize(coName, cw*0.70);
  nameLines.forEach((l:string)=>{ pdf.text(l,mg,y); y+=5.5; });
  S(8.5,false,70,70,70);
  const addrLines = pdf.splitTextToSize(company?.address||'', cw*0.70);
  addrLines.forEach((l:string)=>{ pdf.text(l,mg,y); y+=4.2; });
  [`Phone no. : ${company?.phoneNumber||'N/A'}`,
   `Email : ${company?.email||'N/A'}`,
   `GSTIN : ${company?.gstNumber||'N/A'}`,
   `State: ${company?.state||'Madhya Pradesh'}`
  ].forEach(l=>{ pdf.text(l,mg,y); y+=4.2; });

  // Company logo — top right
  if (company?.logoUrl) {
    try {
      pdf.addImage(company.logoUrl,'PNG', mg+cw-34, mg, 34, 22);
    } catch {}
  }
  y = Math.max(y, mg+26) + 8;

  // ── 2. INVOICE TITLE — top & bottom border ────────────────────────────────
  HR(y, 0.5, 160); y+=9;
  S(18,true,60,60,60);
  const iw = pdf.getTextWidth('INVOICE');
  pdf.text('INVOICE', mg+(cw-iw)/2, y); y+=12;  // no bottom line

  // ── 3. BILL TO / SHIP TO / INVOICE DETAILS ────────────────────────────────
  const c1=mg, c2=mg+cw*0.42, c3=mg+cw;
  const w1=cw*0.38, w2=cw*0.28;
  const sY=y;

  // Bill To
  S(10,true,26,26,26); pdf.text('Bill To',c1,y); y+=5.5;
  S(10,true,26,26,26);
  const tenantName = tenant?.legalName||tenant?.name||invoice.partyName||'';
  pdf.splitTextToSize(tenantName,w1).forEach((l:string)=>{ pdf.text(l,c1,y); y+=4.5; });
  S(8.5,false,60,60,60);
  [
    ...(tenant?.billingAddress||'').split('\n').filter(Boolean),
    ...(tenant?.gstNo && tenant.gstNo!=='Unregistered'?[`GSTIN : ${tenant.gstNo}`]:[]),
    'State: 23-Madhya Pradesh',
    ...(tenant?.securityDeposit && Number(tenant.securityDeposit)>0
      ? [`Security Deposit : ${Number(tenant.securityDeposit).toLocaleString('en-IN')}`]:[]),
    ...(tenant?.leaseStart  ? [`Agreement Start: ${fmtDot(tenant.leaseStart)}`]:[]),
    ...(tenant?.leaseEnd    ? [`Agreement End : ${fmtDot(tenant.leaseEnd)}`]:[]),
    ...(tenant?.nextEscalationDate
      ? [`Rent Escalation : ${fmtDate(tenant.nextEscalationDate)}`]:[]),
  ].forEach(l=>{
    const wrapped = pdf.splitTextToSize(l,w1);
    wrapped.forEach((wl:string)=>{ pdf.text(wl,c1,y); y+=4; });
  });

  // Ship To
  let sy=sY;
  S(10,true,26,26,26); pdf.text('Ship To',c2,sy); sy+=5.5;
  S(8.5,false,60,60,60);
  pdf.splitTextToSize(tenant?.property||'',w2)
    .forEach((l:string)=>{ pdf.text(l,c2,sy); sy+=4.2; });

  // Invoice Details — right aligned
  let iy=sY;
  S(10,true,26,26,26);
  pdf.text('Invoice Details',c3-pdf.getTextWidth('Invoice Details'),iy); iy+=5.5;
  S(8.5,false,60,60,60);
  [`Invoice No. : ${invoice.invoiceNo}`,`Date : ${d.fmt(d.bd)}`,`Due Date : ${d.fmt(d.due)}`]
    .forEach(l=>{ pdf.text(l,c3-pdf.getTextWidth(l),iy); iy+=4.8; });
  // CRM fields
  if(inv.crmName||inv.crmPhone||inv.crmEmail){
    iy+=1;
    if(inv.crmName)  { const t=`CRM : ${inv.crmName}`;    pdf.text(t,c3-pdf.getTextWidth(t),iy); iy+=4; }
    if(inv.crmPhone) { const t=`Phone : ${inv.crmPhone}`; pdf.text(t,c3-pdf.getTextWidth(t),iy); iy+=4; }
    if(inv.crmEmail) { const t=`Email : ${inv.crmEmail}`; pdf.text(t,c3-pdf.getTextWidth(t),iy); iy+=4; }
  }

  y = Math.max(y,sy,iy)+10;
  // NO grey line here — go directly to table

  // ── 4. ITEMS TABLE ────────────────────────────────────────────────────────
  const COLS=[7,55,18,22,18,18,0]; COLS[6]=cw-COLS.slice(0,6).reduce((a,b)=>a+b,0);
  const RH=7.5;
  R(mg,y,cw,RH,80,80,80);
  S(8.5,true,255,255,255);
  let cx=mg;
  ['#','Item name','HSN/ SAC','Month','From','To','Amount'].forEach((h,i)=>{
    pdf.text(h, i===6?cx+COLS[i]-pdf.getTextWidth(h)-2:cx+2.5, y+5.2);
    cx+=COLS[i];
  });
  y+=RH;

  S(8.5,false,26,26,26);
  d.rows.forEach((r:any,i:number)=>{
    pdf.setDrawColor(210,210,210); pdf.setLineWidth(0.15);
    pdf.line(mg,y+RH,mg+cw,y+RH);
    cx=mg;
    [String(i+1), r.particular||'', r.hsnSac||'', r.month||'',
     r.fromDate?fmtDate(r.fromDate):'-', r.toDate?fmtDate(r.toDate):'-',
     fmtAmt(r.amount||0)
    ].forEach((v,j)=>{
      if(j===1) pdf.setFont('helvetica','bold');
      const disp = v.length>26&&j===1 ? v.slice(0,24)+'..' : v;
      pdf.text(disp, j===6?cx+COLS[j]-pdf.getTextWidth(disp)-2:cx+2.5, y+5.2);
      if(j===1) pdf.setFont('helvetica','normal');
      cx+=COLS[j];
    });
    y+=RH;
  });
  // Total row
  pdf.setDrawColor(160,160,160); pdf.setLineWidth(0.4); pdf.line(mg,y,mg+cw,y); y+=2;
  S(9,true,26,26,26);
  const particulColX = mg+COLS[0]+2.5;
  const totStr = fmtAmt(d.base);
  pdf.text('Total', particulColX, y+5.5);
  pdf.text(totStr, mg+cw-pdf.getTextWidth(totStr)-2, y+5.5);
  y+=10;
  // Bottom grey line after Total row
  pdf.setDrawColor(180,180,180); pdf.setLineWidth(0.4);
  pdf.line(mg, y, mg+cw, y);
  y+=6;

  // ── 5. DESCRIPTION + GST ─────────────────────────────────────────────────
  const lX=mg, rX=mg+cw*0.54, rW=cw*0.46;
  let ly=y, ry=y;

  S(9,true,26,26,26); pdf.text('Description',lX,ly); ly+=5;
  S(8.5,false,60,60,60);
  pdf.splitTextToSize(d.desc, cw*0.50).forEach((l:string)=>{ pdf.text(l,lX,ly); ly+=4; });
  ly+=4;
  S(9,true,26,26,26); pdf.text('Invoice Amount In Words',lX,ly); ly+=5;
  S(8.5,false,60,60,60);
  pdf.splitTextToSize(`${numberToWords(d.fin)} Rupees only`, cw*0.50)
    .forEach((l:string)=>{ pdf.text(l,lX,ly); ly+=4; });
  ly+=4;
  S(9,true,26,26,26); pdf.text('Terms and Conditions',lX,ly); ly+=5;
  S(8.5,false,60,60,60);
  pdf.text('Please pay before due date.',lX,ly); ly+=4;
  pdf.text('Late payment penalty charges # 1.5% Per Month',lX,ly);

  // GST rows — 2-column table with vertical separator
  const gstRows = [{l:'Sub Total',v:d.base,always:true},
    {l:`CGST@${d.tax}%`,v:d.cgst,always:false},
    {l:`SGST@${d.tax}%`,v:d.sgst,always:false},
    {l:'Round off',v:d.ro,always:true}
  ].filter(row=>row.always||row.v>0);

  const lblColW = rW * 0.48;   // label column width
  const amtColX = rX + lblColW; // amount column starts here

  gstRows.forEach(({l,v})=>{
    const vs = fmtAmt(v);
    // NO borders — clean look
    S(8.5,false,60,60,60); pdf.text(l, rX+3, ry+4.8);
    S(8.5,true,26,26,26);
    pdf.text(vs, rX+rW-pdf.getTextWidth(vs)-3, ry+4.8);
    ry+=7;
  });
  ry+=2;
  R(rX,ry,rW,10,85,85,85);
  S(9,true,255,255,255); pdf.text('Total',rX+4,ry+6.8);
  const fs=fmtAmt(d.fin);
  pdf.text(fs,rX+rW-pdf.getTextWidth(fs)-2,ry+6.8);

  y=Math.max(ly,ry+10)+14;

  // ── 6. PAY TO + SIGNATURE + SEAL ─────────────────────────────────────────
  if(y>ph-50){ pdf.addPage(); y=mg; }
  y+=6;  // no line above Pay To

  const payX=mg, sigX=mg+cw*0.60;
  let payY=y, sigY=y;

  S(10,true,26,26,26); pdf.text('Pay To:',payX,payY); payY+=6;
  S(8.5,false,26,26,26);
  [
    { label:`Bank Name : ${company?.bankName||'N/A'}`, multi:true  },
    { label:`Bank Account No. : ${company?.accountNumber||'N/A'}`, multi:false },
    { label:`Bank IFSC code : ${company?.ifscCode||'N/A'}`,        multi:false },
    { label:`Account holder's name : ${company?.accountHolderName||company?.companyName||invoice.company}`, multi:true },
  ].forEach(item=>{
    if(item.multi){
      pdf.splitTextToSize(item.label,cw*0.54)
        .forEach((l:string)=>{ pdf.text(l,payX,payY); payY+=4.5; });
    } else {
      pdf.text(item.label,payX,payY); payY+=4.8;
    }
  });

  // Right: For: Company + Seal + Authorized Signatory
  S(9,false,26,26,26);
  pdf.text(`For :${coName}`,sigX,sigY); sigY+=5;

  // ── Signature + Seal — ONLY when approved ───────────────────────────────
  if(inv.approved){
    const sealSize = 30;  // seal square size in mm (bigger)
    const signW    = 30, signH = 20;
    const sealX    = sigX + signW + 1;  // 4mm gap only

    // Signature image
    if(inv.signatureImage){
      try {
        pdf.addImage(inv.signatureImage,'PNG', sigX, sigY, signW, signH);
      } catch {}
    }

    // Seal image — NO circles/borders, just the image
    const sealImg = company?.sealUrl || company?.logoUrl;
    if(sealImg){
      try {
        pdf.addImage(sealImg,'PNG', sealX, sigY-4, sealSize, sealSize);
      } catch {}
    }

    sigY += sealSize + 0;
    // NO green "Approved" text
  } else {
    sigY += 20;
  }
  // Authorized Signatory
  S(9,true,26,26,26); pdf.text('Authorized Signatory',sigX,sigY);

  // ── Footer — bottom of page (no line) ──────────────────────────────────
  const footerY = ph - 10;
  S(7,false,180,180,180);
  const footLeft  = 'This is a computer generated invoice.';
  const footRight = `Invoice No: ${invoice.invoiceNo}`;
  pdf.text(footLeft,  mg,           footerY+4);
  pdf.text(footRight, mg+cw-pdf.getTextWidth(footRight), footerY+4);

  pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
}
