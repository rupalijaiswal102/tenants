import jsPDF from 'jspdf';
import { type Invoice, type Tenant, type Company } from '../../src/types';

function numberToWords(n:number):string{
  const u=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(!n)return'Zero';
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

const Rs    = (v:number) => `Rs ${Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtD  = (s:string) => { try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;}catch{return s;} };
const fmtDt = (s:string) => { try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;}catch{return s;} };

export function buildInvoiceData(invoice:Invoice, tenant?:Tenant){
  const bd=new Date(invoice.billDate), due=new Date(bd); due.setDate(due.getDate()+7);
  const MN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const last=new Date(bd.getFullYear(),bd.getMonth()+1,0).getDate();
  const mm=String(bd.getMonth()+1).padStart(2,'0'), yyyy=bd.getFullYear();
  const base=invoice.baseRent||0, sgst=invoice.sgst||0, cgst=invoice.cgst||0;
  const raw=base+sgst+cgst, fin=Math.round(raw), ro=parseFloat(Math.abs(fin-raw).toFixed(2));
  const tax=invoice.taxOption==='None'?0:9;
  const rows=(invoice as any).items?.length>0?(invoice as any).items:[{particular:'Rental Charges',hsnSac:'997212',month:`${MN[bd.getMonth()]}'${yyyy}`,fromDate:`01/${mm}/${yyyy}`,toDate:`${last}/${mm}/${yyyy}`,amount:base}];
  const desc=invoice.remarks?.trim()||`Period - ${fmtDt(invoice.billDate||'')} to ${fmtDt(new Date(bd.getFullYear(),bd.getMonth(),last).toISOString())}`;
  const fmt=(d:Date)=>`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  return{bd,due,last,mm,yyyy,base,sgst,cgst,fin,ro,tax,rows,desc,fmt};
}

function drawInvoice(pdf:jsPDF, invoice:Invoice, tenant:Tenant|undefined, company:Company|undefined, pw:number, startY=12): number {
  const ph=297, mg=12, cw=pw-mg*2;
  const d   = buildInvoiceData(invoice, tenant);
  const inv = invoice as any;
  let y = startY;

  // Helpers
  const S=(sz:number,w:boolean,r:number,g:number,b:number)=>{pdf.setFont('helvetica',w?'bold':'normal');pdf.setFontSize(sz);pdf.setTextColor(r,g,b);};
  const F=(r:number,g:number,b:number,x:number,yy:number,w:number,h:number)=>{pdf.setFillColor(r,g,b);pdf.rect(x,yy,w,h,'F');};
  const L=(yy:number,t=0.4,r=160,g=160,b=160)=>{pdf.setDrawColor(r,g,b);pdf.setLineWidth(t);pdf.line(mg,yy,mg+cw,yy);};
  const co=company?.companyName||invoice.company||'';

  // ── 1. COMPANY HEADER ───────────────────────────────────────────────────
  // Company name - bold, large
  S(14,true,15,15,15);
  pdf.splitTextToSize(co,cw*0.65).forEach((l:string)=>{pdf.text(l,mg,y);y+=5.5;});
  // Address lines - small grey
  S(8,false,80,80,80);
  const addrLines=pdf.splitTextToSize(company?.address||'',cw*0.65);
  addrLines.forEach((l:string)=>{pdf.text(l,mg,y);y+=4;});
  // Contact info
  [`Phone no. : ${company?.phoneNumber||'N/A'}`,
   `Email : ${company?.email||'N/A'}`,
   `GSTIN : ${company?.gstNumber||'N/A'}`,
   `State: ${company?.state||'Madhya Pradesh'}`
  ].forEach(l=>{pdf.text(l,mg,y);y+=4;});
  // Logo - top right, rectangular
  if(company?.logoUrl){try{pdf.addImage(company.logoUrl,'PNG',pw-mg-38,startY,38,26);}catch{}}
  y=Math.max(y, startY+30)+4;

  // Horizontal line under header
  L(y,0.5); y+=8;

  // ── 2. INVOICE TITLE ────────────────────────────────────────────────────
  S(18,true,100,100,100);  // grey, bold
  const iw=pdf.getTextWidth('INVOICE');
  pdf.text('INVOICE',mg+(cw-iw)/2,y); y+=10;

  // ── 3. BILL TO / SHIP TO / INVOICE DETAILS ──────────────────────────────
  const gap=4;  // gap between columns
  const bW=cw*0.40, sW=cw*0.30, iW=cw-bW-sW-gap*2;
  const c1=mg, c2=mg+bW+gap, c3=mg+bW+sW+gap*2;
  const sY=y;
  // No column separators

  // ── Bill To ──
  S(10,true,15,15,15); pdf.text('Bill To',c1,y); y+=5;
  S(9.5,true,15,15,15);
  pdf.splitTextToSize(tenant?.legalName||tenant?.name||invoice.partyName||'',bW).forEach((l:string)=>{pdf.text(l,c1,y);y+=4.5;});
  S(8,false,80,80,80);
  const billLines=[
    ...(tenant?.billingAddress||'').split('\n').filter(Boolean),
    ...(tenant?.mobile?[`Contact No. : ${tenant.mobile}`]:[]),
    ...(tenant?.gstNo&&tenant.gstNo!=='Unregistered'?[`GSTIN : ${tenant.gstNo}`]:[]),
    'State: 23-Madhya Pradesh',
    ...(tenant?.securityDeposit&&Number(tenant.securityDeposit)>0?[`Security Deposit : ${Number(tenant.securityDeposit).toLocaleString('en-IN')}`]:[]),
    ...(tenant?.leaseStart?[`Agreement Start: ${fmtDt(tenant.leaseStart)}`]:[]),
    ...(tenant?.leaseEnd?[`Agreement End : ${fmtDt(tenant.leaseEnd)}`]:[]),
    ...(tenant?.nextEscalationDate?[`Rent Escalation : ${fmtD(tenant.nextEscalationDate)}`]:[]),
  ];
  billLines.forEach(l=>{pdf.splitTextToSize(l,bW-1).forEach((wl:string)=>{pdf.text(wl,c1,y);y+=3.8;});});

  // ── Ship To ──
  let sy=sY;
  S(10,true,15,15,15); pdf.text('Ship To',c2,sy); sy+=5;
  S(8,false,80,80,80);
  pdf.splitTextToSize(tenant?.property||'',sW-1).forEach((l:string)=>{pdf.text(l,c2,sy);sy+=3.8;});

  // ── Invoice Details ── (right-aligned)
  let iy=sY;
  S(10,true,15,15,15);
  pdf.text('Invoice Details',c3+iW-pdf.getTextWidth('Invoice Details'),iy); iy+=5;
  S(8,false,80,80,80);
  [`Invoice No. : ${invoice.invoiceNo}`,`Date : ${d.fmt(d.bd)}`,`Due Date : ${d.fmt(d.due)}`]
    .forEach(l=>{pdf.text(l,c3+iW-pdf.getTextWidth(l),iy);iy+=4.2;});
  // CRM details
  if(inv.crmName||inv.crmPhone||inv.crmEmail){
    iy+=1;
    if(inv.crmName)  { const t=`CRM : ${inv.crmName}`;   pdf.text(t,c3+iW-pdf.getTextWidth(t),iy); iy+=4; }
    if(inv.crmPhone) { const t=`Phone : ${inv.crmPhone}`; pdf.text(t,c3+iW-pdf.getTextWidth(t),iy); iy+=4; }
    if(inv.crmEmail) {
      const lines=pdf.splitTextToSize(`Email : ${inv.crmEmail}`,iW);
      lines.forEach((l:string)=>{pdf.text(l,c3+iW-pdf.getTextWidth(l),iy);iy+=3.8;});
    }
  }

  y=Math.max(y,sy,iy)+6;
  y+=5;  // no bottom line

  // ── 4. ITEMS TABLE ──────────────────────────────────────────────────────
  const COLS=[8,60,18,24,20,20,0]; COLS[6]=cw-COLS.slice(0,6).reduce((a,b)=>a+b,0);
  const RH=7;
  // Dark header
  F(50,50,50,mg,y,cw,RH);
  S(8.5,true,255,255,255);
  let cx=mg;
  ['#','Item name','HSN/ SAC','Month','From','To','Amount'].forEach((h,i)=>{
    pdf.text(h,i===6?cx+COLS[i]-pdf.getTextWidth(h)-2:cx+2.5,y+5); cx+=COLS[i];
  });
  y+=RH;

  S(8.5,false,20,20,20);
  d.rows.forEach((r:any,i:number)=>{
    if(i>0){pdf.setDrawColor(220,220,220);pdf.setLineWidth(0.2);pdf.line(mg,y,mg+cw,y);}
    cx=mg;
    [String(i+1),r.particular||'',r.hsnSac||'',r.month||'',
     r.fromDate?fmtDt(r.fromDate).replace(/\./g,'/'):'-',
     r.toDate?fmtDt(r.toDate).replace(/\./g,'/'):'-',
     Rs(r.amount||0)
    ].forEach((v,j)=>{
      if(j===1){S(8.5,true,20,20,20);}
      else if(j===6){S(8.5,true,20,20,20);}   // black, bold
      else{S(8.5,false,20,20,20);}
      pdf.text(j===6?v:v.length>28&&j===1?v.slice(0,26)+'..':v,
        j===6?cx+COLS[j]-pdf.getTextWidth(Rs(r.amount||0))-2:cx+2.5, y+5);
      cx+=COLS[j];
    });
    y+=RH;
  });

  // Total row
  pdf.setDrawColor(30,30,30);pdf.setLineWidth(0.8);pdf.line(mg,y,mg+cw,y);y+=2;
  S(9,true,20,20,20);
  pdf.text('Total',mg+COLS[0]+2.5,y+5.5);
  S(9,true,20,20,20);
  const ts=Rs(d.base); pdf.text(ts,mg+cw-pdf.getTextWidth(ts)-2,y+5.5);
  y+=9;
  pdf.setDrawColor(200,200,200);pdf.setLineWidth(0.4);pdf.line(mg,y,mg+cw,y);y+=6;

  // ── 5. DESCRIPTION + GST ────────────────────────────────────────────────
  const lX=mg, rX=mg+cw*0.50, rW=cw*0.50;
  let ly=y, ry=y;

  // Description
  S(9,true,20,20,20); pdf.text('Description',lX,ly); ly+=4.5;
  S(8,false,80,80,80);
  pdf.splitTextToSize(d.desc,cw*0.46).forEach((l:string)=>{pdf.text(l,lX,ly);ly+=3.8;});
  ly+=4;
  S(9,true,20,20,20); pdf.text('Invoice Amount In Words',lX,ly); ly+=4.5;
  S(8,false,80,80,80);
  pdf.splitTextToSize(`${numberToWords(d.fin)} Rupees only`,cw*0.46).forEach((l:string)=>{pdf.text(l,lX,ly);ly+=3.8;});
  ly+=4;
  S(9,true,20,20,20); pdf.text('Terms and Conditions',lX,ly); ly+=4.5;
  S(8,false,80,80,80);
  pdf.text('Please pay before due date.',lX,ly); ly+=3.8;
  pdf.text('Late payment penalty charges # 1.5% Per Month',lX,ly);

  // GST summary
  const gstRows=[
    {l:'Sub Total',v:d.base,always:true},
    {l:`CGST@${d.tax}%`,v:d.cgst,always:false},
    {l:`SGST@${d.tax}%`,v:d.sgst,always:false},
    {l:'Round off',v:d.ro,always:true},
  ].filter(row=>row.always||row.v>0);

  gstRows.forEach(({l,v})=>{
    const vs=Rs(v);
    S(8.5,false,80,80,80); pdf.text(l,rX+4,ry+4.5);
    S(8.5,true,20,20,20);  pdf.text(vs,rX+rW-pdf.getTextWidth(vs)-2,ry+4.5);
    ry+=7;
  });
  ry+=2;
  // Total bar - dark
  F(45,45,45,rX,ry,rW,9);
  S(9,true,255,255,255); pdf.text('Total',rX+4,ry+6.5);
  const fs=Rs(d.fin); pdf.text(fs,rX+rW-pdf.getTextWidth(fs)-2,ry+6.5);
  y=Math.max(ly,ry+9)+8;

  // ── 6. PAY TO + SIGNATURE ───────────────────────────────────────────────
  const payX=mg, sigX=mg+cw*0.58;
  let payY=y, sigY=y;

  S(9.5,true,20,20,20); pdf.text('Pay To:',payX,payY); payY+=5;
  S(8,false,20,20,20);
  [{label:`Bank Name : ${company?.bankName||'N/A'}`,multi:true},
   {label:`Bank Account No. : ${company?.accountNumber||'N/A'}`,multi:false},
   {label:`Bank IFSC code : ${company?.ifscCode||'N/A'}`,multi:false},
   {label:`Account holder's name : ${company?.accountHolderName||co}`,multi:true},
  ].forEach(item=>{
    if(item.multi){pdf.splitTextToSize(item.label,cw*0.52).forEach((l:string)=>{pdf.text(l,payX,payY);payY+=3.8;});}
    else{pdf.text(item.label,payX,payY);payY+=3.8;}
  });

  // Right: For + Seal + Authorized Signatory
  S(8.5,false,20,20,20); pdf.text(`For :${co}`,sigX,sigY); sigY+=5;
  if(inv.approved){
    // Show signature + seal ONLY after approval
    const sealSize=26, signW=26, signH=16, sealX=sigX+signW+5;
    if(inv.signatureImage){try{pdf.addImage(inv.signatureImage,'PNG',sigX,sigY,signW,signH);}catch{}}
    const sealImg=company?.sealUrl||company?.logoUrl;
    if(sealImg){try{pdf.addImage(sealImg,'PNG',sealX,sigY-2,sealSize,sealSize);}catch{}}
    sigY+=sealSize+4;
  } else {
    // Not approved — blank space only
    sigY+=20;
  }
  S(9,true,20,20,20); pdf.text('Authorized Signatory',sigX,sigY);
  y=Math.max(payY,sigY)+8;

  // ── 7. FOOTER ────────────────────────────────────────────────────────────
  
  return y;
}

export function generateInvoicePDF(invoice:Invoice, tenant?:Tenant, company?:Company){
  const pw=210, ph=297;
  // Pass 1 — measure
  const dummy=new jsPDF('p','mm','a4');
  const contentH=drawInvoice(dummy,invoice,tenant,company,pw,12);
  // Balanced margin — cap at 22mm top
  const topMargin=Math.min(Math.max((ph-contentH)/2, 15), 25);
  // Pass 2 — final A4
  const pdf=new jsPDF('p','mm','a4');
  drawInvoice(pdf,invoice,tenant,company,pw,topMargin);
  pdf.save(`Invoice_${invoice.invoiceNo}.pdf`);
}