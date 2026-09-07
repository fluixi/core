# @fluixi/devtools

Live inspector for the Fluixi reactive graph. Instrument `signal` / `memo` / `effect`, then render
the dependency graph and watch propagation animate — State → Memo → Effect, glitch-free, lazy.

```ts
import { createReactor, createGraphView, DEVTOOLS_CSS } from '@fluixi/devtools';

const reactor = createReactor();
reactor.run(({ createSignal, createMemo, createEffect }) => {
  const [count, setCount] = createSignal(0, { name: 'count' });
  const double = createMemo(() => count() * 2, undefined, { name: 'double' });
  createEffect(() => console.log(double()), { name: 'log' });
  setInterval(() => setCount((n) => n + 1), 1000);
});

const view = createGraphView(svgEl);
const tick = () => { reactor.sample(); view.update(reactor.graph); requestAnimationFrame(tick); };
tick();
```

## How it works

The instrumented `createSignal`/`createMemo`/`createEffect` wrap the real `@fluixi/reactive`
primitives. A read is a
subscription, so edges are recorded from actual reads — it's the genuine dependency graph, not a
reconstruction. Values are re-read untracked each frame and effects count their own re-runs, so the
inspector animates exactly as the core propagates.

## Watching an app you did not write

createReactor hands out its own primitives, so it only sees code written against them. observeGraph() sees an ordinary app: the runtime reports each node as it is made, and the graph fills from plain `import { signal } from '@fluixi/core'`. Call it before the app's modules load — a node made earlier is not in the graph.

```ts
import { observeGraph, createGraphView } from '@fluixi/devtools';
const observed = observeGraph();
await import('./src/main.js');
const view = createGraphView(svgEl);
const tick = () => { observed.sample(); view.update(observed.graph); requestAnimationFrame(tick); };
tick();
```

The same Map<number, RNode> the reactor produces, so createGraphView and anything else reading the graph does not care which made it. Dependencies are read off the core node, which already keeps its own sources and observers, so nothing is wrapped and no read is intercepted.

No write edges, because nothing records which computation was running when a setter fired. Render effects are left out — the dom layer makes one per binding. An unwatched runtime pays one null check per node creation and per recompute.

## Getting the graph somewhere else

serializeGraph flattens the graph to json — Sets become arrays, the live core node becomes version and state, the reader is dropped — and snapshotToRenderMap turns it back into something the view draws. sample() returns what moved, so a delta is the same call with those ids, and applySnapshot folds one into a graph already on screen.

installDevtoolsHook() is for a tool that cannot be imported by the app. It leaves a global behind; when the application's runtime loads it finds it and hands over its own registration function, so the graph is built from the app's copy of the framework rather than the tool's. It has to be installed before the app runs — a browser agent at document_start — because the runtime offers once. It works against a production build too, without names or locations.

```js
import { installDevtoolsHook } from '@fluixi/devtools';
const hook = installDevtoolsHook();          // before the app loads
// …the app runs…
hook.snapshot();                  // everything
hook.snapshot({ partial: true }); // only what moved since the last call
```

Read edges survive the trip; write edges do not exist on an observed graph, since nothing records which computation was running when a setter fired.

## Where a node came from

A graph node can carry an optional source: file, line and column of the place the author created it, plus the variable name when the source gave one. Every field optional, and the whole thing absent for a node the compiler did not see.

The compiler marks each creation site when `sourceLocations` is on, the mark names the file and position from the original source rather than the generated output, and the instrumented primitive takes the mark and keeps it on the node:

```ts
// what the compiler emits in development
globalThis.__fx_source?.("src/App.ts", 10, 15, "count");
const count = signal(0);
```

A renderer needs nothing else — no compiler, no source file, no ast — and file, line and column are enough for a host to decide how to open it. For example:

```ts
for (const node of reactor.graph.values()) {
  if (node.source) {
    console.log(node.label, `${node.source.file}:${node.source.line}:${node.source.column}`);
  }
}
```

The compiler wraps every component in a memo, so the graph sees the wrapper rather than the component. A node whose value carries a component's name reports its kind as `component` and takes that name as its label, so the graph reads `App` rather than `m5`. Nothing about the node changes — it is the same memo, with the same dependencies.

A component node's `source` is where its tag was written, which is where the node was made — the same meaning `source` has for every other kind. `declaredAt` is where the component itself was declared, which is usually another file. It stands in for `source` when nothing marked the tag, and two components sharing a name are reported without a location rather than with the wrong one.

### Making a node the compiler cannot see

For a primitive built at runtime, call `markReactiveSource` yourself immediately before it, since the next node created takes the mark:

```ts
import { markReactiveSource } from '@fluixi/devtools';

markReactiveSource('src/factory.ts', 8, 2, 'fromFactory');
const s = signal(0);
```

A production build should leave `sourceLocations` off and then carries none of it. One statement carries one mark, so `signal(compute(signal(1)))` labels the inner call and leaves the outer bare rather than giving it a location that is not its own.

## API

- `createReactor()` → `{ graph, run(setup), sample(), dispose() }`
- `observeGraph()` → `{ graph, sample(), detach() }`
- `installDevtoolsHook()` → the global a tool attaches through
- `serializeGraph(graph, now?, { ids, removed }?)` / `snapshotToRenderMap(snapshot)`
- `applySnapshot(graph, snapshot)` — fold a full snapshot or a delta into what is drawn
- `formatValue(value, limit?)` — a printable rendering of any value; never throws
- `createGraphView(svg)` → `{ update(graph, now?), clear() }`
- `DEVTOOLS_CSS` — default theme string (override the `fx-*` classes to restyle)
