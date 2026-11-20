# Effects

An **effect** is how reactive state reaches the world outside it: a third-party library, a timer,
the console, the network. It runs once to learn what it reads, then again after each change to
any of it.

```ts
import { signal, effect } from '@fluixi/reactive/signal';

const volume = signal(0.5);

effect(() => {
  player.setVolume(volume()); // runs again whenever volume changes
});
```

`$effect` is the same without the import. `createEffect` is the same function under its original
name, and everything below applies to both.

You rarely need one for the page itself: what JSX shows already updates on its own. Effects are for
the things the framework does not draw.

## A realistic example

A chart from a third-party library, kept in step with the data. The chart is created once the
element exists, updated by an effect, and destroyed with the component:

```tsx
import { onMount, onCleanup } from '@fluixi/core';

function SalesChart(props: { points: () => number[] }) {
  let canvas!: HTMLCanvasElement;
  let chart: Chart | undefined;

  onMount(() => {
    chart = new Chart(canvas, { data: props.points() });
    onCleanup(() => chart?.destroy());
  });

  $effect(() => {
    const points = props.points(); // read on every run, so the effect follows the data
    chart?.update(points);
  });

  return <canvas ref={canvas} />;
}
```

`onMount` runs in the browser only, after the element is in the page; the effect then keeps the
chart in step with every change of `points`.

## Effects run on the server too

During a server render, an effect runs once like the rest of the component. Code that needs the
browser (`window`, `document`, `localStorage`, an element's measurements) belongs in `onMount`, or
behind a check:

```ts
$effect(() => {
  document.title = title(); // ✗ throws on the server: there is no document
});

onMount(() => {
  // ✓ browser only, after the element is in the page
});
```

## Cleanup

Register cleanup with `onCleanup`. It runs before the effect runs again and when its owner goes:
timers, listeners and subscriptions.

```ts
import { onCleanup } from '@fluixi/reactive/signal';

effect(() => {
  const id = setInterval(tick, delay());
  onCleanup(() => clearInterval(id)); // cleared before the next run, and on dispose
});
```

## Previous value

The effect receives its previous return value, to compare across runs:

```ts
effect((prev) => {
  const value = count();
  if (prev !== undefined && prev !== value) report(prev, value);
  return value;
});
```

## Naming

The third argument names the effect for the devtools graph, as signals and memos take a name:

```ts
effect(() => syncTitle(title()), undefined, { name: 'sync title' });
```

An unnamed effect shows as one of many; a named one says what it is for when you are tracking down
why something ran again.

## Batching

Effects run right after each write. Several writes inside `batch` run their dependent effects
**once**, after the batch:

```ts
import { batch } from '@fluixi/reactive/signal';

batch(() => {
  first.set('Grace');
  last.set('Hopper');
}); // effects depending on both run a single time
```

## Where to use it, and where not

Use an effect to push reactive state into something the framework does not manage: a chart, a map,
a media player, an analytics call, a WebSocket subscription that depends on a signal.

**Not to derive state.** An effect that writes a signal from other signals is a memo written the
long way, and runs one step late:

```ts
// ✗
effect(() => fullName.set(`${first()} ${last()}`));
// ✓
const fullName = memo(() => `${first()} ${last()}`);
```

**Not to write a signal it reads.** It triggers itself; read it with `untrack` if you need its
current value.

**Not to update the page.** `{count()}`, `class={...}` and the other JSX expressions already update
the exact node; an effect writing `textContent` duplicates the framework's work.

**Not to load data.** A [resource](/v1/en/async) or the route's `routeData` loads data, tracks
loading and errors, and sends the result with the server render; an effect calling `fetch` does
none of that.

**Not for the head or for storage.** `seo()` keeps the title and meta tags in step
([SEO](/v1/en/seo)), and `persisted` keeps a signal in storage ([Storage](/v1/en/storage)), both on
the server too.

## Under the hood

An effect is a node in the reactive graph with no readers of its own. When one of its sources
changes, it is queued and run synchronously after the write, or at the end of the `batch`. Effects
created by a component belong to its owner and are disposed with it, their cleanups included.

Next: **[Stores](/v1/en/stores)**.
