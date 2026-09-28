/**
 * A counter, as a custom element authored the standard way: a class, registered with
 * `customElements.define`.
 *
 * Every piece of the boundary is here: declared properties the page sets as attributes or
 * as JS properties, a `CustomEvent` the page listens to, and public methods any framework
 * can call through a ref. The count is `#private`; `render` and `emit` are protected.
 *
 * `render` runs once. The bindings in it (`() => this.step`) update the one text node they
 * belong to when a prop or the count changes; nothing re-renders.
 */
import { prop, typedElement } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';

/** What the element dispatches, for the consumer's handler types. */
export interface CounterEvents {
  change: { value: number };
}

const props = {
  /** Added on each click. Settable as `step="5"` or as `el.step = 5`. */
  step: prop.number(1),
  /** Shown before the number. */
  label: prop.string('Count'),
};

export class FxCounter extends typedElement(props) {
  #count = signal(0);

  protected override render(): unknown {
    return html`
      <div class="counter">
        <span>${() => this.label}</span>
        <output>${() => this.#count()}</output>
        <button @click=${() => this.increment()}>+${() => this.step}</button>
        <button @click=${() => this.reset()}>reset</button>
      </div>
    `;
  }

  /** Add `step`, and tell the page. */
  increment(): void {
    this.#count.set(this.#count() + this.step);
    this.emit('change', { value: this.#count() });
  }

  /** Back to zero. Public, so page code and other frameworks can call it. */
  reset(): void {
    this.#count.set(0);
  }
}

customElements.define('fx-counter', FxCounter);

declare global {
  interface HTMLElementTagNameMap {
    'fx-counter': FxCounter;
  }
}
