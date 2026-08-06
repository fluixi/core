/** Eager: above the fold, needed on first paint, so it stays in the entry chunk. */
export function Summary(props: { total: number }) {
  return (
    <section class="panel">
      <h2>Summary</h2>
      <p>Revenue this month: <strong>{props.total}</strong></p>
      <p><small>Eager — part of the entry chunk.</small></p>
    </section>
  );
}
