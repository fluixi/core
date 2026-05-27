export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div class={`spinner spinner--${size}`} aria-label="Loading…" />;
}

export function PageSpinner() {
  return (
    <div class="page-spinner">
      <Spinner size="lg" />
    </div>
  );
}
