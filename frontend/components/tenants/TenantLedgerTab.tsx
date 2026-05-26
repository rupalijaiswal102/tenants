import React from 'react';
import { Plus, Download, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type Tenant, type Company, type LedgerEntry, type LedgerSummary } from '../../src/types';
import { TypeBadge } from './TenantPrimitives';
import { formatCurrency } from '../../src/utils/formatCurrency';

const SC: React.CSSProperties = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };

interface Props {
  tenant:          Tenant;
  company?:        Company;
  ledgerData:      { ledger: LedgerEntry[]; summary: LedgerSummary } | null;
  ledgerLoading:   boolean;
  ledgerRef:       React.RefObject<HTMLDivElement>;
  exportingExcel:  boolean;
  exportingPDF:    boolean;
  onAdjustment:    () => void;
  onExportExcel:   () => void;
  onExportPDF:     () => void;
}

export function TenantLedgerTab({
  tenant, company, ledgerData, ledgerLoading, ledgerRef,
  exportingExcel, exportingPDF, onAdjustment, onExportExcel, onExportPDF,
}: Props) {
  return (
    <motion.div key="ld" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
      style={{ ...SC, overflow:'hidden' }} ref={ledgerRef}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {company?.logoUrl && (
            <img src={company.logoUrl} alt="Logo" referrerPolicy="no-referrer"
              style={{ width:36, height:36, borderRadius:8, objectFit:'contain', border:'1px solid #f0f2f5' }}/>
          )}
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Ledger</p>
            <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>Statement for {tenant.name} | {tenant.company}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { label:'Opening Bal', val: formatCurrency(ledgerData?.summary.openingBalance||0), style:{background:'#f8f9fb', border:'1px solid #f0f2f5', color:'#5a6474'} },
            { label:(ledgerData?.summary.closingBalance||0)<0?'Advance Bal':'Closing Bal', val: formatCurrency(Math.abs(ledgerData?.summary.closingBalance||0)), style:{background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316'} },
          ].map((b,i) => (
            <div key={i} style={{ padding:'8px 14px', borderRadius:10, textAlign:'center', ...b.style }}>
              <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{b.label}</p>
              <p style={{ fontSize:13, fontWeight:800, margin:0 }}>{b.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto', maxHeight:'55vh', overflowY:'auto' }}>
        {ledgerLoading ? (
          <div style={{ padding:60, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <Loader2 size={28} color="#f97316" style={{animation:'spin 1s linear infinite'}}/>
            <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:600 }}>Calculating Ledger...</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ position:'sticky', top:0, background:'#f8f9fb', zIndex:5 }}>
              <tr>
                {['Date','Particular','Ref No.','Debit','Credit','TDS','Running Balance'].map((h,i) => (
                  <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:['','','','#1a1a2e','#10b981','#8b5cf6','#1a1a2e'][i]||'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f0f2f5', textAlign:i>=3?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!ledgerData?.ledger.length ? (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#9ba8b5', fontSize:13 }}>No ledger entries found.</td></tr>
              ) : ledgerData.ledger.map(e => (
                <tr key={e.id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                  onMouseEnter={el=>(el.currentTarget as HTMLElement).style.background='#fafbfc'}
                  onMouseLeave={el=>(el.currentTarget as HTMLElement).style.background='transparent'}>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#9ba8b5', whiteSpace:'nowrap' }}>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#1a1a2e', margin:0 }}>{e.particular}</p>
                    <TypeBadge type={e.type}/>
                    {e.notes && <span style={{ fontSize:10, color:'#9ba8b5', fontStyle:'italic' }}> "{e.notes}"</span>}
                  </td>
                  <td style={{ padding:'11px 16px', fontSize:11, color:'#9ba8b5' }}>{e.refNo?`#${e.refNo}`:'-'}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#1a1a2e', textAlign:'right' }}>{e.debit>0?formatCurrency(e.debit):'-'}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right' }}>{e.credit>0?formatCurrency(e.credit):'-'}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#8b5cf6', textAlign:'right' }}>{e.tds>0?formatCurrency(e.tds):'-'}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:800, textAlign:'right', color:e.runningBalance<0?'#3b82f6':'#1a1a2e' }}>
                    {formatCurrency(Math.abs(e.runningBalance||0))} {e.runningBalance<0?'Cr':'Dr'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'14px 20px', background:'#fafbfc', borderTop:'1px solid #f0f2f5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:16 }}>
          {[
            {l:'Invoiced', v:ledgerData?.summary.totalInvoiced,  c:'#1a1a2e'},
            {l:'Received', v:ledgerData?.summary.totalReceived,  c:'#10b981'},
            {l:'TDS',      v:ledgerData?.summary.totalTds,       c:'#8b5cf6'},
            {l:'Balance',  v:Math.abs(ledgerData?.summary.closingBalance||0), c:'#f97316'},
          ].map((s,i) => (
            <div key={i}>
              <p style={{ fontSize:9, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', margin:0 }}>{s.l}</p>
              <p style={{ fontSize:13, fontWeight:800, color:s.c, margin:0 }}>{formatCurrency(s.v||0)}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onAdjustment} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, fontSize:11, fontWeight:700, color:'#b45309', cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={12}/> Adjustment
          </button>
          <button onClick={onExportExcel} disabled={exportingExcel} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fff', border:'1.5px solid #f0f2f5', borderRadius:9, fontSize:11, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
            {exportingExcel?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<Download size={12}/>} Excel
          </button>
          <button onClick={onExportPDF} disabled={exportingPDF} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {exportingPDF?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<FileText size={12}/>} PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}
