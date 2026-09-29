/**
 * A counter, as a custom element authored the standard way: a class, registered in the
 * browser's custom element registry.
 *
 * Every piece of the boundary is here: declared properties the page sets as attributes or
 * as JS properties, a `CustomEvent` the page listens to, and public methods any framework
 * can call through a ref. The count is `#private`; `render` and `emit` are protected.
 *
 * `render` runs once. The bindings in it (`() => this.step`) update the one text node they
 * belong to when a prop or the count changes; nothing re-renders.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { effect, signal } from '@fluixi/reactive/signal';
import { Accent, Theme } from '../context.js';

/** What the element dispatches, for the consumer's handler types. */
export interface CounterEvents {
  change: { value: number };
}

export const counterProps = {
  /** Added on each click. Settable as `step="5"` or as `el.step = 5`. */
  step: prop.number(1),
  /** Shown before the number. */
  label: prop.string('Count'),
};

export class FxCounter extends typedElement(counterProps) {
  #count = signal(0);

  protected override render(): unknown {
    // From the app, through context. `data-theme` and `--accent` are what the page CSS reads.
    const theme = this.consume(Theme);
    const accent = this.consume(Accent);
    effect(
      () => {
        this.dataset.theme = theme()();
        this.style.setProperty('--accent', accent()());
      },
      undefined,
      { name: 'theme' },
    );

    return html`
      <div class="counter">
        <span>${() => this.label}</span>
        <output>${() => this.#count()}</output>
        <button @click=${() => this.increment()}>+${() => this.step}</button>
        <button @click=${() => this.reset()}>reset</button>
      </div>
    `;
  }

  /** The current count. Read-only from outside: it changes through the methods. */
  get count(): number {
    return this.#count();
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

// The standard registry, through a helper that skips a name already defined. Standalone
// builds bundle a parent class into each file that extends it, so a page loading two of them
// runs this twice; `customElements.define` would throw the second time.
defineCustomElement('fx-counter', FxCounter);

declare global {
  interface HTMLElementTagNameMap {
    'fx-counter': FxCounter;
  }
  interface JSXCustomElements {
    'fx-counter': ElementAttributes<typeof counterProps, CounterEvents>;
  }
}
