import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function DeleteInvoiceModal({ invoice, onCancel, onConfirm }) {
  if (!invoice) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
      <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }}
        style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'#fff1f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Trash2 size={22} color="#e11d48"/>
        </div>
        <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' }}>Delete Invoice?</p>
        <p style={{ fontSize:12, color:'#9ba8b5', margin:'0 0 20px' }}>
          Invoice <strong>#{invoice.invoiceNo}</strong> will be permanently removed.
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:10, borderRadius:10, border:'1.5px solid #f0f2f5', background:'#fff', fontSize:13, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(invoice.id)}
            style={{ flex:1, padding:10, borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
