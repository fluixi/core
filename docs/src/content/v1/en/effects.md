# Effects

An **effect** runs a side effect — DOM work, logging, network calls — and re-runs whenever its
reactive reads change:

```ts
import { signal, effect } from '@fluixi/reactive/signal';

const theme = signal('dark');

effect(() => {
  document.body.dataset.theme = theme(); // re-runs whenever theme changes
});
```

`$effect` is the same without the import. `createEffect` is the same function under its
original name, and everything below applies to both.

The effect runs once immediately to establish its dependencies, then again on every change.

## Cleanup

Register cleanup with `onCleanup`. It runs before the effect re-runs and when the effect is
disposed — perfect for timers, listeners and subscriptions:

```ts
import { onCleanup } from '@fluixi/reactive/signal';

effect(() => {
  const id = setInterval(tick, delay());
  onCleanup(() => clearInterval(id)); // cleared before the next run / on dispose
});
```

## Previous value

The effect function receives its previous return value, so you can compare across runs:

```ts
effect((prev) => {
  const value = count();
  if (prev !== value) report(prev, value);
  return value;
});
```

## Batching

Multiple writes inside `batch` notify dependents **once**, after the batch:

```ts
import { batch } from '@fluixi/reactive/signal';

batch(() => {
  first.set('Grace');
  last.set('Hopper');
}); // effects depending on both run a single time
```

Next: **[Stores](/v1/en/stores)**.
