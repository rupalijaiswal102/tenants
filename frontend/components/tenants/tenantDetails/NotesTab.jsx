import { useState } from 'react';
import { MessageSquare, Trash2, Receipt, CalendarDays, Loader2, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { usePermission } from '../../../src/hooks/usePermission.js';
import { fmtINR as fmt, fmtDate, fmtDateTime } from '../../../src/utils/formatCurrency.js';

export default function NotesTab({ notes = [], notesLoading, onDelete }) {
  const { canDelete } = usePermission();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Delete this remark?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/report-remarks/${id}`);
      onDelete(id);
      toast.success('Remark deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (notesLoading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:240, gap:10 }}>
      <Loader2 size={28} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
      <p style={{ fontSize:12, fontWeight:600, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Loading notes…</p>
    </div>
  );

  return (
    <motion.div key="notes" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.18 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <StickyNote size={16} color="#f97316"/>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:'#1a1a2e', margin:0 }}>Report Notes</p>
            <p style={{ fontSize:11, color:'#9ba8b5', margin:0, fontWeight:500 }}>Remarks added from Reports page</p>
          </div>
        </div>
        <span style={{ padding:'4px 12px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:20, fontSize:11, fontWeight:700, color:'#f97316' }}>
          {notes.length} remark{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {notes.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:240, gap:12, color:'#9ba8b5' }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <MessageSquare size={24} strokeWidth={1.5}/>
          </div>
          <p style={{ fontSize:13, fontWeight:700, margin:0 }}>No remarks yet</p>
          <p style={{ fontSize:11, margin:0, textAlign:'center', maxWidth:240, lineHeight:1.6 }}>
            Add remarks from the <strong style={{ color:'#f97316' }}>Reports</strong> page by clicking the message icon on any invoice row.
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <AnimatePresence>
            {notes.map((note, idx) => (
              <motion.div key={note._id}
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20, height:0 }}
                transition={{ duration:0.18, delay: idx * 0.03 }}
                style={{
                  background:'#fff',
                  border:'1px solid #f0f2f5',
                  borderRadius:14,
                  padding:'14px 16px',
                  display:'flex',
                  gap:14,
                  alignItems:'flex-start',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
                }}>

                {/* Icon */}
                <div style={{ width:36, height:36, borderRadius:10, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                  <MessageSquare size={15} color="#f97316"/>
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  {/* Remark text */}
                  <p style={{ fontSize:13, color:'#1e293b', margin:'0 0 8px', lineHeight:1.6, wordBreak:'break-word' }}>
                    {note.text}
                  </p>

                  {/* Invoice chip + Date */}
                  <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    {note.invoice && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:20, fontSize:10, fontWeight:700, color:'#0369a1' }}>
                        <Receipt size={9}/> #{note.invoice.invoiceNo}
                        {note.invoice.billDate && <> · {fmtDate(note.invoice.billDate)}</>}
                        {note.invoice.totalInvoice > 0 && <> · ₹{fmt(note.invoice.totalInvoice)}</>}
                      </span>
                    )}
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', background:'#f8fafc', border:'1px solid #f0f2f5', borderRadius:20, fontSize:10, fontWeight:600, color:'#94a3b8' }}>
                      <CalendarDays size={9}/> {fmtDateTime(note.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Delete — Admin / Super Admin only */}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(note._id)}
                    disabled={deletingId === note._id}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#cbd5e1', padding:'4px', borderRadius:7, flexShrink:0, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}
                    onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}>
                    {deletingId === note._id
                      ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>
                      : <Trash2 size={14}/>}
                  </button>
                )}

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
