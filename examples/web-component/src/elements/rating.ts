/**
 * A form control: a star rating that submits with its `<form>`.
 *
 * Built from the `FormAssociated` mixin over the typed base, so it is a class like the counter
 * with one extra layer. `value` reflects, so `fx-rating[value="0"]` can be styled, and an
 * effect keeps the form value and the validity in step with it. `required` makes an empty
 * rating block submission, the way `<input required>` does.
 *
 * Keyboard: the arrow keys move the rating. A disabled `<fieldset>` around it disables it.
 */
import { defineCustomElement, FormAssociated, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { effect } from '@fluixi/reactive/signal';

export interface RatingEvents {
  change: { value: number };
}

const ratingProps = {
  value: prop.number(0, { reflect: true }),
  max: prop.number(5),
  required: prop.boolean(false),
  label: prop.string('Rating'),
};

export class FxRating extends FormAssociated(typedElement(ratingProps)) {
  /** What `reset` returns to: the value the page wrote. */
  #initial = 0;

  protected override render(): unknown {
    this.#initial = this.value;
    effect(
      () => {
        this.setFormValue(this.value ? String(this.value) : null);
        this.setValidity(this.required && !this.value ? { valueMissing: true } : {}, 'Pick a rating');
      },
      undefined,
      { name: 'form value' },
    );

    return html`
      <span role="radiogroup" aria-label=${() => this.label} @keydown=${(e: KeyboardEvent) => this.#key(e)}>
        ${() =>
          Array.from({ length: this.max }, (_, i) => {
            const n = i + 1;
            return html`<button
              type="button"
              role="radio"
              aria-checked=${() => String(this.value === n)}
              aria-label=${() => `${n} of ${this.max}`}
              ?disabled=${() => this.formDisabled}
              @click=${() => this.select(n)}
            >${() => (n <= this.value ? '★' : '☆')}</button>`;
          })}
      </span>
    `;
  }

  /** Set the rating, within 0..max, and tell the page. Ignored while the form disables it. */
  select(value: number): void {
    if (this.formDisabled) return;
    this.value = Math.max(0, Math.min(this.max, value));
    this.emit('change', { value: this.value });
  }

  protected override resetValue(): void {
    this.value = this.#initial;
  }

  protected override restoreValue(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? Number(state) || 0 : 0;
  }

  #key(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    this.select(this.value + step);
  }
}

// The standard registry, through a helper that skips a name already defined. Standalone
// builds bundle a parent class into each file that extends it, so a page loading two of them
// runs this twice; `customElements.define` would throw the second time.
defineCustomElement('fx-rating', FxRating);

declare global {
  interface HTMLElementTagNameMap {
    'fx-rating': FxRating;
  }
  interface JSXCustomElements {
    'fx-rating': ElementAttributes<typeof ratingProps, RatingEvents> & { name?: string };
  }
}
