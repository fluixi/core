/**
 * A disclosure, to show the other half of the boundary: a shadow root and real slots.
 *
 * `static shadow = 'open'` attaches the root and `static styles` goes inside it, so the
 * styles cannot leak out. The page writes its own markup as children and the browser
 * distributes it: `<span slot="summary">` lands where `<slot name="summary">` says it does.
 *
 * `open` reflects, so the page can style `fx-disclosure[open]` and devtools shows the
 * current state.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { html } from '@fluixi/dom';

export interface DisclosureEvents {
  toggle: { open: boolean };
}

const disclosureProps = {
  /** Reflected, so `[open]` matches in CSS. */
  open: prop.boolean(false, { reflect: true }),
  /** Used when no `summary` slot is given. */
  summary: prop.string('Details'),
};

export class FxDisclosure extends typedElement(disclosureProps) {
  static override shadow = 'open' as const;
  static override styles = `
    :host { display: block; }
    .summary { all: unset; display: block; cursor: pointer; font-weight: 600; }
    .summary:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .body[hidden] { display: none; }
  `;

  protected override render(): unknown {
    return html`
      <button type="button" class="summary" aria-expanded=${() => String(this.open)} @click=${() => this.toggle()}>
        <slot name="summary">${() => this.summary}</slot>
      </button>
      <div class="body" ?hidden=${() => !this.open}>
        <slot></slot>
      </div>
    `;
  }

  /** Open or close it, and tell the page. */
  toggle(): void {
    this.open = !this.open;
    this.emit('toggle', { open: this.open });
  }
}

defineCustomElement('fx-disclosure', FxDisclosure);

declare global {
  interface HTMLElementTagNameMap {
    'fx-disclosure': FxDisclosure;
  }
  interface JSXCustomElements {
    'fx-disclosure': ElementAttributes<typeof disclosureProps, DisclosureEvents>;
  }
}
