/**
 * CDN entry: the full build: the browser runtime with the template compiler in
 * front of it, so `` html`...` `` works on a page that has no build step.
 *
 *   <script src="https://.../@fluixi/template-runtime/fluixi.global.js"></script>
 *   const { html, render, signal } = Fluixi;
 *
 * `@fluixi/core`'s core.global.js is the runtime-only build under the same global
 * name: it is smaller and its `` html`` `` cannot work, because nothing compiled it.
 * Load one or the other.
 */
export { html, svg, define } from '../index.js';
export {
  render,
  hydrate,
  insert,
  For,
  Index,
  Show,
  Switch,
  Match,
  Portal,
  Dynamic,
  ErrorBoundary,
} from '@fluixi/dom';
export {
  signal,
  memo,
  effect,
  batch,
  resource,
  untrack,
  onCleanup,
  store
} from '@fluixi/reactive';
