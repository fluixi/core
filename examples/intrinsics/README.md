# Intrinsics

Two ways to write the same thing.

```tsx
import { signal } from '@fluixi/reactive/signal';
const count = signal(0);       // the runtime API
```

```tsx
const count = $signal(0);      // the intrinsic — no import
```

`$signal` compiles to `signal`, so they are one primitive with two spellings: one reactive
graph, one lifecycle, the same SSR and hydration behaviour. The compiler adds the import
for what a module actually used, once, and only for the intrinsics it found.

```tsx
count();       // read — tracks wherever it runs
count.set(1);      // write
```

`createSignal` and its `[get, set]` tuple are unchanged, and the two forms mix freely: 
`App.tsx` derives a `$memo` from a signal made the other way.

A module that binds `$signal` itself keeps its own meaning, and the compiler reports it
rather than rewriting code that means something else.

```bash
pnpm test
pnpm dev
```
