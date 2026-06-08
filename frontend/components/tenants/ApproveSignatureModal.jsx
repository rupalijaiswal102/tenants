import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, RotateCcw, Pen, Shield, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
export function ApproveSignatureModal({ invoice, company, onClose, onSuccess }) {
  const canvasRef    = useRef(null);
  const [drawing,    setDrawing]    = useState(false);
  const [hasDrawn,   setHasDrawn]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [approvedBy, setApprovedBy] = useState('Authorized Signatory');
  const [lastPt,     setLastPt]     = useState({ x:0, y:0 });

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas);
    setDrawing(true);
    setLastPt(pos);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPt(pos);
    setHasDrawn(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApprove = async () => {
    if (!hasDrawn) { toast.error('Please draw your signature first'); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    setLoading(true);
    try {
      const signatureImage = canvas.toDataURL('image/png');
      const apiBase        = import.meta.env?.VITE_API_URL || '';
      const res = await axios.post(`${apiBase}/api/invoices/${invoice.id}/approve`, {
        approvedBy,
        signatureImage,
      });
      toast.success('✅ Invoice approved & signed!');
      onSuccess({ ...invoice, ...res.data.invoice, approved: true, signatureImage, approvedBy });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,y:24,opacity:0}} animate={{scale:1,y:0,opacity:1}} exit={{scale:0.9,y:24,opacity:0}}
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

          {/* Approved By field */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
              Approved By (Name)
            </label>
            <input value={approvedBy} onChange={e=>setApprovedBy(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:13, fontWeight:600, color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              placeholder="Enter approver name..."/>
          </div>

          {/* Signature Canvas */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:5 }}>
                <Pen size={11}/> Draw Your Signature *
              </label>
              <button type="button" onClick={clearCanvas}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, color:'#9ba8b5', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                <RotateCcw size={11}/> Clear
              </button>
            </div>
            <div style={{ border:`2px solid ${hasDrawn?'#10b981':'#e2e8f0'}`, borderRadius:12, overflow:'hidden', transition:'border-color 0.2s', background:'#fafbfd', cursor:'crosshair' }}>
              <canvas ref={canvasRef} width={460} height={120}
                style={{ width:'100%', height:120, display:'block', touchAction:'none' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
            </div>
            {!hasDrawn && (
              <p style={{ fontSize:10, color:'#c5cdd6', marginTop:5, textAlign:'center' }}>
                ✍️ Use mouse or touch to draw your signature above
              </p>
            )}
          </div>

          {/* Company Seal Preview */}
          {(company?.sealUrl || company?.logoUrl) && (
            <div style={{ marginBottom:16, padding:'10px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
              <img
                src={company?.sealUrl || company?.logoUrl}
                alt="Seal" referrerPolicy="no-referrer"
                style={{ width:40, height:40, objectFit:'contain', borderRadius:'50%', border:'1.5px solid #d1fae5' }}/>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#15803d', margin:0 }}>Company seal will be applied</p>
                <p style={{ fontSize:10, color:'#9ba8b5', margin:'2px 0 0' }}>{company.companyName}</p>
              </div>
              <CheckCircle size={16} color="#10b981" style={{ marginLeft:'auto' }}/>
            </div>
          )}

          {/* Approve Button */}
          <button onClick={handleApprove} disabled={loading || !hasDrawn}
            style={{
              width:'100%', padding:'14px', borderRadius:14,
              background: hasDrawn ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#e2e8f0',
              color: hasDrawn ? '#fff' : '#9ba8b5',
              border:'none', cursor: hasDrawn&&!loading ? 'pointer' : 'not-allowed',
              fontFamily:'inherit', fontWeight:800, fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all 0.2s', boxShadow: hasDrawn ? '0 4px 20px rgba(249,115,22,0.35)' : 'none',
            }}>
            {loading ? <Loader2 size={18} className="animate-spin"/> : <Shield size={18}/>}
            {loading ? 'Approving...' : '✅ Approve & Apply Signature'}
          </button>
          <p style={{ fontSize:10, color:'#c5cdd6', textAlign:'center', marginTop:8 }}>
            This action will digitally sign and stamp the invoice
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
