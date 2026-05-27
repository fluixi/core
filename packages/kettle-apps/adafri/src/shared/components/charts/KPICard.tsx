import { fmtTrend, trendClass } from '../../utils/format.js';

interface KPICardProps {
  label:       string;
  value:       string;
  trend?:      number;
  icon?:       string;
  description?: string;
}

export function KPICard({ label, value, trend, icon, description }: KPICardProps) {
  return (
    <div class="kpi-card">
      <div class="kpi-header">
        {icon && <span class="kpi-icon" aria-hidden="true">{icon}</span>}
        <span class="kpi-label">{label}</span>
      </div>
      <div class="kpi-value">{value}</div>
      {trend !== undefined && (
        <div class={`kpi-trend ${trendClass(trend)}`}>
          <span class="kpi-trend-arrow">{trend > 0 ? '▲' : trend < 0 ? '▼' : '—'}</span>
          {fmtTrend(Math.abs(trend))} vs prev period
        </div>
      )}
      {description && <p class="kpi-description">{description}</p>}
    </div>
  );
}
