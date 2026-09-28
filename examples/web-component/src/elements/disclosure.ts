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
import { attribute, customElement, property, type ElementAttributes } from '@fluixi/web-components';
import { html } from '@fluixi/dom';

export interface DisclosureEvents {
  toggle: { open: boolean };
}

export const FxDisclosure = customElement('fx-disclosure', {
  shadow: 'open',
  props: {
    /** Reflected, so `[open]` matches in CSS. */
    open: attribute.boolean(false),
    /** Used when no `summary` slot is given. */
    summary: property.string('Details'),
  },
  setup: ({ props, dispatch, set }) => {
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
});

declare global {
  interface HTMLElementTagNameMap {
    'fx-disclosure': InstanceType<typeof FxDisclosure>;
  }
  interface JSXCustomElements {
    'fx-disclosure': ElementAttributes<
      { open: ReturnType<typeof attribute.boolean>; summary: ReturnType<typeof property.string> },
      DisclosureEvents
    >;
  }
}
