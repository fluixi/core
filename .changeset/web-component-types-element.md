---
"@fluixi/web-components": minor
---

A custom element can be typed for its consumers. `ElementOf` builds the DOM interface for `HTMLElementTagNameMap`, so `querySelector` returns something with the element's properties on it; `ElementAttributes` builds the JSX tag's attributes from the same prop schema, with a handler per dispatched event; `ForeignElementAttributes` does the same for an element someone else wrote. JSX augmentation moves to an interface named `HTMLReactiveElement`, and the previous `FluixiElements` keeps working.

The web-component vocabulary is available alongside the framework's own: `customElement`, `property`, `attribute`, `event`, `target`, `ref` and `slot` bind to `defineElement`, `prop`, `createDispatch` and `createTargets`.
