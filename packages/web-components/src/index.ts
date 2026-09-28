/**
 * Publish a Fluixi component as a standard custom element.
 *
 * The boundary, and nothing below it. Signals, effects, ownership, DOM insertion and
 * cleanup all come from `@fluixi/reactive` and `@fluixi/dom`; this package translates
 * between them and the four browser callbacks. It depends on both and neither depends
 * on it, so the direction stays reactive, then dom, then here, then the compiler.
 *
 * @example
 * ```ts
 * import { defineElement, prop } from '@fluixi/web-components';
 * import { html } from '@fluixi/dom';
 * import { signal } from '@fluixi/reactive/signal';
 *
 * defineElement('my-counter', ({ props, dispatch }) => {
 *   const count = signal(0);
 *   return html`
 *     <button @click=${() => { count.set(count() + 1); dispatch('change', { value: count() }); }}>
 *       ${() => count() + props.step()}
 *     </button>`;
 * }, { props: { step: prop.number(1) } });
 * ```
 */
export { HTMLReactiveElement, typedElement, defineElement, createElementClass } from './element.js';
export type { ElementOptions, ElementMixin, ElementConstructor, Host, Setup, ShadowOption, TypedElementClass } from './element.js';

export { prop } from './props.js';
export type { PropDeclaration, PropOptions, PropAccessors } from './props.js';

export { defineCustomElement, defineWhenUsed, isDefined } from './registry.js';
export type { DefineOptions } from './registry.js';

export { createDispatch } from './events.js';
export type { Dispatch, DispatchInit } from './events.js';

export { createTargets } from './targets.js';
export type { Targets } from './targets.js';

// The web-component vocabulary, over the same functions. See aliases.ts for why both
// names exist.
export {
  customElement,
  property,
  attribute,
  event,
  target,
  ref,
  slot,
} from './aliases.js';

// Typing an element for its consumers: HTMLElementTagNameMap and the JSX tag.
export type {
  PropValues,
  ElementOf,
  ElementAttributes,
  ForeignElementAttributes,
} from './types.js';
