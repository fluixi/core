---
"@fluixi/reactive": minor
---

Add `signal`, `memo` and `effect` — the same primitives as `createSignal`,
`createMemo` and `createEffect`, handed back as one object rather than a tuple:

```ts
const count = signal(0);
count.get();
count.set(1);
```

The `get` and `set` are the accessor and setter `createSignal` returns, so anything
that tracks one tracks the other and the two forms interleave freely. `memo` exposes
`get` alone, since a derived value has nothing to set.

`createSignal` and friends are unchanged.
