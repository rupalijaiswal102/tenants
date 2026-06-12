import { Building2, CheckCircle, Globe } from 'lucide-react';

export default function CompanyStatsBar({ companies, statesCount }) {
  const cards = [
    { label: 'Total Entities',    value: companies.length,                          sub: 'All records',     Icon: Building2,    icoColor: '#f97316' },
    { label: 'Active Companies',  value: companies.filter(c => c.status).length,   sub: 'In operation',    Icon: CheckCircle,  icoColor: '#10b981' },
    { label: 'State Presence',    value: statesCount,                               sub: 'Regions covered', Icon: Globe,        icoColor: '#3b82f6' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 22 }}>
      {cards.map((s, i) => (
        <div key={s.label} style={{
          background: '#fff', borderRadius: 14, padding: '20px 20px 16px', position: 'relative', minHeight: 112,
          border: i === 0 ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
          boxShadow: i === 0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow= i===0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)'; }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ba8b5', margin: '0 0 10px', letterSpacing: '0.02em' }}>{s.label}</p>
          <p style={{ fontSize: 30, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-0.6px', lineHeight: 1.1 }}>{s.value}</p>
          <p style={{ fontSize: 11, color: '#b0b8c4', margin: '6px 0 0' }}>{s.sub}</p>
          <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
            <s.Icon size={28} color={s.icoColor} strokeWidth={1.5}/>
          </div>
        </div>
      ))}
    </div>
  );
}
