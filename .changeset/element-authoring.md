---
"@fluixi/web-components": minor
---

`customElement` takes a single options object, so a prop declaration sits beside the setup that reads it: `customElement('fx-counter', { props, setup })`. The three-argument form still works. It also returns a constructor carrying the element's properties, so `InstanceType<typeof FxCounter>` is the whole entry a consumer puts in `HTMLElementTagNameMap` instead of restating every prop.
