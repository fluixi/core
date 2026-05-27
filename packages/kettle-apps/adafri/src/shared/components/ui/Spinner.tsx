interface SpinnerProps {
  size?:  'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Loading…' }: SpinnerProps) {
  return (
    <div class={`spinner spinner-${size}`} role="status" aria-label={label}>
      <span class="sr-only">{label}</span>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div class="page-spinner">
      <Spinner size="lg" />
    </div>
  );
}
