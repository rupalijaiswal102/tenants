// icon: Lucide component, title, subtitle
export default function EmptyState({ icon: Icon, title = 'No data found', subtitle = 'Try adjusting your filters', minHeight = 200 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight, padding: '40px 24px', gap: 10 }}>
      {Icon && <Icon size={40} color="#e0e4ea" strokeWidth={1.5}/>}
      <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 12, color: '#c5cdd6', margin: 0, textAlign: 'center' }}>{subtitle}</p>}
    </div>
  );
}
