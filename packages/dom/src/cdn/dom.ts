/**
 * CDN entry: a complete browser app-building surface as a global.
 *
 *   <script src="https://.../@fluixi/dom/dom.global.js"></script>
 *   const [count, setCount] = FluixiDOM.createSignal(0);
 *   FluixiDOM.render(() => App(), document.getElementById('root'));
 *
 * Self-contained: the dom runtime (render/insert/spread/createComponent/control
 * flow) AND the reactive API (createSignal/createMemo/createEffect/…) are bundled
 * in, so a single <script> gives you everything to build a reactive UI —
 * everything hangs off window.FluixiDOM.
 */
export * from '../lib/index.js';

// The short API first, because that is what the documentation teaches. A script tag
// has no imports, so whatever is not on the global does not exist for a CDN user —
// and until now `signal` was not, while every doc page opened with it.
export { signal, memo, effect } from '@fluixi/reactive/signal';
export { store } from '@fluixi/reactive/store';

// The tuple form stays. `signal` is the accessor `createSignal` returns with `.set`
// attached, so the two share their implementation and carrying both costs 65 bytes
// gzipped — measured, not assumed.
export {
  createSignal,
  createMemo,
  createEffect,
  createComputed,
  createRenderEffect,
  createRoot,
  createResource,
  createContext,
  useContext,
  onCleanup,
  batch,
  untrack,
} from '@fluixi/reactive/signal';
export { createStore } from '@fluixi/reactive/store';
