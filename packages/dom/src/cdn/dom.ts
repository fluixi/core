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
