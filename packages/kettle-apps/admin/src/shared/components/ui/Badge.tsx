export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children?: any;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span class={`badge badge-${variant}`}>{children}</span>;
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}
