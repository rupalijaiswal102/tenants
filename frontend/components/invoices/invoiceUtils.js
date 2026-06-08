// ── Shared Invoice Utilities ─────────────────────────────────────────────────

export function numberToWords(num) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convert(n) {
    if (n < 20)      return units[n];
    if (n < 100)     return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000)    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000)  return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000)return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }

  return convert(Math.floor(num));
}

export function getMonthDefaults() {
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const lastDay    = new Date(year, month + 1, 0).getDate();
  const mm         = String(month + 1).padStart(2, '0');

  return {
    currentMonthName: monthNames[month],
    currentYear:      year,
    fromDate:         `${year}-${mm}-01`,
    toDate:           `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}
