---
"@fluixi/compiler": minor
"@fluixi/dom": minor
---

Elements with reactive attributes now stay in their template, binding each attribute individually, and nested elements are handled similarly. Generated code only: behaviour is unchanged, and `spread` still handles real spreads and the cases that cannot be bound one by one.

New in `@fluixi/dom`: `setDynamicStyle` and `setDynamicClassList`, the function branches of `spread` as standalone helpers.
