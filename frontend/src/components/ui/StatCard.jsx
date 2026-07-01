export default function StatCard({ label, value, sub, icon: Icon, iconColor, highlighted = false }) {
  const baseShadow = highlighted
    ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)'
    : '0 1px 4px rgba(0,0,0,0.04)';

  return (
    <div
      style={{
        background: '#fff', borderRadius: 14, padding: '20px 20px 16px',
        position: 'relative', minHeight: 108,
        border: highlighted ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
        boxShadow: baseShadow, transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = baseShadow;
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9ba8b5', margin: '0 0 10px', letterSpacing: '0.02em' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#b0b8c4', margin: '6px 0 0' }}>{sub}</p>}
      {Icon && (
        <div style={{ position: 'absolute', bottom: 14, right: 16 }}>
          <Icon size={26} color={iconColor} strokeWidth={1.5}/>
        </div>
      )}
    </div>
  );
}
