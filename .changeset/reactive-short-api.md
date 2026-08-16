---
"@fluixi/reactive": minor
---

Add `signal`, `memo` and `effect` — the same primitives as `createSignal`,
`createMemo` and `createEffect`, handed back as one object rather than a tuple:

```ts
const count = signal(0);
count();        // read
count.set(1);   // write
```

`signal` **is** the accessor `createSignal` returns, with the setter attached — so a
read is the same call it always was, `count` still passes anywhere an accessor is
expected, and only the write changes spelling. `memo` is `createMemo` under a shorter
name, since a derived value has nothing to set.

`store` comes along too, as the state itself with `set` on it:

```ts
const user = store({ name: 'Ada' });
user.name;                    // reads, and tracks that key
user.set({ name: 'Grace' });
```

`resource` comes along the same way — the accessor with `refetch`/`mutate` on it,
beside the `loading`/`error`/`latest` it already carried.

The rule across the API: read it the way its shape implies — a call for a value, a
property for an object — and `.set()` writes. Reads still subscribe per key.

`createSignal`, `createMemo`, `createEffect` and `createStore` are unchanged.
