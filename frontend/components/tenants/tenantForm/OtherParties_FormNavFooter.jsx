import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';

export default function FormNavFooter({ steps, currentStep, onPrev, onNext, onSubmit, loading, compressing, mode, id }) {
  const canPrev    = currentStep > 1;
  const canNext    = currentStep < steps.length;
  const isLastStep = currentStep === steps.length;

  const submitLabel = id
    ? 'Save Changes'
    : (mode === 'otherParty' ? 'Create Other Party' : 'Create Tenant');

  return (
    <div style={{ borderTop:'1px solid #f1f5f9', padding:'16px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafbfd' }}>

      {/* Previous */}
      <button type="button" onClick={onPrev} disabled={!canPrev}
        style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', fontFamily:'inherit', cursor: canPrev ? 'pointer' : 'default',
          background: canPrev ? '#fff' : 'transparent', border: canPrev ? '1.5px solid #e2e8f0' : 'none',
          borderRadius:10, fontSize:13, fontWeight:600, color: canPrev ? '#475569' : 'transparent' }}>
        <ArrowLeft size={14}/> Previous
      </button>

      {/* Dot indicators */}
      <div style={{ display:'flex', gap:6 }}>
        {steps.map(s => (
          <div key={s.id} style={{ height:6, borderRadius:4, transition:'all 0.3s',
            width: currentStep === s.id ? 20 : 6,
            background: currentStep >= s.id ? '#f97316' : '#e8edf4' }}/>
        ))}
      </div>

      {/* Next / Submit */}
      {canNext ? (
        <button type="button" onClick={onNext}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit' }}>
          Next <ArrowRight size={14}/>
        </button>
      ) : (
        <button type="button" onClick={onSubmit} disabled={loading || compressing}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(249,115,22,0.3)', fontFamily:'inherit', opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Save size={14}/>}
          {submitLabel}
        </button>
      )}
    </div>
  );
}
