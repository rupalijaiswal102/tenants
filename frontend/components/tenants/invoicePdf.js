import jsPDF from 'jspdf';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fd = (s) => {
  try { return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g,'-'); }
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
export async function generateInvoicePDF(invoice, tenant, company, { download = true } = {}) {
  const logoB64 = await loadImageB64(company?.logoUrl || null);
  const sealB64 = invoice.approved ? await loadImageB64(company?.sealUrl || null) : null;

  const pdf = new jsPDF('p','mm','a4');
  const PW=210, PH=297, MG=14, CW=PW-MG*2;

  // Color tokens
  const BLK=[0,0,0], DK=[26,26,46], GR=[40,40,40];
  const WH=[255,255,255], BDR=[210,210,210];
  const TH_BG=[40,40,50];       // dark header — matches PDF
  const ROW_ALT=[247,247,247];

  // Drawing helpers
  const fnt = (sz,bold,...rgb) => {
    pdf.setFont('helvetica', bold?'bold':'normal');
    pdf.setFontSize(sz); pdf.setTextColor(...rgb);
  };
  const box = (x,y,w,h,...rgb) => { pdf.setFillColor(...rgb); pdf.rect(x,y,w,h,'F'); };
  const hl  = (x1,y,x2,...rgb) => { pdf.setDrawColor(...rgb); pdf.setLineWidth(0.25); pdf.line(x1,y,x2,y); };

  // Amount format — jsPDF standard fonts do not support ₹ Unicode glyph
  const fmtI = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-IN')}.00`;
  const fmtD = (n) => `Rs. ${Math.abs(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let y = MG;

  // ════════════════════════════════════════════════════════════════
  // 1. HEADER — Company name (left) + Logo (right)
  // ════════════════════════════════════════════════════════════════
  const LOGO_W=38, LOGO_H=22, LOGO_X=PW-MG-LOGO_W;

  fnt(13,true,...DK);
  pdf.text(company?.companyName || invoice.company || 'Company', MG, y+6);

  if (logoB64) {
    try { pdf.addImage(logoB64, imgFmt(logoB64), LOGO_X, y, LOGO_W, LOGO_H, undefined, 'FAST'); }
    catch {}
  }

  y+=10;
  fnt(9,false,...GR);
  const addrLines = pdf.splitTextToSize(company?.address||'', CW-LOGO_W-6);
  addrLines.slice(0,3).forEach((l,i)=>{ pdf.text(l,MG,y+i*4.5); });
  y += Math.min(addrLines.length,3)*4.5+1;

  if (company?.phoneNumber)   { pdf.text(`Phone no. : ${company.phoneNumber}`,  MG,y); y+=4.5; }
  if (company?.email)         { pdf.text(`Email : ${company.email}`,            MG,y); y+=4.5; }
  if (company?.gstNumber)     { pdf.text(`GSTIN : ${company.gstNumber}`,        MG,y); y+=4.5; }
  if (company?.state)         { pdf.text(`State: ${company.state}`,             MG,y); y+=4.5; }

  y+=3;
  hl(MG,y,MG+CW,...BDR);
  y+=3;

  // ════════════════════════════════════════════════════════════════
  // 2. INVOICE TITLE
  // ════════════════════════════════════════════════════════════════
  fnt(18,true,160,160,160);
  pdf.text('INVOICE', PW/2, y+6, { align:'center' });
  y+=11;

  // ════════════════════════════════════════════════════════════════
  // 3. THREE-COLUMN: Bill To | Ship To | Invoice Details
  // ════════════════════════════════════════════════════════════════
  const party           = tenant || {};
  const partyName       = party.name          || invoice.partyName    || '';
  const billingAddr     = party.billingAddress || party.address        || invoice.billingAddress || '';
  const shippingAddr    = party.property       || invoice.property     || '';   // only actual property — no billingAddress fallback
  const partyMobile     = party.mobile         || party.phone          || '';
  const partyGst        = party.gstNo          || party.gstNumber      || invoice.gstNo || '';
  const partyState      = party.state          || '';
  const partyLeaseStart = party.leaseStart     || '';
  const partyLeaseEnd   = party.leaseEnd       || '';
  const partyEscalation = party.nextEscalationDate || '';

  // Layout: 3-col when Ship To exists, 2-col otherwise
  const hasShipTo = !!shippingAddr;
  const C1W = hasShipTo ? CW*0.37 : CW*0.55;
  const C2W = CW*0.34;
  const C1X=MG, C2X=MG+C1W;

  // Column headings
  fnt(12,true,...BLK);
  pdf.text('Bill To', C1X, y+1);
  if (hasShipTo) pdf.text('Ship To', C2X, y+1);
  pdf.text('Invoice Details', MG+CW, y+1, { align:'right' });
  y+=6;

  let yBill=y, yShip=y, yInv=y;

  // Bill To
  fnt(10,true,...BLK);
  if (partyName) {
    const nameLines = pdf.splitTextToSize(partyName, C1W - 3);
    nameLines.forEach(l => { pdf.text(l, C1X, yBill); yBill += 5; });
  }
  fnt(9,false,...GR);
  if (billingAddr)    { const bAddr = pdf.splitTextToSize(billingAddr, C1W-3); bAddr.slice(0,4).forEach(l=>{ pdf.text(l,C1X,yBill); yBill+=4.5; }); }
  if (partyMobile)    { pdf.text(`Contact No. : ${partyMobile}`, C1X,yBill); yBill+=4.5; }
  if (partyGst)       { pdf.text(`GSTIN : ${partyGst}`,          C1X,yBill); yBill+=4.5; }
  if (partyState)     { pdf.text(`State: ${partyState}`,         C1X,yBill); yBill+=4.5; }
  if (partyLeaseStart){ pdf.text(`Agreement Start: ${fdDot(partyLeaseStart)}`,  C1X,yBill); yBill+=4.5; }
  if (partyLeaseEnd)  { pdf.text(`Agreement End : ${fdDot(partyLeaseEnd)}`,     C1X,yBill); yBill+=4.5; }
  if (partyEscalation){ pdf.text(`Rent Escalation : ${fdDot(partyEscalation)}`, C1X,yBill); yBill+=4.5; }

  // Ship To — only shown when property address exists
  if (hasShipTo) {
    fnt(9,false,...GR);
    const sAddr = pdf.splitTextToSize(shippingAddr, C2W-3);
    sAddr.slice(0,6).forEach(l=>{ pdf.text(l,C2X,yShip); yShip+=4.5; });
  }

  // Invoice Details — all lines right-aligned to right margin
  const billDate = new Date(invoice.billDate||Date.now());
  const dueDate  = new Date(billDate); dueDate.setDate(dueDate.getDate()+7);
  const RX = MG+CW; // right margin x
  fnt(9,false,...GR);
  pdf.text(`Invoice No. : ${invoice.invoiceNo||'-'}`, RX, yInv, { align:'right' }); yInv+=5;
  pdf.text(`Date : ${fd(invoice.billDate)}`,          RX, yInv, { align:'right' }); yInv+=4.5;
  pdf.text(`Due Date : ${fd(dueDate)}`,               RX, yInv, { align:'right' }); yInv+=4.5;
  if (invoice.crmName)  { pdf.text(`CRM : ${invoice.crmName}`,    RX, yInv, { align:'right' }); yInv+=4.5; }
  if (invoice.crmPhone) { pdf.text(`Phone : ${invoice.crmPhone}`, RX, yInv, { align:'right' }); yInv+=4.5; }
  if (invoice.crmEmail) { pdf.text(`Email : ${(invoice.crmEmail||'').slice(0,32)}`, RX, yInv, { align:'right' }); yInv+=4.5; }

  y = Math.max(yBill, yShip, yInv) + 4;

  // ════════════════════════════════════════════════════════════════
  // 4. LINE ITEMS TABLE
  // ════════════════════════════════════════════════════════════════
  const RH=8;
  const COLS=[
    { lbl:'#',        w:7,                                                              r:false },
    { lbl:'Item name',w:CW*0.28,                                                        r:false },
    { lbl:'HSN/ SAC', w:CW*0.11,                                                        r:false },
    { lbl:'Month',    w:CW*0.19,                                                        r:false },
    { lbl:'From',     w:CW*0.115,                                                       r:false },
    { lbl:'To',       w:CW*0.115,                                                       r:false },
    { lbl:'Amount',   w:CW-7-CW*0.28-CW*0.11-CW*0.19-CW*0.115-CW*0.115,              r:true  },
  ];

  const drawRow=(cells,bg,hdr=false)=>{
    // pre-wrap each cell to find the tallest
    const wrapped=cells.map((val,i)=>{
      if(hdr) return [val];
      const maxW=COLS[i].w-4;
      if(i===1||i===6) fnt(9,true,...BLK); else fnt(9,false,...GR);
      return pdf.splitTextToSize(String(val||''), maxW);
    });
    const rowH=Math.max(RH, Math.max(...wrapped.map(l=>l.length))*4.5+3);
    if(bg) box(MG,y,CW,rowH,...bg);
    hl(MG,y+rowH,MG+CW,...BDR);
    let cx=MG;
    wrapped.forEach((lines,i)=>{
      const col=COLS[i];
      if(hdr)        fnt(9.5,true,...WH);
      else if(i===1) fnt(9,true,...BLK);
      else if(i===6) fnt(9,true,...BLK);
      else           fnt(9,false,...GR);
      lines.forEach((line,li)=>{
        const tw=pdf.getTextWidth(line);
        pdf.text(line, col.r ? cx+col.w-tw-2 : cx+2, y+4.5+li*4.5);
      });
      cx+=col.w;
    });
    y+=rowH;
  };

  drawRow(['#','Item name','HSN/ SAC','Month','From','To','Amount'],TH_BG,true);

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
    drawRow([
      String(idx+1),
      (item.particular||'').slice(0,30),
      item.hsnSac||'997212',
      item.month||`${MON[bM]}'${bY}`,
      item.fromDate?fd(item.fromDate):fmDef,
      item.toDate  ?fd(item.toDate)  :toDef,
      fmtI(amt),
    ], idx%2===0?null:ROW_ALT);
  });

  // Total row — shows sum of item amounts only (CGST/SGST shown separately in right box)
  const totalAmt=Math.round(invoice.totalInvoice||subtotal);
  pdf.setDrawColor(...BDR); pdf.setLineWidth(0.4);
  pdf.line(MG,y,MG+CW,y);
  pdf.line(MG,y+RH,MG+CW,y+RH);
  fnt(10,true,...BLK);
  pdf.text('Total', MG+8+2, y+RH-2);
  const totLbl=fmtI(Math.round(subtotal));
  pdf.text(totLbl, MG+CW-pdf.getTextWidth(totLbl)-2, y+RH-2);
  y+=RH+5;

  // ════════════════════════════════════════════════════════════════
  // 5. DESCRIPTION (left) | SUB-TOTAL / TOTAL BOX (right)
  // ════════════════════════════════════════════════════════════════
  if(y>PH-90){ pdf.addPage(); y=MG; }

  const rightX=PW/2+5, rightW=PW-MG-rightX;
  const leftEndX=PW/2-5;

  let yL=y;
  if (invoice.remarks) {
    fnt(9,true,...BLK); pdf.text('Description', MG,yL); yL+=4;
    fnt(8.5,false,...GR);
    const remLines = pdf.splitTextToSize(String(invoice.remarks), leftEndX-MG);
    remLines.forEach(l => { pdf.text(l, MG, yL); yL+=4; });
    yL+=1;
  }

  fnt(9,true,...BLK); pdf.text('Invoice Amount In Words', MG,yL); yL+=4;
  fnt(8.5,false,...GR);
  const wLines = pdf.splitTextToSize(n2w(totalAmt)+' Rupees only', leftEndX-MG);
  wLines.forEach(l=>{ pdf.text(l,MG,yL); yL+=4; });
  yL+=2;
  fnt(8.5,true,...BLK); pdf.text('Terms and Conditions', MG, yL); yL+=4;
  fnt(7.5,false,140,140,140);
  pdf.text('Please pay before due date.', MG, yL); yL+=3.5;
  pdf.text('Late payment penalty charges @ 1.5% Per Month.', MG, yL); yL+=4;

  // Right — Sub Total + CGST + SGST + Round Off + Total
  let yR=y;
  const sumRow=(lbl,val,dark=false)=>{
    const rowH = dark ? 10 : 8;
    if(dark){ box(rightX-2, yR-1, rightW+2, rowH+1, ...TH_BG); fnt(10,true,...WH); }
    else     { fnt(9.5,false,...GR); }
    pdf.text(lbl, rightX, yR+5.5);
    if(dark) fnt(10.5,true,...WH); else fnt(9.5,true,...BLK);
    pdf.text(val, rightX+rightW-pdf.getTextWidth(val), yR+5.5);
    yR += rowH;
  };

  const cgstAmt  = invoice.cgst  || 0;
  const sgstAmt  = invoice.sgst  || 0;
  const rawTotal = subtotal + cgstAmt + sgstAmt;
  const roundOff = Math.round(rawTotal) - rawTotal;

  sumRow('Sub Total', fmtI(subtotal));
  if (cgstAmt > 0) sumRow('CGST@9%',   fmtD(cgstAmt));
  if (sgstAmt > 0) sumRow('SGST@9%',   fmtD(sgstAmt));
  if (Math.abs(roundOff) >= 0.001) sumRow('Round off', fmtD(Math.abs(roundOff)));
  sumRow('Total',     fmtI(totalAmt), true);

  y=Math.max(yL,yR+2)+3+3;

  // ════════════════════════════════════════════════════════════════
  // 6. PAY TO (left) | FOR COMPANY + SEAL + SIGNATORY (right)
  // ════════════════════════════════════════════════════════════════
  if(y>PH-50){ pdf.addPage(); y=MG; }

  const bankColW = 90;   // continuation line width for bank details
  const sigX     = PW-MG; // right edge for signature section

  // ── Pay To — left side, label bold-large / value small ──────────
  let yP=y;
  fnt(9,true,...BLK); pdf.text('Pay To:', MG, yP); yP+=6;

  const bankFields=[
    { lbl:'Bank Name',             val: company?.bankName },
    { lbl:'Bank Account No.',      val: company?.accountNumber },
    { lbl:'Bank IFSC code',        val: company?.ifscCode },
    { lbl:"Account holder's name", val: company?.accountHolderName },
  ].filter(f=>f.val);

  for(const {lbl,val} of bankFields){
    // Label — 9pt bold dark
    fnt(9,true,...BLK);
    const lblTxt=`${lbl} :`;
    pdf.text(lblTxt, MG, yP);
    const lblW=pdf.getTextWidth(lblTxt)+2;

    // Value — 9pt normal dark; first line capped at 60mm so long bank names wrap;
    // continuation lines at left margin with full bankColW
    fnt(9,false,...BLK);
    const valStr = String(val);
    const firstChunk = pdf.splitTextToSize(valStr, 30);
    pdf.text(firstChunk[0], MG + lblW, yP);
    if (firstChunk.length > 1) {
      const rest = pdf.splitTextToSize(firstChunk.slice(1).join(' '), bankColW);
      rest.forEach(line => { yP += 4; pdf.text(line, MG, yP); });
    }
    yP += 5;
  }

  // ── For: Company + Seal + Authorized Signatory — right side ─────
  let yS=y;
  const compFull = company?.companyName || invoice.company || '';
  fnt(9,false,...BLK);
  const forText = `For :${compFull}`;
  pdf.text(forText, sigX, yS, { align:'right' });
  const centX = sigX - pdf.getTextWidth(forText) / 2; // center x under "For :Company"
  yS += 12;

  if(invoice.approved){
    if(sealB64){ try{ pdf.addImage(sealB64,imgFmt(sealB64),centX-18,yS,36,36,undefined,'FAST'); yS+=38; }catch{ yS+=4; } }
    else { yS+=4; }
  } else {
    yS+=9;
  }

  fnt(10,true,...BLK);
  pdf.text('Authorized Signatory', centX, yS+4, { align:'center' });


  if (download) {
    pdf.save(`Invoice_${invoice.invoiceNo||'download'}.pdf`);
  } else {
    return pdf.output('datauristring').split(',')[1];
  }
}

// ── Send full invoice PDF to Slack (no download) ──────────────────────────────
export async function sendInvoicePDFToSlack(invoice, tenant, company) {
  try {
    const pdfBase64 = await generateInvoicePDF(invoice, tenant, company, { download: false });
    if (!pdfBase64) return;
    await fetch('/api/slack/upload-pdf', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64,
        invoiceNo:    invoice.invoiceNo    || '',
        partyName:    invoice.partyName    || '',
        totalInvoice: invoice.totalInvoice || 0,
        billDate:     invoice.billDate     || '',
      }),
    });
  } catch { /* non-fatal */ }
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