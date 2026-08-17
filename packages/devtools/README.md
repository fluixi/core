# @fluixi/devtools

Live inspector for the Fluixi reactive graph. Instrument `signal` / `memo` / `effect`, then render
the dependency graph and watch propagation animate — State → Memo → Effect, glitch-free, lazy.

```ts
import { createReactor, createGraphView, DEVTOOLS_CSS } from '@fluixi/devtools';

const reactor = createReactor();
reactor.run(({ createSignal, createMemo, createEffect }) => {
  const [count, setCount] = createSignal(0, { name: 'count' });
  const double = createMemo(() => count() * 2, { name: 'double' });
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

## API

- `createReactor()` → `{ graph, run(setup), sample(), dispose() }`
- `createGraphView(svg)` → `{ update(graph, now?), clear() }`
- `DEVTOOLS_CSS` — default theme string (override the `fx-*` classes to restyle)
