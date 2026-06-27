# Effects

An **effect** runs a side effect — DOM work, logging, network calls — and re-runs whenever its
reactive reads change. Create one with `createEffect`:

```ts
import { createSignal, createEffect } from '@fluixi/reactive/signal';

const [theme, setTheme] = createSignal('dark');

createEffect(() => {
  document.body.dataset.theme = theme(); // re-runs whenever theme changes
});
```

The effect runs once immediately to establish its dependencies, then again on every change.

## Cleanup

Register cleanup with `onCleanup`. It runs before the effect re-runs and when the effect is
disposed — perfect for timers, listeners and subscriptions:

```ts
import { onCleanup } from '@fluixi/reactive/signal';

createEffect(() => {
  const id = setInterval(tick, delay());
  onCleanup(() => clearInterval(id)); // cleared before the next run / on dispose
});
```

## Previous value

The effect function receives its previous return value, so you can compare across runs:

```ts
createEffect((prev) => {
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
  setFirst('Grace');
  setLast('Hopper');
}); // effects depending on both run a single time
```

Next: **[Stores](/v1/en/stores)**.
