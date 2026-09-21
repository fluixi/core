/**
 * A counter, as a custom element.
 *
 * Every piece of the boundary is here: a declared property the page sets as an attribute
 * or as a JS property, a `CustomEvent` the page listens to, and a target for reading a
 * node back without a `querySelector` call. `targets` comes from the host, already scoped
 * to this element.
 *
 * Nothing about the body is web-component specific. `signal` and `html` are the same
 * ones an ordinary Fluixi component uses, and the binding updates the one text node it
 * belongs to rather than re-rendering.
 */
import { customElement, property } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';

/** Declared once, and reused below to type the element for its consumers. */
export const counterProps = {
  /** Added on each click. Settable as `step="5"` or as `el.step = 5`. */
  step: property.number(1),
  /** Shown before the number. */
  label: property.string('Count'),
};

/** What the element dispatches, for the consumer's handler types. */
export interface CounterEvents {
  change: { value: number };
}

customElement(
  'fx-counter',
  ({ props, dispatch, targets }) => {
    const count = signal(0);

    const bump = () => {
      count.set(count() + props.step());
      dispatch('change', { value: count() });
    };

    return html`
      <div class="counter">
        <span data-target="label">${() => props.label()}</span>
        <output data-target="value">${() => count()}</output>
        <button @click=${bump}>+${() => props.step()}</button>
        <button @click=${() => {
          // Reading a node through the target rather than querying the document.
          // Disposal is the owner's job, so nothing here has to be unregistered.
          const output = targets.get('value');
          if (output) output.textContent = '0';
          count.set(0);
        }}>reset</button>
      </div>
    `;
  },
  { props: counterProps },
);

declare global {
  interface HTMLElementTagNameMap {
    'fx-counter': HTMLElement & { step: number; label: string };
  }
}
