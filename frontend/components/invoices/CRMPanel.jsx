import React from 'react';

export function CRMPanel({ register }) {
  return (
    <div style={{ background:'#f8f9fb', borderRadius:12, padding:'12px 14px', border:'1px solid #f0f2f5' }}>
      <p style={{ fontSize:10, fontWeight:800, color:'#1a1a2e', margin:'0 0 8px', display:'flex', alignItems:'center', gap:5 }}>
        <span>👤</span> CRM Contact Details
        <span style={{ fontSize:9, color:'#9ba8b5' }}>(Optional)</span>
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div>
          <label style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:3 }}>CRM Name</label>
          <input
            {...register('crmName')}
            placeholder="e.g. Rahul Sharma"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:3 }}>Phone</label>
            <input
              {...register('crmPhone')}
              placeholder="98765 43210"
              type="tel"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', display:'block', marginBottom:3 }}>Email</label>
            <input
              {...register('crmEmail')}
              placeholder="crm@company.com"
              type="email"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
