# Derived values

A **memo** derives a value from other reactive sources. It caches its result and recomputes only
when one of its dependencies changes:

```ts
import { signal, memo } from '@fluixi/reactive/signal';

const first = signal('Ada');
const last  = signal('Lovelace');

const fullName = memo(() => `${first()} ${last()}`);

fullName(); // "Ada Lovelace"
```

`$memo` is the same without the import:

```ts
const fullName = $memo(() => `${first()} ${last()}`);
```

## Lazy and cached

A memo only computes when it is **read**, and only recomputes when a dependency actually changes.
Reading it again returns the cached value for free:

```ts
const expensive = memo(() => heavyCompute(data()));
expensive(); // computes once
expensive(); // cached — no recompute
```

If nothing observes a memo, it never runs at all.

## Glitch-free

When a change fans out and re-converges, a memo recomputes **exactly once** with consistent inputs —
never with a half-updated, "torn" value:

```ts
const a = signal(1);
const b = memo(() => a() + 1);
const c = memo(() => a() * 2);
const d = memo(() => b() + c()); // recomputes once per change to a, never twice

a.set(2); // d recomputes a single time
```

## The accessor form

`createMemo` returns the same memo as a plain accessor:

```ts
import { createMemo } from '@fluixi/reactive/signal';

const fullName = createMemo(() => `${first()} ${last()}`);
fullName(); // "Ada Lovelace"
```

`memo` is that accessor packed into an object as `get`, so the two are one primitive and mix
freely with signals written either way.

Next: **[Effects](/v1/en/effects)**.
