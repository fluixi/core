import { html } from "@awc/kettlejs";

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active:   'success',
  paused:   'warning',
  archived: 'neutral',
  draft:    'info',
};

interface BadgeProps {
  label:     string;
  variant?:  BadgeVariant;
  status?:   string;
}

export function Badge({ label, variant, status }: BadgeProps) {
  const v = variant ?? (status ? STATUS_VARIANT[status] ?? 'neutral' : 'neutral');
  return <span class={`badge badge-${v}`}>{label}</span>;
}
export function LitBadge({ label, variant, status }: BadgeProps) {
  const v = variant ?? (status ? STATUS_VARIANT[status] ?? 'neutral' : 'neutral');
  return html`<span class=${`badge badge-${v}`}>${label}</span>`;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} status={status} />;
}
