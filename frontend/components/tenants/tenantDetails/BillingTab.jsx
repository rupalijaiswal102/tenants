import { Plus, Eye, History, Trash2, GitBranch } from 'lucide-react';
import { motion } from 'motion/react';
import { InvoiceStatusBadge } from '../TenantPrimitives.jsx';
import { usePermission } from '../../../src/hooks/usePermission.js';

const SC = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };

export default function BillingTab({ invoices = [], onPay, onView, onEdit, onDelete, onWorkflow }) {
  const { canEdit, canDelete, can } = usePermission('invoices');
  return (
    <motion.div key="inv" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      style={{ ...SC, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #f8f9fb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Billing History</p>
          <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>Complete record of generated invoices</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <InvoiceStatusBadge status="Paid"/>
          <InvoiceStatusBadge status="Partial"/>
          <InvoiceStatusBadge status="Pending"/>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8f9fb' }}>
              {['Inv No.','Bill Date','Total','Received','TDS','Balance','Status','Actions'].map((h, i) => (
                <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'2px solid #f0f2f5', whiteSpace:'nowrap',
                  textAlign: i >= 2 && i <= 5 ? 'right' : 'left',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#9ba8b5', fontSize:13 }}>No billing records found.</td></tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding:'11px 16px', fontSize:11, fontWeight:700, color:'#9ba8b5' }}>#{inv.invoiceNo}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{inv.billDate}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#1a1a2e', textAlign:'right' }}>₹{Math.round(inv.totalInvoice || 0).toLocaleString()}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#10b981', textAlign:'right' }}>₹{Math.round(inv.receivedAmount || inv.received || 0).toLocaleString()}</td>
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color:'#8b5cf6', textAlign:'right' }}>₹{Math.round(inv.tdsAmount || 0).toLocaleString()}</td>
                  {(() => { const bal = Math.max(0, Math.round(inv.balanceAmount || inv.balance || 0)); return (
                  <td style={{ padding:'11px 16px', fontSize:12, fontWeight:700, color: bal === 0 ? '#10b981' : '#ef4444', textAlign:'right' }}>₹{bal.toLocaleString()}</td>
                  ); })()}
                  {(() => {
                    const bal = Math.max(0, Math.round(inv.balanceAmount || inv.balance || 0));
                    const status = bal === 0 && (inv.totalInvoice || 0) > 0 ? 'Paid' : inv.paymentStatus;
                    return <td style={{ padding:'11px 16px' }}><InvoiceStatusBadge status={status}/></td>;
                  })()}
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                      {can('payment') && (
                        <button onClick={() => onPay(inv)} style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:700, color:'#15803d', display:'flex', alignItems:'center', gap:3, fontFamily:'inherit' }}>
                          <Plus size={11}/> Pay
                        </button>
                      )}
                      <button onClick={() => onView(inv)} style={{ padding:'4px 8px', background:'#f8f9fb', border:'1px solid #f0f2f5', borderRadius:6, cursor:'pointer', color:'#5a6474', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                        <Eye size={12}/>
                      </button>
                      {canEdit && (
                        <button onClick={() => onEdit(inv)} style={{ padding:'4px 8px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, cursor:'pointer', color:'#b45309', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                          <History size={12}/>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(inv)} style={{ padding:'4px 8px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:6, cursor:'pointer', color:'#e11d48', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                      <button onClick={() => onWorkflow && onWorkflow(inv)}
                        style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:6, cursor:'pointer', color:'#15803d', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', fontSize:10, fontWeight:700 }}>
                        <GitBranch size={11}/> Flow
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}