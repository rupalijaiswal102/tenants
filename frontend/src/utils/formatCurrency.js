// ── Currency ──────────────────────────────────────────────────────────────────
export const fmtINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export function formatCurrency(amount, symbol = true) {
  const num = Math.round(Number(amount) || 0);
  return symbol ? `₹ ${num.toLocaleString('en-IN')}` : num.toLocaleString('en-IN');
}

export function formatCurrencyExact(amount, symbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `₹ ${formatted}` : formatted;
}

export function formatCompact(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num >= 10000000) return `₹ ${(num/10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹ ${(num/100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹ ${(num/1000).toFixed(1)}K`;
  return `₹ ${num.toLocaleString('en-IN')}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d || '—'; }
};

export const fmtDateShort = (d) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d || '—'; }
};

export const fmtDateTime = (d) => {
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return d || '—'; }
};
