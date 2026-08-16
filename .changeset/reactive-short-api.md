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

`store` comes along too, as the state itself with `set` on it:

```ts
const user = store({ name: 'Ada' });
user.name;                    // reads, and tracks that key
user.set({ name: 'Grace' });
```

No `.get()` there on purpose — a store is an object whose whole point is that
property access is the read, so a call would cost the ergonomics that make it worth
using. Reads still subscribe per key.

`createSignal`, `createMemo`, `createEffect` and `createStore` are unchanged.
