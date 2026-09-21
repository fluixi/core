/**
 * A disclosure, to show the other half of the boundary: a shadow root and real slots.
 *
 * The page writes its own markup as children and the browser distributes it. Nothing
 * here reimplements that, so `<span slot="summary">` lands where a `<slot name="summary">`
 * says it does, and the styles below cannot leak out of the shadow root.
 *
 * `open` reflects, so the page can style `fx-disclosure[open]` and devtools shows the
 * current state.
 */
import { attribute, customElement, property } from '@fluixi/web-components';
import { html } from '@fluixi/dom';

export const disclosureProps = {
  /** Reflected, so `[open]` matches in CSS. */
  open: attribute.boolean(false),
  /** Used when no `summary` slot is given. */
  summary: property.string('Details'),
};

export interface DisclosureEvents {
  toggle: { open: boolean };
}

customElement(
  'fx-disclosure',
  ({ props, dispatch, set }) => {
    const toggle = () => {
      set('open', !props.open());
      dispatch('toggle', { open: props.open() });
    };

    return html`
      <style>
        :host { display: block; }
        .summary { cursor: pointer; font-weight: 600; }
        .body[hidden] { display: none; }
      </style>
      <div class="summary" @click=${toggle}>
        <slot name="summary">${() => props.summary()}</slot>
      </div>
      <div class="body" ?hidden=${() => !props.open()}>
        <slot></slot>
      </div>
    `;
  },
  { props: disclosureProps, shadow: 'open' },
);

declare global {
  interface HTMLElementTagNameMap {
    'fx-disclosure': HTMLElement & { open: boolean; summary: string };
  }
}
