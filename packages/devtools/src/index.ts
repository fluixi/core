// @fluixi/devtools — live inspector for the Fluixi reactive graph.
// Instrumented signal/memo/effect register into a graph; createGraphView renders + animates the
// State → Memo → Effect propagation.
//
//   import { createReactor, createGraphView } from '@fluixi/devtools';
//
//   const reactor = createReactor();
//   reactor.run(({ createSignal, createMemo, createEffect }) => {
//     const [count, setCount] = createSignal(0, { name: 'count' });
//     const double = createMemo(() => count() * 2, { name: 'double' });
//     createEffect(() => console.log(double()), { name: 'log' });
//     setInterval(() => setCount((n) => n + 1), 1000);
//   });
//
//   const view = createGraphView(svgEl);
//   const tick = () => { reactor.sample(); view.update(reactor.graph); requestAnimationFrame(tick); };
//   tick();
export { createReactor, nodeVersion, nodeState } from './instrument.js';
export type { Reactor, ReactorApi, RNode, NodeKind, NodeState } from './instrument.js';
export { createGraphView, DEVTOOLS_CSS } from './graph-view.js';
export type { GraphView, GraphViewOptions } from './graph-view.js';
