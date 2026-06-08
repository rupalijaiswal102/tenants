import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FormHeader({ mode, id, step, totalSteps, stepSub, loading, compressing, onSubmit }) {
  const navigate  = useNavigate();
  const basePath  = mode === 'otherParty' ? '/other-parties' : '/tenants';
  const isLastStep = step === totalSteps;

  const title = id
    ? (mode === 'otherParty' ? 'Update Other Party' : 'Update Tenant Record')
    : (mode === 'otherParty' ? 'Create Other Party' : 'Create New Tenant');

  const submitLabel = id
    ? 'Save Changes'
    : (mode === 'otherParty' ? 'Create Other Party' : 'Create Tenant');

  return (
    <div style={{ background:'#fff', borderBottom:'1px solid #e8edf4', position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

        {/* Left: back + title */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate(basePath)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:6, borderRadius:8, display:'flex' }}>
            <ArrowLeft size={18}/>
          </button>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>{title}</p>
            <p style={{ fontSize:10, color:'#94a3b8', margin:0, fontWeight:500 }}>
              Step {step} of {totalSteps} — {stepSub}
            </p>
          </div>
        </div>

        {/* Right: Cancel + Submit */}
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={() => navigate(basePath)}
            style={{ padding:'7px 16px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:12, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          {isLastStep && (
            <button onClick={onSubmit} disabled={loading || compressing}
              style={{ padding:'7px 18px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Save size={14}/>}
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
