import { useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, Shield, Loader2, Image } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export function ApproveSignatureModal({ invoice, company, onClose, onSuccess }) {
  const [loading,    setLoading]    = useState(false);
  const [approvedBy, setApprovedBy] = useState('Authorized Signatory');

  const hasSeal = !!(company?.sealUrl);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env?.VITE_API_URL || '';
      const res = await axios.post(`${apiBase}/api/invoices/${invoice.id}/approve`, {
        approvedBy,
      });
      toast.success('✅ Invoice approved!');
      onSuccess({ ...invoice, ...res.data.invoice, approved: true, approvedBy });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally { setLoading(false); }
  };

  const inp = {
    width:'100%', padding:'10px 14px', borderRadius:10,
    border:'1.5px solid #f0f2f5', fontSize:13, fontWeight:600,
    color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale:0.9, y:24, opacity:0 }} animate={{ scale:1, y:0, opacity:1 }} exit={{ scale:0.9, y:24, opacity:0 }}
        style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:520, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', background:'linear-gradient(135deg,#1a1a2e,#2d2d4e)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'rgba(249,115,22,0.2)', border:'1px solid rgba(249,115,22,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={20} color="#f97316"/>
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>Approve & Sign Invoice</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.5)', margin:'2px 0 0' }}>Invoice #{invoice.invoiceNo}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <X size={16}/>
          </button>
        </div>

        <div style={{ padding:24 }}>

          {/* Invoice Info */}
          <div style={{ background:'#f8f9fb', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:600, margin:0 }}>Party</p>
              <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:'2px 0 0' }}>{invoice.partyName}</p>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:600, margin:0 }}>Amount</p>
              <p style={{ fontSize:15, fontWeight:800, color:'#f97316', margin:'2px 0 0' }}>
                ₹ {Math.round(invoice.totalInvoice||0).toLocaleString('en-IN')}
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:600, margin:0 }}>Company</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#1a1a2e', margin:'2px 0 0' }}>{invoice.company}</p>
            </div>
          </div>

          {/* Approved By */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
              Approved By (Name)
            </label>
            <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
              style={inp} placeholder="Enter approver name..."/>
          </div>

          {/* Company Seal */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>
              Company Seal
            </label>

            {hasSeal ? (
              <div style={{ padding:'16px', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:12, display:'flex', alignItems:'center', gap:14 }}>
                <img src={company.sealUrl} alt="Seal" referrerPolicy="no-referrer"
                  style={{ width:56, height:56, objectFit:'contain', borderRadius:'50%', border:'2px solid #d1fae5', background:'#fff', padding:4 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#15803d', margin:0 }}>✅ Seal Ready</p>
                  <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>{company.companyName} — seal will be stamped on invoice</p>
                </div>
                <CheckCircle size={20} color="#10b981"/>
              </div>
            ) : (
              <div style={{ padding:'16px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:12, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'#fff', border:'2px dashed #fde68a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Image size={20} color="#f59e0b"/>
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#b45309', margin:0 }}>No seal uploaded</p>
                  <p style={{ fontSize:11, color:'#9ba8b5', margin:'3px 0 0' }}>
                    Go to <strong>Companies</strong> → upload company seal to stamp on invoices
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Approve Button */}
          <button onClick={handleApprove} disabled={loading}
            style={{
              width:'100%', padding:'14px', borderRadius:14,
              background:'linear-gradient(135deg,#f97316,#ea580c)',
              color:'#fff', border:'none', cursor: loading?'not-allowed':'pointer',
              fontFamily:'inherit', fontWeight:800, fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 4px 20px rgba(249,115,22,0.35)', opacity: loading?0.7:1,
            }}>
            {loading ? <Loader2 size={18} className="animate-spin"/> : <Shield size={18}/>}
            {loading ? 'Approving...' : '✅ Approve & Apply Seal'}
          </button>
          <p style={{ fontSize:10, color:'#c5cdd6', textAlign:'center', marginTop:8 }}>
            This action will approve and stamp the invoice with company seal
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}