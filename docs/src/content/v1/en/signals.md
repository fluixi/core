# Signals

A **signal** is the unit of reactive state. `createSignal` returns a getter/setter pair:

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();        // read  → 0
setCount(1);    // write → 1
setCount(c => c + 1); // update from the previous value → 2
```

## Reading is tracking

Calling the getter inside a memo or effect **subscribes** that computation to the signal. The next
write re-runs only the computations that read it:

```ts
createEffect(() => {
  console.log('count is', count()); // subscribes to count
});
setCount(5); // logs "count is 5"
```

Reading outside any reactive scope just returns the value — no subscription.

## Equality

By default a signal skips notifying readers when the new value is `===` the old one. Pass `equals`
to customize, or `equals: false` to always notify:

```ts
const [list, setList] = createSignal([], { equals: false });
```

## Reading without subscribing

Use `untrack` to read a signal without creating a dependency:

```ts
import { untrack } from '@fluixi/reactive/signal';

createEffect(() => {
  draw(count(), untrack(theme)); // re-runs on count, but not on theme
});
```

Next: **[Derived values](/v1/en/derived-values)**.
