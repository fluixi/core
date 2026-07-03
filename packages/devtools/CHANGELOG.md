# @fluixi/devtools

## 0.2.0-alpha.1

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`

## 0.2.0-alpha.0

### Minor Changes

- 9d4ca95: New package: `@fluixi/devtools` — a live inspector for the Fluixi reactive graph. `createReactor()`
  gives instrumented `createSignal` / `createMemo` / `createEffect` / `createStore` / `createResource`
  (same signatures as the core; an optional `{ name }` sets the graph label). `createGraphView(svg)`
  renders the dependency graph and animates propagation in real time:

  - read edges (solid) + **write edges** (dashed) — see effects feed back into signals
  - **click a node to inspect** it — value, real `version` + CLEAN/CHECK/DIRTY state, sources, observers, writes
  - async **resources** (loading → resolved) and **stores** graphed alongside signals/memos/effects
  - nodes are removed when their owning scope disposes (no stale-node leak)

  Edges come from real reads, so it's the actual graph, not a reconstruction.
