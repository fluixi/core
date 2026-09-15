# Signals

A **signal** is the unit of reactive state. `signal` returns one binding: call it to read, `.set()` to write.

```ts
import { signal } from '@fluixi/reactive/signal';

const count = signal(0);

count();               // read  → 0
count.set(1);          // write → 1
count.set(c => c + 1); // update from the previous value → 2
```

Inside a component, `$signal` is the same thing without the import, the compiler resolves it
and adds what it needs:

```ts
const count = $signal(0);
```

## Reading is tracking

Calling the signal inside a memo or effect **subscribes** that computation to the signal. The next
write re-runs only the computations that read it:

```ts
effect(() => {
  console.log('count is', count()); // subscribes to count
});
count.set(5); // logs "count is 5"
```

Reading outside any reactive scope just returns the value, no subscription.

## Equality

By default a signal skips notifying readers when the new value is `===` the old one. Pass `equals`
to customize, or `equals: false` to always notify:

```ts
const list = signal([], { equals: false });
```

## Reading without subscribing

Use `untrack` to read a signal without creating a dependency:

```ts
import { untrack } from '@fluixi/reactive/signal';

effect(() => {
  draw(count(), untrack(theme)); // re-runs on count, but not on theme
});
```

`$untrack` is the same without the import.

## The tuple form

`createSignal` returns the same signal as a `[read, write]` pair:

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();       // read
setCount(1);   // write
```

These are one primitive with two spellings, not two implementations, `signal` is
`createSignal` with the pair packed into an object, and its `get`/`set` **are** that pair. So
they track each other, mix freely in a module, and behave identically through SSR and
hydration. Prefer `signal`; reach for the tuple when you want the halves apart, and note that
plenty of existing code and libraries are written against it.

Next: **[Derived values](/v1/en/derived-values)**.
