import jsPDF from 'jspdf';
import { type Tenant, type Company, type LedgerEntry, type LedgerSummary } from '../../src/types';

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; } };
const fmtAmt  = (v: number) => v > 0 ? Math.round(v).toLocaleString('en-IN') : '-';

export function generateLedgerPDF(
  tenant:     Tenant,
  company:    Company | undefined,
  ledger:     LedgerEntry[],
  summary:    LedgerSummary,
) {
  // ── Landscape A4 for proper column spacing ────────────────────────────────
  const pdf  = new jsPDF('l', 'mm', 'a4');  // landscape
  const pw   = 297, ph = 210;
  const mg   = 12, cw = pw - mg * 2;
  const OR   = [249, 115, 22]  as [number,number,number];
  const DK   = [26,  26,  46]  as [number,number,number];
  const WH   = [255, 255, 255] as [number,number,number];
  const GR   = [100, 116, 139] as [number,number,number];
  const LG   = [248, 249, 251] as [number,number,number];
  let y = 0;

  const S = (sz: number, bold: boolean, r: number, g: number, b: number) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(sz); pdf.setTextColor(r, g, b);
  };
  const R = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
    pdf.setFillColor(r, g, b); pdf.rect(x, yy, w, h, 'F');
  };

  // ── 1. ORANGE HEADER ────────────────────────────────────────────────────
  R(0, 0, pw, 28, ...OR);
  S(16, true,  ...WH); pdf.text(company?.companyName || tenant.company || 'Company', mg, 12);
  S(9,  false, ...WH); pdf.text('Tenant Ledger Statement', mg, 20);
  const today   = new Date().toLocaleDateString('en-GB');
  const genTxt  = `Generated: ${today}`;
  S(8.5, false, ...WH); pdf.text(genTxt, pw - mg - pdf.getTextWidth(genTxt), 12);
  if (ledger.length > 0) {
    const range = `Period: ${fmtDate(ledger[0].date)} — ${fmtDate(ledger[ledger.length-1].date)}`;
    pdf.text(range, pw - mg - pdf.getTextWidth(range), 20);
  }
  y = 33;

  // ── 2. TENANT INFO BOX ──────────────────────────────────────────────────
  R(mg, y, cw, 24, ...LG);
  pdf.setDrawColor(220, 222, 226); pdf.setLineWidth(0.3);
  pdf.rect(mg, y, cw, 24);
  const infoItems = [
    ['Tenant Name', tenant.name||'-'],
    ['Tenant Code', tenant.code||'-'],
    ['Company',     (company?.companyName||tenant.company||'-').slice(0,25)],
    ['Property',    (tenant.property||'-').slice(0,35)],
    ['GST No.',     tenant.gstNo||'Unregistered'],
    ['Contact',     tenant.mobile||'-'],
  ];
  const iCols = 3, iCellW = cw / iCols;
  infoItems.forEach(([lbl, val], i) => {
    const col = i % iCols, row = Math.floor(i / iCols);
    const ix  = mg + col * iCellW + 5;
    const iy  = y + row * 11 + 7;
    S(7,   false, ...GR); pdf.text(lbl, ix, iy);
    S(8.5, true,  ...DK); pdf.text(val, ix, iy + 5);
  });
  y += 29;

  // ── 3. SUMMARY BAR ──────────────────────────────────────────────────────
  R(mg, y, cw, 14, ...OR);
  const sumItems: [string, number][] = [
    ['Opening Bal',    summary.openingBalance],
    ['Total Invoiced', summary.totalInvoiced],
    ['Total Received', summary.totalReceived],
    ['Total TDS',      summary.totalTds],
    ['Closing Bal',    summary.closingBalance],
  ];
  const sw = cw / sumItems.length;
  sumItems.forEach(([lbl, val], i) => {
    const sx = mg + i * sw + sw / 2;
    S(7,   false, ...WH); pdf.text(lbl, sx - pdf.getTextWidth(lbl)/2, y + 5.5);
    S(8.5, true,  ...WH);
    const vs = `Rs ${Math.abs(val).toLocaleString('en-IN')}`;
    pdf.text(vs, sx - pdf.getTextWidth(vs)/2, y + 11.5);
  });
  y += 19;

  // ── 4. TABLE ────────────────────────────────────────────────────────────
  // Landscape cw=273 → proper widths
  const COLS = [
    { label:'Date',        w: 26, right: false },
    { label:'Particular',  w: 78, right: false },
    { label:'Type',        w: 28, right: false },
    { label:'Ref No.',     w: 30, right: false },
    { label:'Debit',       w: 36, right: true  },
    { label:'Credit',      w: 36, right: true  },
    { label:'Balance',     w: cw - 26 - 78 - 28 - 30 - 36 - 36, right: true },
  ];
  const RH = 7;

  const drawHeader = (yy: number) => {
    R(mg, yy, cw, RH, ...DK);
    S(8.5, true, ...WH);
    let cx = mg;
    COLS.forEach(col => {
      const tx = col.right
        ? cx + col.w - pdf.getTextWidth(col.label) - 2
        : cx + 2.5;
      pdf.text(col.label, tx, yy + 5);
      cx += col.w;
    });
  };

  drawHeader(y); y += RH;

  let rowCount = 0;
  ledger.forEach(e => {
    // New page if needed
    if (y > ph - 35) {
      pdf.addPage();
      y = 12;
      drawHeader(y); y += RH;
    }

    // Row bg alternate
    if (rowCount % 2 === 0) R(mg, y, cw, RH, 252, 252, 253);
    pdf.setDrawColor(230, 232, 235); pdf.setLineWidth(0.15);
    pdf.line(mg, y + RH, mg + cw, y + RH);

    const row = [
      fmtDate(e.date),
      (e.particular || '').slice(0, 34),
      e.type,
      e.refNo || '-',
      fmtAmt(e.debit),
      fmtAmt(e.credit),
      `Rs ${Math.abs(e.runningBalance).toLocaleString('en-IN')} ${e.runningBalance < 0 ? 'Cr' : 'Dr'}`,
    ];

    let cx = mg;
    row.forEach((val, i) => {
      const col = COLS[i];
      // Color coding
      if      (i === 4 && e.debit  > 0) S(8, true,  220, 38,  38);
      else if (i === 5 && e.credit > 0) S(8, true,  16,  185, 129);
      else if (i === 6)                  S(8, true,  ...OR);
      else                               S(8, false, ...DK);
      const tx = col.right ? cx + col.w - pdf.getTextWidth(val) - 2 : cx + 2.5;
      pdf.text(val, tx, y + 5);
      cx += col.w;
    });

    y += RH;
    rowCount++;
  });

  // ── 5. TOTAL ROW ────────────────────────────────────────────────────────
  pdf.setDrawColor(...OR); pdf.setLineWidth(0.7);
  pdf.line(mg, y, mg + cw, y); y += 2;
  R(mg, y, cw, RH + 1, 255, 247, 237);
  S(8.5, true, ...OR);
  const totRow = ['', 'TOTAL', '', '',
    fmtAmt(summary.totalInvoiced),
    fmtAmt(summary.totalReceived),
    `Rs ${Math.abs(summary.closingBalance).toLocaleString('en-IN')}`,
  ];
  let cx2 = mg;
  totRow.forEach((val, i) => {
    const col = COLS[i];
    const tx  = col.right ? cx2 + col.w - pdf.getTextWidth(val) - 2 : cx2 + 2.5;
    pdf.text(val, tx, y + 5.5);
    cx2 += col.w;
  });
  y += RH + 5;

  // ── 6. CLOSING BALANCE BOX ───────────────────────────────────────────────
  if (y > ph - 22) { pdf.addPage(); y = 12; }
  R(mg, y, cw, 16, ...OR);
  S(8.5, false, ...WH); pdf.text('Opening Balance:', mg + 5, y + 6.5);
  S(9.5, true,  ...WH);
  pdf.text(`Rs ${Math.abs(summary.openingBalance).toLocaleString('en-IN')}`, mg + 45, y + 6.5);
  S(8.5, false, ...WH); pdf.text('Closing Balance:', mg + 5, y + 13);
  S(9.5, true,  ...WH);
  const cb    = summary.closingBalance;
  pdf.text(`Rs ${Math.abs(cb).toLocaleString('en-IN')} ${cb < 0 ? '(Advance/Cr)' : '(Due/Dr)'}`, mg + 45, y + 13);
  const coName = company?.companyName || tenant.company || '';
  S(8, false, ...WH); pdf.text(coName, pw - mg - pdf.getTextWidth(coName), y + 6.5);
  S(7.5, false, ...WH);
  const auth = 'Authorized Signatory';
  pdf.text(auth, pw - mg - pdf.getTextWidth(auth), y + 13);
  y += 21;

  // ── 7. FOOTER ───────────────────────────────────────────────────────────
  pdf.setDrawColor(...OR); pdf.setLineWidth(0.4);
  pdf.line(mg, y, mg + cw, y);
  S(7, false, ...GR);
  pdf.text('This is a computer generated ledger statement.', mg, y + 4.5);
  pdf.text('Page 1', pw - mg - 12, y + 4.5);

  pdf.save(`Ledger_${tenant.name}_${today.replace(/\//g, '-')}.pdf`);
}
