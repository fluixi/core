---
"@fluixi/jsx": patch
---

Allow reactive accessors on `aria-*` and `role` JSX attributes.

`class`, `id`, `href`, `style`, etc. already accept `T | Accessor<T>`, but ARIA attributes were typed as plain values, forcing a cast to bind a reactive one. Every `aria-*` attribute and `role` now accepts `T | Accessor<T>` (via a `Reactive<T>` alias), so a function-valued ARIA prop type-checks without a cast — the runtime already applies it as a reactive render effect.

```tsx
<button aria-checked={() => (checked() ? 'true' : 'false')} aria-label={() => label()} />
```
