---
"@fluixi/jsx": patch
---

Widen reactive attribute types. `Reactive<T>` now accepts an accessor that returns `undefined` (`T | undefined | Accessor<T | undefined>`), so a conditionally-omitted attribute like `aria-disabled={() => (disabled() ? 'true' : undefined)}` type-checks without a cast — setAttribute already removes the attr on undefined/null/false. Also typed the native form attributes `required`, `readonly`/`readOnly`, `min`, `max`, `step`, `maxlength`/`maxLength`, `minlength`/`minLength`, `multiple`, `size`, `pattern` as `Reactive<>` on input/textarea/select, matching `disabled`.
