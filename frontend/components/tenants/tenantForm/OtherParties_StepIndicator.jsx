import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div
            onClick={() => onStepClick(s.id)}
            style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:10, background: currentStep === s.id ? 'rgba(249,115,22,0.08)' : 'transparent', transition:'all 0.15s' }}>

            {/* Circle */}
            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center',
              background: currentStep > s.id ? '#10b981' : currentStep === s.id ? '#f97316' : '#e8edf4' }}>
              {currentStep > s.id
                ? <CheckCircle2 size={15} color="#fff"/>
                : <span style={{ fontSize:11, fontWeight:800, color: currentStep === s.id ? '#fff' : '#94a3b8' }}>{s.id}</span>
              }
            </div>

            {/* Label */}
            <span style={{ fontSize:11, fontWeight:700, whiteSpace:'nowrap',
              color: currentStep === s.id ? '#f97316' : currentStep > s.id ? '#10b981' : '#94a3b8' }}>
              {s.title}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:2, minWidth:16, transition:'background 0.3s',
              background: currentStep > s.id ? '#10b981' : '#e8edf4' }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
