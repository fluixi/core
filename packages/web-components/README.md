# @fluixi/web-components

Standard custom elements with Fluixi's reactivity inside. They work in any page and any
framework, and in a Fluixi app they render on the server and hydrate like the rest of the page.

```ts
import { defineCustomElement, prop, typedElement } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';

class FxCounter extends typedElement({ step: prop.number(1) }) {
  #count = signal(0);

  protected override render() {
    return html`<button @click=${() => this.#count.set(this.#count() + this.step)}>${() => this.#count()}</button>`;
  }
}

defineCustomElement('fx-counter', FxCounter);
```

- **Props**: `prop.string`, `number`, `boolean`, `object`, `custom` and `any`; a property and
  its attribute share one signal, with `reflect` and `attribute` options.
- **Events**: `this.emit(type, detail)`, typed for consumers through `ElementAttributes`.
- **Styles**: light DOM by default; `static shadow` and shared constructed `static styles`.
- **Context**: `provide` and `consume` between elements, interoperable with `@lit/context`, and
  the app's own providers.
- **Forms and focus**: `FormAssociated`, `rovingFocus`, `trapFocus`, `tabbables`.
- **Setup form**: `defineElement(name, setup, { props })` without a class.
- **Loading**: `defineWhenUsed` registers an element only once its tag appears.

Documentation: [Web components](https://docs.fluixi.com/v1/en/web-components).
