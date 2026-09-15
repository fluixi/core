# The TC39 Signals core

The primitives you've seen, `createSignal`, `createMemo`, `createEffect`, are built on a small,
standards-shaped core: an implementation of the **TC39 Signals proposal**. You rarely need it
directly, but it's there when you want the lowest-level API or to build your own reactive
abstractions.

## Signal.State

A writable signal, the equivalent of `createSignal`:

```ts
import { Signal } from '@fluixi/reactive/signal';

const count = new Signal.State(0);

count.get(); // 0
count.set(1);
count.get(); // 1
```

It's equality-gated like `createSignal`; pass `{ equals }` to customize.

## Signal.Computed

A lazy, cached derived signal, the equivalent of `createMemo`:

```ts
const doubled = new Signal.Computed(() => count.get() * 2);

doubled.get(); // recomputes only when count changes
```

A computed runs only when read, and only recomputes when a dependency it read actually changed,
the same glitch-free, lazy behavior as a memo.

## Signal.subtle.Watcher

`State` and `Computed` are **pull-based**: nothing runs on its own. To react *eagerly*, the basis of
effects: use a `Watcher`. Its callback fires when a watched signal might have changed; it must not
read signals itself, only schedule work:

```ts
let queued = false;
const w = new Signal.subtle.Watcher(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    for (const node of w.getPending()) node.get(); // re-read to settle
    w.watch();                                       // re-arm
  });
});

w.watch(doubled);
count.set(2); // schedules the watcher
```

`getPending()` returns the watched signals that may have changed; re-reading them settles the graph,
and `watch()` re-arms the watcher. This is exactly how `createEffect` is implemented under the hood.

## subtle utilities

The `Signal.subtle` namespace also exposes `untrack(fn)` (read without subscribing),
`currentComputed()` (the computed currently evaluating, if any), and `hasSinks(signal)` (whether
anything observes a signal).

## Why this matters

Because the core follows the TC39 model, your reactive state is **interoperable** and the graph is
**introspectable**, which is precisely what powers the live dependency graph in the
[Playground](https://playground.fluixi.com) and `@fluixi/devtools`.

The everyday API (`createSignal` and friends) is almost always what you want, but now you know
what's underneath it.
