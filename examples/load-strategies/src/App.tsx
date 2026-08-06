/**
 * Not one component below is imported.
 *
 * `resolve` in vite.config.ts says *where* each tag comes from; the `load:` directive
 * says *when* its module is fetched. Location is the same everywhere so it lives in
 * config; timing varies per usage so it is written at the usage site. Fusing them —
 * `<Chart lazy="./Chart">` — would repeat the path at every usage and say nothing
 * about timing.
 *
 * Check the build output: `Summary` is in the entry chunk, the other three are not.
 */
import { createSignal } from '@fluixi/core';

export function App() {
  const [total] = createSignal(48_250);

  return (
    <main>
      <h1>load: strategies</h1>
      <p>Every component here is used without an import.</p>

      <Summary total={total()} />

      <ExportDialog load:interaction />

      <AuditLog load:media="(min-width: 1024px)" />

      <div class="spacer">scroll down — the chart below is fetched on approach</div>

      <RevenueChart load:visible="200px" />
    </main>
  );
}
