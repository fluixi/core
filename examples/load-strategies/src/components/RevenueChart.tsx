/**
 * `load:visible` — deliberately bulky so its chunk is obvious in the build output.
 * The padding stands in for a real charting dependency.
 */
const BULK = Array.from({ length: 300 }, (_, i) => `revenue-chart-payload-row-${i}`);

export function RevenueChart() {
  return (
    <section class="panel">
      <h2>Revenue chart</h2>
      <p>Fetched when it scrolled near the viewport.</p>
      <p><small>{BULK.length} rows of stand-in payload loaded.</small></p>
    </section>
  );
}
