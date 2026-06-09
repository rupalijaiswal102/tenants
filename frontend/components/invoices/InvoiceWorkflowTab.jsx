import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import {
  CheckCircle2, Clock, Lock, ChevronRight, User,
  FileText, Mail, Truck, IndianRupee, BookOpen,
  RotateCcw, AlertCircle, Loader2, Plus
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────
const STEPS = [
  { key:'GENERATED',        label:'Invoice Generated',      icon: FileText,    role:'MDO',      color:'#6366f1' },
  { key:'APPROVED',         label:'Approved & Signed',      icon: CheckCircle2,role:'Accounts', color:'#10b981' },
  { key:'TALLY_ENTRY',      label:'Tally Entry Completed',  icon: BookOpen,    role:'Accounts', color:'#8b5cf6' },
  { key:'EMAIL_SENT',       label:'Email Sent',             icon: Mail,        role:'MDO',      color:'#f59e0b' },
  { key:'DISPATCHED',       label:'Hard Copy Dispatched',   icon: Truck,       role:'CRM',      color:'#0ea5e9' },
  { key:'PAYMENT_RECEIVED', label:'Payment Received',       icon: IndianRupee, role:'MDO',      color:'#10b981' },
  { key:'TALLY_RECEIPT',    label:'Tally Receipt Posted',   icon: BookOpen,    role:'Accounts', color:'#8b5cf6' },
];

const ROLE_PERMISSIONS = {
  MDO:      ['GENERATED','EMAIL_SENT','PAYMENT_RECEIVED'],
  Accounts: ['APPROVED','TALLY_ENTRY','TALLY_RECEIPT'],
  CRM:      ['DISPATCHED'],
  Admin:       STEPS.map(s => s.key),
  'Super Admin': STEPS.map(s => s.key),
};

const STATUS_COLORS = {
  'Draft':            { bg:'#f8fafc', color:'#94a3b8', border:'#e2e8f0' },
  'Pending Approval': { bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
  'Approved':         { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
  'Tally Pending':    { bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe' },
  'Email Sent':       { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
  'Dispatched':       { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  'Partially Paid':   { bg:'#fef9c3', color:'#854d0e', border:'#fef08a' },
  'Paid':             { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
};

// ── Meta input fields per step ────────────────────────────────────────────────
const STEP_META = {
  TALLY_ENTRY:      [{ key:'tallyVoucherId', label:'Tally Voucher ID', placeholder:'e.g. JV-2026-001' }],
  EMAIL_SENT:       [{ key:'emailSentTo',    label:'Sent To Email',    placeholder:'tenant@example.com' }],
  DISPATCHED:       [
    { key:'dispatchMode', label:'Dispatch Mode', placeholder:'Courier / Hand / Post' },
    { key:'dispatchRef',  label:'Tracking / Ref No.', placeholder:'e.g. BL12345678IN' },
  ],
  PAYMENT_RECEIVED: [{ key:'paymentRef', label:'Payment Ref (UTR/Cheque)', placeholder:'e.g. UTR123456' }],
  TALLY_RECEIPT:    [{ key:'tallyReceiptId', label:'Tally Receipt ID', placeholder:'e.g. REC-2026-001' }],
};

export default function InvoiceWorkflowTab({ invoice, userRole = 'MDO', userName = 'User' }) {
  const [workflow,    setWorkflow]    = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [activeStep,  setActiveStep] = useState(null); // step key being actioned
  const [notes,       setNotes]      = useState('');
  const [metaFields,  setMetaFields] = useState({});
  const [submitting,  setSubmitting] = useState(false);

  const invoiceId = String(invoice?.id || invoice?._id || '');

  const fetchWorkflow = async (signal) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/workflow/${invoiceId}`, { signal });
      setWorkflow(data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      toast.error(err.response?.data?.error || 'Failed to load workflow');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!invoiceId) return;
    const controller = new AbortController();
    fetchWorkflow(controller.signal);
    return () => controller.abort();
  }, [invoiceId]);

  const canDo = (stepKey) => {
    // Admin can do everything
    if (userRole === 'Admin' || userRole === 'Super Admin') return true;
    const perms = ROLE_PERMISSIONS[userRole] || [];
    return perms.includes(stepKey);
  };

  const handleComplete = async (stepKey) => {
    try {
      setSubmitting(true);
      await axios.post(`/api/workflow/${invoiceId}/complete`, {
        step:  stepKey,
        notes: notes || '',
        ...metaFields,
      });
      toast.success(`✅ ${STEPS.find(s=>s.key===stepKey)?.label} completed!`);
      setActiveStep(null);
      setNotes('');
      setMetaFields({});
      fetchWorkflow(new AbortController().signal);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete step');
    } finally { setSubmitting(false); }
  };

  const handleUndo = async (stepKey) => {
    if (!confirm('Undo this step?')) return;
    try {
      await axios.post(`/api/workflow/${invoiceId}/undo`, { step: stepKey });
      toast.success('Step undone');
      fetchWorkflow(new AbortController().signal);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to undo'); }
  };

  const statusStyle = STATUS_COLORS[workflow?.currentStatus] || STATUS_COLORS['Draft'];

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:300, gap:10 }}>
      <Loader2 size={24} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
      <span style={{ fontSize:13, color:'#9ba8b5' }}>Loading workflow...</span>
    </div>
  );

  const completedSet = new Set(workflow?.completedSteps || []);
  const progress = Math.round((completedSet.size / STEPS.length) * 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Status Header ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <p style={{ fontSize:11, color:'#9ba8b5', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Current Status</p>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
            <span style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:800, background:statusStyle.bg, color:statusStyle.color, border:`1.5px solid ${statusStyle.border}` }}>
              {workflow?.currentStatus || 'Draft'}
            </span>
            <span style={{ fontSize:11, color:'#9ba8b5' }}>
              {completedSet.size}/{STEPS.length} steps completed
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ flex:1, maxWidth:280 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:10, color:'#9ba8b5', fontWeight:600 }}>Progress</span>
            <span style={{ fontSize:10, color:'#f97316', fontWeight:800 }}>{progress}%</span>
          </div>
          <div style={{ height:8, background:'#f0f2f5', borderRadius:8, overflow:'hidden' }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:0.5 }}
              style={{ height:'100%', background:'linear-gradient(90deg,#f97316,#ea580c)', borderRadius:8 }}/>
          </div>
        </div>
      </div>

      {/* ── Timeline Steps ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #f8f9fb' }}>
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Workflow Timeline</p>
          <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>Track invoice progress through approval pipeline</p>
        </div>

        <div style={{ padding:'8px 0' }}>
          {STEPS.map((step, idx) => {
            const done     = completedSet.has(step.key);
            const canAct   = canDo(step.key) && !done;
            const isActive = activeStep === step.key;
            const logEntry = workflow?.auditLog?.find(l => l.step === step.key);
            const Icon     = step.icon;
            const isNext   = !done && STEPS.slice(0, idx).every(s => completedSet.has(s.key));

            return (
              <div key={step.key}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16, padding:'16px 24px',
                  background: isActive ? '#fffbeb' : isNext ? '#fafbfc' : 'transparent',
                  borderLeft: done ? `3px solid ${step.color}` : isNext ? '3px solid #fde68a' : '3px solid transparent',
                  transition:'all 0.15s' }}>

                  {/* Icon circle */}
                  <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', marginTop:2,
                    background: done ? step.color : isNext ? '#fff7ed' : '#f8f9fb',
                    border: done ? `2px solid ${step.color}` : isNext ? '2px solid #fde68a' : '2px solid #f0f2f5',
                    boxShadow: done ? `0 4px 12px ${step.color}30` : 'none' }}>
                    {done
                      ? <CheckCircle2 size={18} color="#fff"/>
                      : <Icon size={17} color={isNext ? '#f97316' : '#c5cdd6'}/>
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:done?800:600, color: done?'#1a1a2e': isNext?'#f97316':'#9ba8b5' }}>
                        {step.label}
                      </span>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10, textTransform:'uppercase',
                        background: step.role==='Accounts'?'#f5f3ff':step.role==='CRM'?'#eff6ff':'#fff7ed',
                        color:      step.role==='Accounts'?'#7c3aed':step.role==='CRM'?'#1d4ed8':'#c2410c' }}>
                        {step.role}
                      </span>
                      {isNext && !done && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'#fef9c3', color:'#854d0e' }}>NEXT</span>}
                    </div>

                    {done && logEntry && (
                      <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <User size={11} color="#9ba8b5"/>
                          <span style={{ fontSize:11, color:'#1a1a2e', fontWeight:600 }}>{logEntry.userName}</span>
                          <span style={{ fontSize:10, color:'#9ba8b5' }}>({logEntry.userRole})</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <Clock size={11} color="#9ba8b5"/>
                          <span style={{ fontSize:11, color:'#9ba8b5' }}>
                            {new Date(logEntry.completedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        {logEntry.notes && <span style={{ fontSize:10, color:'#9ba8b5', fontStyle:'italic' }}>"{logEntry.notes}"</span>}
                      </div>
                    )}

                    {!done && !canAct && (
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                        <Lock size={11} color="#c5cdd6"/>
                        <span style={{ fontSize:11, color:'#c5cdd6' }}>Requires {step.role} role</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {done && userRole === 'Admin' && (
                      <button onClick={() => handleUndo(step.key)}
                        style={{ padding:'4px 10px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:8, cursor:'pointer', fontSize:10, fontWeight:700, color:'#e11d48', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                        <RotateCcw size={11}/> Undo
                      </button>
                    )}
                    {canAct && (
                      <button onClick={() => setActiveStep(isActive ? null : step.key)}
                        style={{ padding:'6px 16px', background: isActive?'#fff7ed':'#f97316', border: isActive?'1.5px solid #fde68a':'none', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700, color: isActive?'#b45309':'#fff', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', boxShadow: isActive?'none':'0 2px 8px rgba(249,115,22,0.25)' }}>
                        <Plus size={12}/> {isActive ? 'Cancel' : 'Mark Done'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Action form */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                      style={{ overflow:'hidden' }}>
                      <div style={{ padding:'16px 24px 20px 80px', background:'#fffbeb', borderBottom:'1px solid #fde68a' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                          {(STEP_META[step.key] || []).map(field => (
                            <div key={field.key}>
                              <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:4 }}>{field.label}</label>
                              <input value={metaFields[field.key] || ''} onChange={e => setMetaFields(p => ({...p,[field.key]:e.target.value}))}
                                placeholder={field.placeholder}
                                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #fde68a', borderRadius:8, fontSize:12, fontFamily:'inherit', background:'#fff', outline:'none', boxSizing:'border-box' }}/>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:4 }}>Notes (Optional)</label>
                          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add any remarks..."
                            style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #fde68a', borderRadius:8, fontSize:12, fontFamily:'inherit', resize:'none', background:'#fff', outline:'none', boxSizing:'border-box' }}/>
                        </div>
                        <button onClick={() => handleComplete(step.key)} disabled={submitting}
                          style={{ padding:'8px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, opacity: submitting?0.7:1 }}>
                          {submitting ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> : <CheckCircle2 size={13}/>}
                          Confirm — {step.label}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div style={{ marginLeft:43, width:2, height:8, background: done?step.color:'#f0f2f5' }}/>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Audit Log ── */}
      {workflow?.auditLog?.length > 0 && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', overflow:'hidden' }}>
          <div style={{ padding:'14px 24px', borderBottom:'1px solid #f8f9fb' }}>
            <p style={{ fontSize:13, fontWeight:800, color:'#1a1a2e', margin:0 }}>Audit Log</p>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8f9fb' }}>
                  {['Step','Completed By','Role','Date & Time','Notes'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', fontSize:9, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #f0f2f5', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...workflow.auditLog].reverse().map((log, i) => {
                  const step = STEPS.find(s => s.key === log.step);
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #f8f9fb' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background: step?.color || '#f97316', flexShrink:0 }}/>
                          <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>{log.stepLabel}</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 16px', fontSize:12, fontWeight:600, color:'#1a1a2e' }}>{log.userName}</td>
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'#f8f9fb', color:'#5a6474' }}>{log.userRole}</span>
                      </td>
                      <td style={{ padding:'11px 16px', fontSize:11, color:'#9ba8b5', whiteSpace:'nowrap' }}>
                        {new Date(log.completedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td style={{ padding:'11px 16px', fontSize:11, color:'#9ba8b5', fontStyle: log.notes?'normal':'italic' }}>
                        {log.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}