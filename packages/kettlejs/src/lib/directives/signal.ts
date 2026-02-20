/**
 * @fileoverview Signal directive for reactive rendering in KettleJS
 * @module @awc/kettlejs/directives/signal
 */

import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { noChange } from 'lit';
import { createEffect } from '@awc/reactive/signal';

/**
 * Signal accessor type - just a function that returns a value
 */
type SignalAccessor<T = unknown> = () => T;

/**
 * Signal directive for reactive rendering
 *
 * Automatically subscribes to signal changes and updates the DOM
 */
class SignalDirective extends Directive {
  private dispose?: () => void;
  private lastValue: unknown = noChange;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo.type !== PartType.CHILD &&
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY
    ) {
      throw new Error(
        'The `signal` directive must be used in text, attribute, or property bindings'
      );
    }
  }

  render(signalFn: SignalAccessor) {
    // Initial render
    return signalFn();
  }

  override update(part: any, [signalFn]: [SignalAccessor]) {
    // Clean up previous effect
    if (this.dispose) {
      this.dispose();
    }

    // Create effect to track signal changes
    this.dispose = createEffect(() => {
      const value = signalFn();
      if (value !== this.lastValue) {
        this.lastValue = value;
        // Trigger re-render
        part.setValue(value);
        part.commit();
      }
    });

    return noChange;
  }

  disconnected() {
    if (this.dispose) {
      this.dispose();
      this.dispose = undefined;
    }
  }

  reconnected() {
    // Effect will be recreated on next update
  }
}

/**
 * Signal directive for reactive rendering
 *
 * Automatically subscribes to signal changes and updates the DOM.
 * Use this when you want to optimize rendering of specific signal values.
 *
 * @param {() => T} signalFn - Signal accessor function to watch
 * @returns Directive instance
 *
 * @example
 * ```typescript
 * import { signal } from '@awc/kettlejs/directives';
 * import { createSignal } from '@awc/reactive';
 *
 * class MyElement extends LitElement {
 *   private [count] = createSignal(0);
 *
 *   render() {
 *     return html`<div>Count: ${signal(this.count)}</div>`;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With computed values
 * const [firstName] = createSignal('John');
 * const [lastName] = createSignal('Doe');
 * const fullName = () => `${firstName()} ${lastName()}`;
 *
 * html`<div>Name: ${signal(fullName)}</div>`;
 * ```
 *
 * @example
 * ```typescript
 * // In attributes
 * const [isActive] = createSignal(false);
 * html`<button class=${signal(() => isActive() ? 'active' : '')}>
 *   Click me
 * </button>`;
 * ```
 */
export const signal = directive(SignalDirective);

/**
 * Creates a signal directive with a transform function
 *
 * @template T, R
 * @param {() => T} signalFn - Signal accessor to watch
 * @param {(value: T) => R} transform - Transform function
 * @returns Directive instance
 *
 * @example
 * ```typescript
 * import { signalTransform } from '@awc/kettlejs/directives';
 *
 * const [count] = createSignal(0);
 * html`<div>${signalTransform(count, (n) => `Count: ${n}`)}</div>`;
 * ```
 */
export function signalTransform<T, R>(
  signalFn: () => T,
  transform: (value: T) => R
) {
  return signal(() => transform(signalFn()));
}

/**
 * Creates a signal directive that only updates when condition is true
 *
 * @template T
 * @param {() => T} signalFn - Signal accessor to watch
 * @param {(value: T) => boolean} condition - Condition function
 * @returns Directive instance
 *
 * @example
 * ```typescript
 * import { signalWhen } from '@awc/kettlejs/directives';
 *
 * const [value] = createSignal(0);
 * // Only updates when value is positive
 * html`<div>${signalWhen(value, (v) => v > 0)}</div>`;
 * ```
 */
export function signalWhen<T>(
  signalFn: () => T,
  condition: (value: T) => boolean
) {
  let lastValid: T | undefined;
  return signal(() => {
    const value = signalFn();
    if (condition(value)) {
      lastValid = value;
      return value;
    }
    return lastValid;
  });
}

/**
 * Combines multiple signals into a single directive
 *
 * @template T
 * @param {Array<() => T>} signals - Array of signal accessors
 * @param {(...values: T[]) => unknown} combiner - Combiner function
 * @returns Directive instance
 *
 * @example
 * ```typescript
 * import { combineSignals } from '@awc/kettlejs/directives';
 *
 * const [first] = createSignal('John');
 * const [last] = createSignal('Doe');
 * html`<div>${combineSignals([first, last], (f, l) => `${f} ${l}`)}</div>`;
 * ```
 */
export function combineSignals<T = unknown>(
  signals: Array<() => T>,
  combiner: (...values: T[]) => unknown
) {
  return signal(() => {
    const values = signals.map((s) => s());
    return combiner(...values);
  });
}
