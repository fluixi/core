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
- `createGraphView(svg)` → `{ update(graph, now?), clear() }`
- `DEVTOOLS_CSS` — default theme string (override the `fx-*` classes to restyle)
