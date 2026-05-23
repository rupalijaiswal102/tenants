/**
 * formatCurrency — Rounds and formats amount in Indian currency style
 * ₹ 42696.00  → ₹ 42,696
 * ₹ 36183.47  → ₹ 36,183
 * ₹ 5000.90   → ₹ 5,001
 */
export function formatCurrency(amount: number | string | undefined | null, symbol = true): string {
  const num = Math.round(Number(amount) || 0);
  const formatted = num.toLocaleString('en-IN');
  return symbol ? `₹ ${formatted}` : formatted;
}

/**
 * formatCurrencyExact — 2 decimal places (for PDF/invoice lines)
 */
export function formatCurrencyExact(amount: number | string | undefined | null, symbol = true): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `₹ ${formatted}` : formatted;
}

/**
 * formatCompact — For dashboard large numbers
 * 1,23,456 → ₹ 1.23L
 */
export function formatCompact(amount: number | string | undefined | null): string {
  const num = Math.round(Number(amount) || 0);
  if (num >= 10000000) return `₹ ${(num/10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹ ${(num/100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹ ${(num/1000).toFixed(1)}K`;
  return `₹ ${num.toLocaleString('en-IN')}`;
}
