---
"@fluixi/compiler": minor
---

The webpack, rollup and esbuild adapters compile without babel.

Only the vite one had been ported; the other three still called
`babel.transformAsync` unconditionally, which made babel required for anyone not
using vite. All four now go through one `compileModule`, so an adapter cannot
drift from the others — a bundler integration growing its own compile logic is
how the two paths diverged the first time.

The esbuild adapter returns a `ts`/`tsx` loader rather than `js`: the transform
leaves types in place for the bundler to strip, which esbuild has to be told.
Rollup and esbuild also now accept `.ts`/`.jsx`, not only `.tsx`.

This is what makes babel an integration rather than a requirement — the position
Svelte and Vue are in, where the compiler is standalone and each bundler gets a
thin wrapper.
