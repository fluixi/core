/**
 * Inheritance: a counter that stops at `max`.
 *
 * It extends `FxCounter` like any class. The props spread the parent's, which TypeScript
 * needs to keep the static side compatible, and `declare max` types the new one on the
 * instance. `increment` is overridden and calls `super` when there is room.
 */
import { defineCustomElement, prop, type ElementAttributes } from '@fluixi/web-components';
import { FxCounter, counterProps, type CounterEvents } from './counter.js';

export interface BoundedCounterEvents extends CounterEvents {
  /** Fired instead of `change` when a click would pass `max`. */
  limit: { max: number };
}

const boundedProps = { ...counterProps, max: prop.number(10) };

export class FxBoundedCounter extends FxCounter {
  static override props = boundedProps;
  declare max: number;

  override increment(): void {
    if (this.count + this.step > this.max) {
      this.emit('limit', { max: this.max });
      return;
    }
    super.increment();
  }
}

// The standard registry, through a helper that skips a name already defined. Standalone
// builds bundle a parent class into each file that extends it, so a page loading two of them
// runs this twice; `customElements.define` would throw the second time.
defineCustomElement('fx-bounded-counter', FxBoundedCounter);

declare global {
  interface HTMLElementTagNameMap {
    'fx-bounded-counter': FxBoundedCounter;
  }
  interface JSXCustomElements {
    'fx-bounded-counter': ElementAttributes<typeof boundedProps, BoundedCounterEvents>;
  }
}
