export function formatCurrency(amount, symbol = true) {
  const num = Math.round(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN');
  return symbol ? `₹ ${formatted}` : formatted;
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
