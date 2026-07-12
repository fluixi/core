---
"@fluixi/jsx": patch
---

Add `JSX.CSSProperties` — a typed style-object: known camelCase CSS properties (autocompleted from the DOM `CSSStyleDeclaration`), custom `--*` properties, plus a string fallback, with string-or-number values. `style` is retyped `string | CSSProperties | Accessor<string | CSSProperties>`.
