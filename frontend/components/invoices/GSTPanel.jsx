import React from 'react';

export function GSTPanel({ register, setValue, watchApplyGst, watchedItems }) {
  const calcSubTotal = () =>
    watchedItems.reduce((a, i) => a + (Number(i.amount) || 0), 0);

  return (
    <div style={{ padding:'12px 14px', borderRadius:12, background:'#fff7ed', border:'1.5px solid rgba(249,115,22,0.25)' }}>
      {/* Toggle row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: watchApplyGst ? 12 : 0 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color:'#1a1a2e', margin:0 }}>Apply GST on this Invoice?</p>
          <p style={{ fontSize:10, color:'#9ba8b5', margin:'2px 0 0' }}>Toggle to include/exclude GST</p>
        </div>
        <label style={{ position:'relative', display:'inline-block', width:44, height:24, cursor:'pointer', flexShrink:0 }}>
          <input
            type="checkbox"
            {...register('applyGst')}
            style={{ opacity:0, width:0, height:0, position:'absolute' }}
            onChange={e => {
              const apply = e.target.checked;
              setValue('applyGst', apply);
              const sub = calcSubTotal();
              setValue('cgst', apply ? Number((sub * 0.09).toFixed(2)) : 0);
              setValue('sgst', apply ? Number((sub * 0.09).toFixed(2)) : 0);
            }}
          />
          <span style={{ position:'absolute', inset:0, borderRadius:12, transition:'0.3s', background: watchApplyGst ? '#f97316' : '#e2e8f0' }} />
          <span style={{ position:'absolute', left: watchApplyGst ? 22 : 2, top:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'0.3s' }} />
        </label>
      </div>

      {/* CGST / SGST inputs */}
      {watchApplyGst && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:4 }}>CGST (₹)</label>
            <input
              type="number" step="0.01" min="0"
              {...register('cgst', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none"
            />
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:4 }}>SGST (₹)</label>
            <input
              type="number" step="0.01" min="0"
              {...register('sgst', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
