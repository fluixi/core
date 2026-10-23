/**
 * CDN entry: the browser half of the surface, without the SSR renderer.
 *
 *   <script src="https://.../@fluixi/dom/dom-client.global.js"></script>
 *   const count = FluixiDOM.signal(0);
 *   FluixiDOM.render(() => App(), document.getElementById('root'));
 *
 * Same shape as `dom.global.js` and the same global name, minus the string renderer,
 * node serialisation, template parsing and the request context. A `<script>` tag
 * cannot tree-shake, so anything reachable from the entry ships, which makes the
 * server half pure weight for a page that renders in a browser. Measured against the
 * full build: 21.0 kB gzipped -> 12.2 kB.
 *
 * `hydrate` stays: a page hydrating server-rendered HTML runs in the browser, and it
 * is the one thing here that touches SSR output. Use `dom.global.js` if you actually
 * render to a string in the browser, which is rare outside tests.
 */
export {
  // rendering
  render,
  hydrate,
  insert,
  spread,
  createElement,
  createComponent,
  // attributes and properties
  setAttribute,
  setProperty,
  setClassName,
  setStyle,
  classMap,
  styleMap,
  delegateEvents,
  // control flow
  Show,
  For,
  Index,
  Switch,
  Match,
  Portal,
  Dynamic,
  ErrorBoundary,
  // lists
  mapArray,
  indexArray,
  keyArray,
} from '../lib/index.js';

export {
  // reactive primitives, the short API and the tuple form, as the full entry does
  signal,
  memo,
  effect,
  store,
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
} from '@fluixi/reactive';
