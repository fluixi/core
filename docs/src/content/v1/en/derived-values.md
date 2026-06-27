# Derived values

A **memo** derives a value from other reactive sources. Created with `createMemo`, it caches its
result and recomputes only when one of its dependencies changes:

```ts
import { createSignal, createMemo } from '@fluixi/reactive/signal';

const [first, setFirst] = createSignal('Ada');
const [last, setLast]   = createSignal('Lovelace');

const fullName = createMemo(() => `${first()} ${last()}`);

fullName(); // "Ada Lovelace"
```

## Lazy and cached

A memo only computes when it is **read**, and only recomputes when a dependency actually changes.
Reading it again returns the cached value for free:

```ts
const expensive = createMemo(() => heavyCompute(data()));
expensive(); // computes once
expensive(); // cached — no recompute
```

If nothing observes a memo, it never runs at all.

## Glitch-free

When a change fans out and re-converges, a memo recomputes **exactly once** with consistent inputs —
never with a half-updated, "torn" value:

```ts
const [a, setA] = createSignal(1);
const b = createMemo(() => a() + 1);
const c = createMemo(() => a() * 2);
const d = createMemo(() => b() + c()); // recomputes once per change to a, never twice

setA(2); // d recomputes a single time
```

Next: **[Effects](/v1/en/effects)**.
