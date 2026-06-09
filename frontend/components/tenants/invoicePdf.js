import jsPDF from 'jspdf';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fd = (s) => {
  try { return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g,'-'); }
  catch { return String(s||''); }
};
const fdLong = (s) => {
  try { return new Date(s).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return String(s||''); }
};
const fdDot = (s) => {
  try {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  } catch { return String(s||''); }
};

function n2w(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (!n||n===0) return 'Zero';
  if (n<20)      return ones[n];
  if (n<100)     return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if (n<1000)    return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+n2w(n%100):'');
  if (n<100000)  return n2w(Math.floor(n/1000))+' Thousand'+(n%1000?' '+n2w(n%1000):'');
  if (n<10000000)return n2w(Math.floor(n/100000))+' Lakh'+(n%100000?' '+n2w(n%100000):'');
  return n2w(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+n2w(n%10000000):'');
}

async function loadImageB64(url) {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) return url;
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const res  = await fetch(full, { mode:'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror   = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}
function imgFmt(b64) {
  if (!b64) return 'PNG';
  if (b64.includes('image/jpeg')||b64.includes('image/jpg')) return 'JPEG';
  if (b64.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

// ── INVOICE PDF ───────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoice, tenant, company) {
  const logoB64 = await loadImageB64(company?.logoUrl || null);
  const sealB64 = invoice.approved ? await loadImageB64(company?.sealUrl || null) : null;
  const signB64 = invoice.approved && invoice.signatureImage ? invoice.signatureImage : null;

  const pdf = new jsPDF('p','mm','a4');
  const PW=210, PH=297, MG=14, CW=PW-MG*2;

  // ── Color tokens ──
  const BLK=[0,0,0], DK=[26,26,46], GR=[90,90,90], LGR=[160,160,160];
  const OR=[220,130,0], WH=[255,255,255], BDR=[210,210,210];
  const TH_BG=[85,85,90], ROW_ALT=[247,247,247];  // gray header

  // ── Drawing helpers ──
  const fnt = (sz,bold,...rgb) => {
    pdf.setFont('helvetica', bold?'bold':'normal');
    pdf.setFontSize(sz); pdf.setTextColor(...rgb);
  };
  const box = (x,y,w,h,...rgb) => { pdf.setFillColor(...rgb); pdf.rect(x,y,w,h,'F'); };
  const hl  = (x1,y,x2,...rgb) => { pdf.setDrawColor(...rgb); pdf.setLineWidth(0.25); pdf.line(x1,y,x2,y); };
  const rect= (x,y,w,h,...rgb) => { pdf.setDrawColor(...rgb); pdf.setLineWidth(0.25); pdf.rect(x,y,w,h); };

  let y = MG;

  // ════════════════════════════════════════════════════════════════
  // 1. HEADER — Company name + logo
  // ════════════════════════════════════════════════════════════════
  const LOGO_W=38, LOGO_H=22, LOGO_X=PW-MG-LOGO_W;

  // Company name bold large
  fnt(13,true,...DK);
  pdf.text(company?.companyName || invoice.company || 'Company', MG, y+6);

  // Logo (image or placeholder box)
  if (logoB64) {
    try { pdf.addImage(logoB64, imgFmt(logoB64), LOGO_X, y, LOGO_W, LOGO_H, undefined, 'FAST'); }
    catch { /* silent — no placeholder */ }
  }
  // No logo = blank space (no placeholder box)

  // Company address block
  y+=10;
  fnt(7.5,false,...GR);
  const addrLines = pdf.splitTextToSize(company?.address||'', CW-LOGO_W-6);
  addrLines.slice(0,3).forEach((l,i)=>{ pdf.text(l,MG,y+i*4.5); });
  y += Math.min(addrLines.length,3)*4.5+1;

  if (company?.phoneNumber)   { pdf.text(`Phone no. : ${company.phoneNumber}`,  MG,y); y+=4.5; }
  if (company?.email)         { pdf.text(`Email : ${company.email}`,            MG,y); y+=4.5; }
  if (company?.gstNumber)     { pdf.text(`GSTIN : ${company.gstNumber}`,        MG,y); y+=4.5; }
  if (company?.state)         { pdf.text(`State: ${company.state}`,             MG,y); y+=4.5; }

  y+=3;
  hl(MG,y,MG+CW,...BDR);
  y+=5;

  // ════════════════════════════════════════════════════════════════
  // 2. INVOICE TITLE
  // ════════════════════════════════════════════════════════════════
  fnt(20,true,160,160,160);
  pdf.text('INVOICE', PW/2, y+7, { align:'center' });
  y+=16;

  // ════════════════════════════════════════════════════════════════
  // 3. THREE-COLUMN SECTION: Bill To | Ship To | Invoice Details
  // ════════════════════════════════════════════════════════════════
  const C1W=CW*0.37, C2W=CW*0.34, C3W=CW*0.29;
  const C1X=MG, C2X=MG+C1W, C3X=MG+C1W+C2W;

  // Column headers
  fnt(11,true,...BLK);
  pdf.text('Bill To',         C1X, y+1);
  pdf.text('Ship To',         C2X, y+1);
  pdf.text('Invoice Details', C3X, y+1);
  y+=6;

  let yBill=y, yShip=y, yInv=y;

  // -- Normalize: works for Tenant, OtherParty, or invoice-only data --
  const party           = tenant || {};
  const partyName       = party.name       || invoice.partyName    || '';
  const billingAddr     = party.billingAddress || party.address    || invoice.billingAddress || '';
  const shippingAddr    = party.property   || party.billingAddress || party.address || invoice.property || '';
  const partyMobile     = party.mobile     || party.phone          || '';
  const partyGst        = party.gstNo      || party.gstNumber      || invoice.gstNo || '';
  const partyState      = party.state      || '';
  const partyDeposit    = Number(party.securityDeposit || 0);
  const partyLeaseStart = party.leaseStart || '';
  const partyLeaseEnd   = party.leaseEnd   || '';
  const partyEscalation = party.nextEscalationDate || '';

  // -- Bill To --
  fnt(8.5,true,...BLK);
  if (partyName)      { pdf.text(partyName.slice(0,32), C1X, yBill); yBill+=5; }
  fnt(7.5,false,...GR);
  if (billingAddr)    { const bAddr = pdf.splitTextToSize(billingAddr, C1W-3); bAddr.slice(0,4).forEach(l=>{ pdf.text(l,C1X,yBill); yBill+=4.5; }); }
  if (partyMobile)    { pdf.text(`Contact No. : ${partyMobile}`,                                           C1X,yBill); yBill+=4.5; }
  if (partyGst)       { pdf.text(`GSTIN : ${partyGst}`,                                                    C1X,yBill); yBill+=4.5; }
  if (partyState)     { pdf.text(`State: ${partyState}`,                                                   C1X,yBill); yBill+=4.5; }
  if (partyDeposit>0) { pdf.text(`Security Deposit : ${partyDeposit.toLocaleString('en-IN')}`,             C1X,yBill); yBill+=4.5; }
  if (partyLeaseStart){ pdf.text(`Agreement Start : ${fdDot(partyLeaseStart)}`,                            C1X,yBill); yBill+=4.5; }
  if (partyLeaseEnd)  { pdf.text(`Agreement End : ${fdDot(partyLeaseEnd)}`,                                C1X,yBill); yBill+=4.5; }
  if (partyEscalation){ pdf.text(`Rent Escalation : ${fdDot(partyEscalation)}`,                            C1X,yBill); yBill+=4.5; }

  // -- Ship To --
  fnt(8.5,true,...BLK);
  if (partyName)      { pdf.text(partyName.slice(0,28), C2X, yShip); yShip+=5; }
  fnt(7.5,false,...GR);
  if (shippingAddr)   { const sAddr = pdf.splitTextToSize(shippingAddr, C2W-3); sAddr.slice(0,6).forEach(l=>{ pdf.text(l,C2X,yShip); yShip+=4.5; }); }

  // -- Invoice Details --
  const billDate = new Date(invoice.billDate||Date.now());
  const dueDate  = new Date(billDate); dueDate.setDate(dueDate.getDate()+7);
  fnt(7.5,false,...GR);
  // Invoice No — format: FY26-27/15
  const fy1=String(billDate.getFullYear()).slice(-2);
  const fy2=String(billDate.getFullYear()+1).slice(-2);
  pdf.text(`Invoice No. : FY${fy1}-${fy2}/${invoice.invoiceNo||'-'}`,  C3X, yInv); yInv+=5;
  pdf.text(`Date : ${fd(invoice.billDate)}`,                            C3X, yInv); yInv+=4.5;
  pdf.text(`Due Date : ${fd(dueDate)}`,                                 C3X, yInv); yInv+=4.5;

  // CRM details (from invoice)
  if (invoice.crmName)  { pdf.text(`CRM : ${invoice.crmName}`,         C3X, yInv); yInv+=4.5; }
  if (invoice.crmPhone) { pdf.text(`Phone : ${invoice.crmPhone}`,      C3X, yInv); yInv+=4.5; }
  if (invoice.crmEmail) { pdf.text(`Email : ${invoice.crmEmail.slice(0,30)}`, C3X, yInv); yInv+=4.5; }

  y = Math.max(yBill, yShip, yInv) + 8;

  // ════════════════════════════════════════════════════════════════
  // 4. LINE ITEMS TABLE
  // ════════════════════════════════════════════════════════════════
  const RH=9;
  const COLS=[
    { lbl:'#',        w:8,          r:false },
    { lbl:'Item name',w:CW*0.33,    r:false },
    { lbl:'HSN/ SAC', w:CW*0.12,    r:false },
    { lbl:'Month',    w:CW*0.13,    r:false },
    { lbl:'From',     w:CW*0.115,   r:false },
    { lbl:'To',       w:CW*0.115,   r:false },
    { lbl:'Amount',   w:CW-8-CW*0.33-CW*0.12-CW*0.13-CW*0.115-CW*0.115, r:true },
  ];

  const drawRow=(cells,bg,hdr=false)=>{
    if(bg) box(MG,y,CW,RH,...bg);
    hl(MG,y+RH,MG+CW,...BDR);
    let cx=MG;
    cells.forEach((val,i)=>{
      const col=COLS[i];
      if(hdr){
        fnt(8.5,true,...WH);
      } else {
        if(i===1) fnt(7.5,true,...BLK);
        else if(i===6) fnt(7.5,true,...BLK);
        else fnt(7.5,false,...GR);
      }
      const tw=pdf.getTextWidth(val);
      const tx=col.r ? cx+col.w-tw-2 : cx+2;
      pdf.text(val, tx, y+RH-1.8);
      cx+=col.w;
    });
    y+=RH;
  };

  // Header row
  drawRow(['#','Item name','HSN/ SAC','Month','From','To','Amount'],TH_BG,true);

  // Data rows
  const items=(invoice.items&&invoice.items.length>0)
    ? invoice.items
    : [{ particular:'Rental Charges', hsnSac:'997212', month:'', fromDate:invoice.billDate, toDate:'', amount:invoice.baseRent||0 }];

  const MON=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const bM=billDate.getMonth(), bY=billDate.getFullYear();
  const lastD=new Date(bY,bM+1,0).getDate();
  const fmDef=`01/${String(bM+1).padStart(2,'0')}/${bY}`;
  const toDef=`${lastD}/${String(bM+1).padStart(2,'0')}/${bY}`;

  let subtotal=0;
  items.forEach((item,idx)=>{
    if(y>PH-65){ pdf.addPage(); y=MG; drawRow(['#','Item name','HSN/ SAC','Month','From','To','Amount'],TH_BG,true); }
    const amt=Number(item.amount||0); subtotal+=amt;
    const mLabel=item.month||`${MON[bM]}'${bY}`;
    drawRow([
      String(idx+1),
      (item.particular||'').slice(0,30),
      item.hsnSac||'997212',
      mLabel,
      item.fromDate?fd(item.fromDate):fmDef,
      item.toDate  ?fd(item.toDate)  :toDef,
      `Rs ${amt.toLocaleString('en-IN')}.00`,
    ], idx%2===0?null:ROW_ALT);
  });

  // Total row — white bg, only top + bottom border lines
  pdf.setDrawColor(...BDR); pdf.setLineWidth(0.4);
  pdf.line(MG, y, MG+CW, y);           // top border
  pdf.line(MG, y+RH, MG+CW, y+RH);    // bottom border
  fnt(8.5,true,...BLK);
  pdf.text('Total', MG+2, y+RH-1.8);
  const totLbl=`Rs ${Math.round(invoice.totalInvoice||subtotal).toLocaleString('en-IN')}.00`;
  pdf.text(totLbl, MG+CW-pdf.getTextWidth(totLbl)-2, y+RH-1.8);
  y+=RH+8;

  // ════════════════════════════════════════════════════════════════
  // 5. DESCRIPTION + AMOUNTS (left) | SUB-TOTAL BOX (right)
  // ════════════════════════════════════════════════════════════════
  if(y>PH-70){ pdf.addPage(); y=MG; }

  const total=Math.round(Number(invoice.totalInvoice)||subtotal);
  const cgst=Number(invoice.cgst||0), sgst=Number(invoice.sgst||0);
  const roundOff=total-(subtotal+cgst+sgst);

  const leftEndX=PW/2-5;
  const rightX=PW/2+5, rightW=PW-MG-rightX;

  // Left — Description
  let yL=y;
  fnt(9,true,...BLK); pdf.text('Description', MG,yL); yL+=5;
  fnt(8,false,...GR);
  pdf.text(`Period - ${fmDef.replace(/\//g,'.')} to ${toDef.replace(/\//g,'.')}`, MG,yL); yL+=8;

  fnt(9,true,...BLK); pdf.text('Invoice Amount In Words', MG,yL); yL+=5;
  fnt(8,false,...GR);
  const words = n2w(total)+' Rupees only';
  const wLines = pdf.splitTextToSize(words, leftEndX-MG);
  wLines.forEach(l=>{ pdf.text(l,MG,yL); yL+=4.5; });
  yL+=3;

  fnt(9,true,...BLK); pdf.text('Terms and Conditions', MG,yL); yL+=5;
  fnt(7.5,false,...GR);
  pdf.text('Please pay before due date.',                     MG,yL); yL+=4.5;
  pdf.text('Late payment penalty charges # 1.5% Per Month',  MG,yL); yL+=4.5;

  // Right — Sub Total box
  let yR=y;
  const sumRow=(lbl,val,dark=false)=>{
    if(dark){
      box(rightX-2,yR-1,rightW+2,7,...TH_BG);
      fnt(9,true,...WH);
    } else {
      fnt(9,false,...GR);
    }
    pdf.text(lbl, rightX, yR+4);
    if(dark) fnt(9,true,...WH); else fnt(9,true,...BLK);
    pdf.text(val, rightX+rightW-pdf.getTextWidth(val), yR+4);
    yR+=8;
  };

  sumRow('Sub Total', `Rs ${Math.round(subtotal).toLocaleString('en-IN')}.00`);
  sumRow('Round off', `Rs ${Math.abs(roundOff).toFixed(2)}`);
  sumRow('Total',     `Rs ${total.toLocaleString('en-IN')}.00`, true);

  y=Math.max(yL,yR+4)+4;
   y+=7.5;

  // ════════════════════════════════════════════════════════════════
  // 6. PAY TO (left) | FOR COMPANY + SEAL + SIGNATORY (right)
  // ════════════════════════════════════════════════════════════════
  if(y>PH-50){ pdf.addPage(); y=MG; }

  let yP=y;
  fnt(9,true,...BLK); pdf.text('Pay To:', MG,yP); yP+=5;
  fnt(7.5,false,...GR);
  if(company?.bankName)          { pdf.text(`Bank Name : ${company.bankName}`,           MG,yP); yP+=4.5; }
  if(company?.accountNumber)     { pdf.text(`Bank Account No. : ${company.accountNumber}`,MG,yP); yP+=4.5; }
  if(company?.ifscCode)          { pdf.text(`Bank IFSC code : ${company.ifscCode}`,       MG,yP); yP+=4.5; }
  if(company?.accountHolderName) { pdf.text(`Account holder's name : ${company.accountHolderName}`,MG,yP); yP+=4.5; }

  // Right side — For company
  const RX=PW/2+5;
  let yS=y;
  const forStr=`For :${(company?.companyName||invoice.company||'').slice(0,28)}`;
  fnt(8.5,false,...GR);
  pdf.text(forStr, PW-MG-pdf.getTextWidth(forStr), yS); yS+=12;

  // Seal + Signature — side by side, minimal gap
  if(invoice.approved){
    const stampY = yS - 4;
    // Signature on left of seal
    if(signB64){
      try{ pdf.addImage(signB64,imgFmt(signB64), PW-MG-60, stampY+2, 26,18, undefined,'FAST'); }catch{}
    }
    // Seal on right
    if(sealB64){
      try{ pdf.addImage(sealB64,imgFmt(sealB64), PW-MG-32, stampY-2, 26,26, undefined,'FAST'); }catch{}
    }
    yS = stampY + (sealB64||signB64 ? 26 : 4);
  } else {
    yS += 2;
  }

  // Authorized Signatory
  fnt(9,true,...BLK);
  pdf.text('Authorized Signatory', PW-MG-pdf.getTextWidth('Authorized Signatory'), yS);

  if(invoice.approved){
    fnt(7,false,16,185,129);
    const apStr=`Approved${invoice.approvedBy?` by: ${invoice.approvedBy}`:''}`;
    pdf.text(apStr, PW-MG-pdf.getTextWidth(apStr), yS+5);
  }

  y=Math.max(yP,yS)+8;

  // ════════════════════════════════════════════════════════════════
  // Footer line
  // ════════════════════════════════════════════════════════════════
  
}

// ── LEDGER PDF ────────────────────────────────────────────────────────────────
const fmtDate=(s)=>{ try{ return new Date(s).toLocaleDateString('en-GB'); }catch{ return s; }};
const fmtAmt =(v)=> v>0 ? Math.round(v).toLocaleString('en-IN') : '-';

export function generateLedgerPDF(tenant, company, ledger, summary) {
  const pdf=new jsPDF('l','mm','a4');
  const pw=297,ph=210,mg=12,cw=pw-mg*2;
  const OR=[249,115,22],DK=[26,26,46],WH=[255,255,255],GR=[100,116,139],LG=[248,249,251];
  let y=0;
  const S=(sz,bold,r,g,b)=>{ pdf.setFont('helvetica',bold?'bold':'normal'); pdf.setFontSize(sz); pdf.setTextColor(r,g,b); };
  const R=(x,yy,w,h,r,g,b)=>{ pdf.setFillColor(r,g,b); pdf.rect(x,yy,w,h,'F'); };

  R(0,0,pw,28,...OR);
  S(16,true,...WH);  pdf.text(company?.companyName||tenant.company||'Company',mg,12);
  S(9,false,...WH);  pdf.text('Tenant Ledger Statement',mg,20);
  const today=new Date().toLocaleDateString('en-GB');
  S(8.5,false,...WH); pdf.text(`Generated: ${today}`,pw-mg-pdf.getTextWidth(`Generated: ${today}`),12);
  if(ledger.length>0){
    const range=`Period: ${fmtDate(ledger[0].date)} — ${fmtDate(ledger[ledger.length-1].date)}`;
    pdf.text(range,pw-mg-pdf.getTextWidth(range),20);
  }
  y=33;

  R(mg,y,cw,24,...LG);
  pdf.setDrawColor(220,222,226); pdf.setLineWidth(0.3); pdf.rect(mg,y,cw,24);
  const info=[['Tenant Name',tenant.name||'-'],['Tenant Code',tenant.code||'-'],['Company',(company?.companyName||tenant.company||'-').slice(0,25)],['Property',(tenant.property||'-').slice(0,35)],['GST No.',tenant.gstNo||'Unregistered'],['Contact',tenant.mobile||'-']];
  const iCols=3, iCW=cw/iCols;
  info.forEach(([l,v],i)=>{ const col=i%iCols,row=Math.floor(i/iCols),ix=mg+col*iCW+5,iy=y+row*11+7; S(7,false,...GR); pdf.text(l,ix,iy); S(8.5,true,...DK); pdf.text(v,ix,iy+5); });
  y+=29;

  R(mg,y,cw,14,...OR);
  const sums=[['Opening Bal',summary.openingBalance],['Total Invoiced',summary.totalInvoiced],['Total Received',summary.totalReceived],['Total TDS',summary.totalTds],['Closing Bal',summary.closingBalance]];
  const sw=cw/sums.length;
  sums.forEach(([l,v],i)=>{ const sx=mg+i*sw+sw/2; S(7,false,...WH); pdf.text(l,sx-pdf.getTextWidth(l)/2,y+5.5); S(8.5,true,...WH); const vs=`Rs ${Math.abs(v||0).toLocaleString('en-IN')}`; pdf.text(vs,sx-pdf.getTextWidth(vs)/2,y+11.5); });
  y+=19;

  const COLS=[{l:'Date',w:26,r:false},{l:'Particular',w:78,r:false},{l:'Type',w:28,r:false},{l:'Ref No.',w:30,r:false},{l:'Debit',w:36,r:true},{l:'Credit',w:36,r:true},{l:'Balance',w:cw-26-78-28-30-36-36,r:true}];
  const RH=7;
  const drawHdr=(yy)=>{ R(mg,yy,cw,RH,...DK); S(8.5,true,...WH); let cx=mg; COLS.forEach(c=>{ const tx=c.r?cx+c.w-pdf.getTextWidth(c.l)-2:cx+2.5; pdf.text(c.l,tx,yy+5); cx+=c.w; }); };
  drawHdr(y); y+=RH;

  let rc=0;
  ledger.forEach(e=>{
    if(y>ph-35){ pdf.addPage(); y=12; drawHdr(y); y+=RH; }
    if(rc%2===0) R(mg,y,cw,RH,252,252,253);
    pdf.setDrawColor(230,232,235); pdf.setLineWidth(0.15); pdf.line(mg,y+RH,mg+cw,y+RH);
    const row=[fmtDate(e.date),(e.particular||'').slice(0,34),e.type,e.refNo||'-',fmtAmt(e.debit),fmtAmt(e.credit),`Rs ${Math.abs(e.runningBalance||0).toLocaleString('en-IN')} ${e.runningBalance<0?'Cr':'Dr'}`];
    let cx=mg;
    row.forEach((val,i)=>{
      const col=COLS[i];
      if(i===4&&e.debit>0) S(8,true,220,38,38);
      else if(i===5&&e.credit>0) S(8,true,16,185,129);
      else if(i===6) S(8,true,...OR);
      else S(8,false,...DK);
      const tx=col.r?cx+col.w-pdf.getTextWidth(val)-2:cx+2.5;
      pdf.text(val,tx,y+5); cx+=col.w;
    });
    y+=RH; rc++;
  });

  pdf.setDrawColor(...OR); pdf.setLineWidth(0.7); pdf.line(mg,y,mg+cw,y); y+=2;
  R(mg,y,cw,RH+1,255,247,237); S(8.5,true,...OR);
  const tot=['','TOTAL','','',fmtAmt(summary.totalInvoiced),fmtAmt(summary.totalReceived),`Rs ${Math.abs(summary.closingBalance||0).toLocaleString('en-IN')}`];
  let cx2=mg; tot.forEach((v,i)=>{ const col=COLS[i]; const tx=col.r?cx2+col.w-pdf.getTextWidth(v)-2:cx2+2.5; pdf.text(v,tx,y+5.5); cx2+=col.w; }); y+=RH+5;

  if(y>ph-22){ pdf.addPage(); y=12; }
  R(mg,y,cw,16,...OR);
  S(8.5,false,...WH); pdf.text('Opening Balance:',mg+5,y+6.5);
  S(9.5,true,...WH);  pdf.text(`Rs ${Math.abs(summary.openingBalance||0).toLocaleString('en-IN')}`,mg+45,y+6.5);
  S(8.5,false,...WH); pdf.text('Closing Balance:',mg+5,y+13);
  S(9.5,true,...WH);
  const cb=summary.closingBalance||0;
  pdf.text(`Rs ${Math.abs(cb).toLocaleString('en-IN')} ${cb<0?'(Advance/Cr)':'(Due/Dr)'}`,mg+45,y+13);
  const co=company?.companyName||tenant.company||'';
  S(8,false,...WH); pdf.text(co,pw-mg-pdf.getTextWidth(co),y+6.5);
  S(7.5,false,...WH); const auth='Authorized Signatory'; pdf.text(auth,pw-mg-pdf.getTextWidth(auth),y+13);
  y+=21;
  pdf.setDrawColor(...OR); pdf.setLineWidth(0.4); pdf.line(mg,y,mg+cw,y);
  S(7,false,...GR); pdf.text('This is a computer generated ledger statement.',mg,y+4.5); pdf.text('Page 1',pw-mg-12,y+4.5);

  pdf.save(`Ledger_${tenant.name}_${today.replace(/\//g,'-')}.pdf`);
}