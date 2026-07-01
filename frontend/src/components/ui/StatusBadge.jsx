import { PAYMENT_STATUS_STYLE } from '../../constants/index.js';

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS_STYLE[status] || { color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: s.bg, fontSize: 10, fontWeight: 700, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
      {status || 'Unknown'}
    </span>
  );
}
