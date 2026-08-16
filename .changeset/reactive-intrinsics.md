---
"@fluixi/compiler": minor
---

Add the `$` reactive intrinsics. `$signal`, `$memo`, `$effect` and `$store` compile
to the runtime calls they stand for, with the import added for whatever a module
actually used:

```tsx
const count = $signal(0);   // → signal(0), plus the import
```

They are the runtime API under another spelling, not a second one — `$signal`
compiles to `signal`, so there is one reactive graph and no difference in lifecycle,
SSR or hydration.

The compiler resolves a primitive by where its binding came from rather than by how
the name reads, so `import { signal as state }` is recognised and a local
`function signal()` is not. A module that binds a `$` name itself keeps its own
meaning, and that is reported rather than rewritten.

On by default: `$signal` is a reference error otherwise, so there is nothing for it
to break. `intrinsics: false` turns it off.
