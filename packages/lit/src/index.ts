/**
 * @fluixi/lit — author UIs with lit-style `` html`...` `` templates that COMPILE
 * to @fluixi/dom runtime calls (via @fluixi/compiler's `format: 'lit'`). No lit
 * runtime ships: the template is turned into the same fine-grained code JSX
 * produces. This is the no-JSX authoring layer for Fluixi.
 *
 *   import { html, Show, For } from '@fluixi/lit';
 *
 *   function Counter() {
 *     const [n, set] = createSignal(0);
 *     return html`
 *       <button @click=${() => set(n() + 1)}>${n()}</button>
 *       <Show when=${n() > 5}><p>high</p></Show>
 *     `;
 *   }
 *
 * Enable in the build: `fluixi({ format: 'lit' })`.
 */
export { html, svg } from './html.js';
export type { TemplateResult, Reactive } from './types.js';

// Control flow + class/style helpers you use inside templates, re-exported from
// the dom runtime so a no-JSX app has a single import surface. The compiler also
// auto-imports control-flow tags used in a template, so importing these is only
// needed when you reference them directly in code.
export {
  Show,
  For,
  Index,
  Switch,
  Match,
  Dynamic,
  Portal,
  ErrorBoundary,
  classMap,
  styleMap,
} from '@fluixi/dom';
export type {
  ShowProps,
  ForProps,
  IndexProps,
  SwitchProps,
  MatchProps,
  DynamicProps,
  PortalProps,
  ErrorBoundaryProps,
  ClassMapInput,
  StyleMapInput,
} from '@fluixi/dom';
