# @fluixi/devtools

## 0.2.0-alpha.5

### Patch Changes

- 128f233: SSR now bundles `@fluixi/core` instead of externalizing it, so `@fluixi/core/routes` reaches the routes plugin and an installed app gets its route tree rather than the "did not replace it" stub. `@fluixi/devtools` publishes its `./plugins` subpath, which the vite plugin needs to turn the reactive graph on.

## 0.2.0-alpha.4

### Patch Changes

- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.

## 0.2.0-alpha.3

### Minor Changes

- f5b4031: Each consumer of the graph now keeps its own cursor instead of sharing one drained queue, so updates are no longer lost when multiple tools watch the same page.
- e005759: Each element row in the tree now shows the tag that rendered it, the values writing into it with each binding's own line, and the line the element itself was written on.
- f1d153c: A snapshot says what the graph is. By the time a panel polls, the propagation is over and everything reads as settled.

  - `createTimeline` now shows what happened, grouped into commits. A write with nothing running came from a handler, and opens a commit. Filter, and a pause button.
  - Diffs are computed at the write, both sides in hand. An append reports the one row added, not every row after it. Each entry carries JSON for copying.
  - DOM targets now show the element and attribute a value writes, with the line, described rather than referenced so a removed subtree is not held alive.
  - `createDetailPanel` now shows one commit in full, dragged and resized.
  - `graphToJson` / `exportGraph` now exports the whole graph as JSON, referencing nodes by name.
  - The graph view now draws cards for bindings and setters behind a toggle, and its zoom ceiling now follows the size of the graph.

- f5b4031: `@fluixi/devtools` now uses a single colour table shared by all views and adds a draggable, resizable pane for long values, so colours are consistent across the graph, tree and inspector and a clipped value can be read in full.
- f5b4031: `@fluixi/devtools` now has a plugin seam, with directives and contexts as the first two plugins, exported from `@fluixi/devtools/plugins`.
- 5f6a72f: The component tree now shows a tag's props, rows are ordered the same way as the page, and the toolbar displays words instead of glyphs.
- ae9784f: A component now reports the props it was handed, the compiler records where each was written, and the inspector shows both.
- 17993da: The inspector now lists the tags a value writes inside, counting repeats, so users can see all instances where a signal is used within a component.

### Patch Changes

- e005759: A binding card is now drawn once per place, with an edge from each value that writes there, rather than once per reader.
- e005759: A component is now drawn once for every place the DOM names it, and a floating pane is resized from where the drag began.

## 0.2.0-alpha.2

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.

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
