const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compactFmt  = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const percentFmt  = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt     = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function fmtCurrency(value: number): string {
  return currencyFmt.format(value);
}

export function fmtCompact(value: number): string {
  return compactFmt.format(value);
}

export function fmtPercent(value: number): string {
  return percentFmt.format(value / 100);
}

export function fmtDate(iso: string): string {
  if(iso.length === 8) return dateFmt.format(new Date(iso.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")))
  return dateFmt.format(new Date(iso));
}

export function fmtDateRange(from: string, to: string): string {
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

export function fmtTrend(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function trendClass(pct: number, positiveIsGood = true): string {
  if (pct === 0) return 'trend-neutral';
  const isGood = positiveIsGood ? pct > 0 : pct < 0;
  return isGood ? 'trend-up' : 'trend-down';
}
