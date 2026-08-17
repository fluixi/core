/** Deferred: `App` only ever writes `<Chart/>`, so the import can become a dynamic one. */
export function Chart() {
  return <div class="chart">chart-payload-marker</div>;
}
