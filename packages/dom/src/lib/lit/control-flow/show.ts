// import { Accessor, createEffect } from '@awc/reactive';
// import {
//   ChildPart,
//   directive,
//   Directive,
//   PartInfo,
//   PartType,
// } from 'lit/directive.js';

// class ShowDirective extends Directive {
//   private dispose?: () => void;
//   private part!: ChildPart;
//   private value: unknown;

//   constructor(info: PartInfo) {
//     super(info);
//     if (info.type !== PartType.CHILD) {
//       throw new Error('show() can only be used in child expressions');
//     }
//   }

//   render(
//     _when: Accessor<boolean> | boolean,
//     _content: () => unknown,
//     _fallback?: () => unknown
//   ) {
//     const whenAccessor = typeof _when === 'function' ? _when : () => _when;

//     if (this.dispose) this.dispose();

//     this.dispose = createEffect(() => {
//       const next = whenAccessor() ? _content() : _fallback?.();

//       if (next !== this.value) {
//         this.value = next;
//         this.part?._$setValue(next);
//       }
//     });

//     return whenAccessor() ? _content() : _fallback?.();
//   }

//   override update(
//     part: ChildPart,
//     args: [
//       when: Accessor<boolean> | boolean,
//       content: () => unknown,
//       fallback?: () => unknown
//     ]
//   ) {
//     this.part = part;
//     return this.render(...args);
//   }

//   disconnected() {
//     this.dispose?.();
//     this.dispose = undefined;
//   }
// }

// /**
//  * Usage example
//  * ```ts
//  * ${show(
//  * () => user.loggedIn,
//  * () => html`Your content if condition meet...`,
//  * () => html`Fallback if unmeet...`
//  * )}
//  * ```
//  */
// export const $show = directive(ShowDirective);

/**
 * @fileoverview Show component for conditional rendering in KettleJS
 * @module @awc/kettlejs/control-flow/Show
 */

import { nothing } from 'lit';
import { Accessor, createMemo } from '@awc/reactive/signal';
import { isTruthy, normalizeAccessor, renderContent } from './utils.js';
import type { Component } from '@awc/dom';
/**
 * Props for the Show component
 * @template T - Type of the condition value when truthy
 */
export interface $ShowProps<T = any> {
  /**
   * Condition to evaluate - can be a value or an accessor function
   */
  when: T | Accessor<T> | undefined | null | false;

  /**
   * Fallback content to render when condition is falsy
   */
  fallback?: Component<T>;

  /**
   * Children to render when condition is truthy
   * Can be a function that receives the truthy value
   */
  children: Component<T>;
}

/**
 * Show component for conditional rendering
 *
 * Renders children when the condition is truthy, otherwise renders fallback.
 * Supports reactive conditions via accessor functions.
 *
 * @template T - Type of the condition value
 * @param {$ShowProps<T>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * // Basic usage
 * const MyComponent = () => {
 *   const [show, setShow] = createSignal(true);
 *
 *   return html`
 *     ${Show({
 *       when: show,
 *       children: html`<p>Visible when true</p>`
 *     })}
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With fallback
 * const MyComponent = () => {
 *   const [user, setUser] = createSignal<User | null>(null);
 *
 *   return html`
 *     ${Show({
 *       when: user,
 *       fallback: html`<p>Loading...</p>`,
 *       children: (u) => html`<p>Hello, ${u.name}!</p>`
 *     })}
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Keyed on value
 * const MyComponent = () => {
 *   const [data, setData] = createSignal<string | null>(null);
 *
 *   return html`
 *     ${Show({
 *       when: data,
 *       fallback: html`<p>No data</p>`,
 *       children: (value) => html`<div>Data: ${value}</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function $show<T>(props: $ShowProps<T>): any {
  return createMemo(() => {
    const whenAccessor = normalizeAccessor(props.when);
    const value = whenAccessor();
    console.log('memo show', value);

    if (isTruthy(value)) {
      if (typeof props.children === 'function') {
        return (props.children as Function)(value);
      }
      return props.children;
    }

    if (props.fallback !== undefined) {
      return renderContent(props.fallback);
    }
    return nothing;
  });
}
