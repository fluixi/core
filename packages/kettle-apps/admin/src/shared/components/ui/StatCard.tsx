interface StatCardProps {
  label:   string;
  value:   string | number;
  icon?:   string;
  trend?:  string;
  color?:  'brand' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, icon, trend, color = 'brand' }: StatCardProps) {
  return (
    <div class={`stat-card stat-card--${color}`}>
      <div class="stat-card-header">
        <span class="stat-card-label">{label}</span>
        {icon && <span class="stat-card-icon">{icon}</span>}
      </div>
      <div class="stat-card-value">{value}</div>
      {trend && <div class="stat-card-trend">{trend}</div>}
    </div>
  );
}
