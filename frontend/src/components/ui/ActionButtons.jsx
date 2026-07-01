// buttons: [{ icon, title, onClick, color?, hbg?, show? }]
export function ActionButtons({ buttons, size = 15, btnSize = 30 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {buttons.filter(b => b.show !== false).map(({ icon: Ic, title, onClick, color = '#f97316', hbg = '#fff7ed' }) => (
        <button
          key={title}
          onClick={onClick}
          title={title}
          style={{
            width: btnSize, height: btnSize, borderRadius: 7,
            border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = hbg; e.currentTarget.style.color = color; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Ic size={size}/>
        </button>
      ))}
    </div>
  );
}
