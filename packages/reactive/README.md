<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/reactive

**Fine-grained signals, memos, effects and stores on a TC39 Signals core — standalone, no framework required.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/reactive?logo=npm)](https://www.npmjs.com/package/@fluixi/reactive)
![Inspired by SolidJS](https://img.shields.io/badge/inspired%20by-SolidJS-2c4f7c)

---

A fine-grained reactive system built on the **TC39 Signals** graph: glitch-free, lazy,
push-pull. It has no DOM dependency and no framework dependency, so it works in the
browser, on the server, or on its own.

## Features

### Core
- **Signals, memos, effects** — fine-grained state, derived values, automatic tracking
- **Stores** — nested reactive objects where reading a property *is* the read
- **Resources** — async values that integrate with suspense
- **Batching** — `batch()` collects writes so dependents run once

### Beyond the basics
- **Transitions** — `startTransition` defers non-critical effects so the view stays interactive
- **Suspense and error boundaries** — as plain values, so any view layer can wrap them
- **Context** — provide a value for the duration of a call, without prop drilling
- **Owners** — explicit ownership and disposal, so a graph tears down completely
- **Debounced primitives** — signal, resource and function variants
- **Observable interop** — `Observable`/`Subject` for RxJS-shaped code
- **TypeScript** — full type safety and inference

## Installation

```bash
npm install @fluixi/reactive
```

## Quick Start

### Basic Usage

```typescript
import { signal, memo, effect, batch } from '@fluixi/reactive';

// Reactive state — call it to read, .set() to write
const count = signal(0);

// Derived state (cached)
const doubled = memo(() => count() * 2);

// Side effects (auto-tracking)
effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

count.set(1); // Effect runs: "Count: 1, Doubled: 2"

// Batch multiple updates
batch(() => {
  count.set(2);
  count.set(3);
}); // Effect runs once: "Count: 3, Doubled: 6"
```

### The tuple form

`createSignal` returns the same signal as a `[read, write]` pair, and `createMemo` /
`createEffect` are `memo` / `effect` under their original names:

```typescript
import { createSignal, createMemo, createEffect } from '@fluixi/reactive';

const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);
createEffect(() => console.log(count(), doubled()));
setCount(1);
```

`signal` **is** the accessor `createSignal` returns with the setter attached, so a read is
the same call either way. They track each other and mix freely in one module — pick
whichever reads better, and keep the tuple when you want the halves apart.

### Stores and resources

```typescript
import { store } from '@fluixi/reactive/store';
import { resource } from '@fluixi/reactive/signal';

const cart = store({ items: [], total: 0 });
cart.total;                 // reading a property IS the reactive read
cart.set('total', 42);      // only readers of `total` re-run

const user = resource(() => fetch('/api/me').then((r) => r.json()));
user();        // the value — suspends under a Suspense boundary
user.loading;  // boolean
user.refetch();
```

### Transitions, context and boundaries

```typescript
import {
  startTransition, useTransition,
  createContext, useContext, provide,
  createErrorBoundary, provideErrorBoundary,
} from '@fluixi/reactive';

// Non-blocking updates — `isPending` is a signal you can read while it runs
const [isPending, start] = useTransition();
start(() => setLargeDataSet(expensiveComputation()));

// Context: create it, provide a value for the duration of a call, consume inside
const ThemeContext = createContext({ mode: 'light' });
provide(ThemeContext, { mode: 'dark' }, () => {
  useContext(ThemeContext); // { mode: 'dark' }
});

// Boundaries are values here, not components. A view layer wraps these into
// <ErrorBoundary> / <Suspense>; on their own they are plain functions.
const boundary = createErrorBoundary();
provideErrorBoundary(boundary, () => risky());
boundary.error();  // the thrown value, or undefined
boundary.reset();
```

### Debouncing

```typescript
import { createDebounce, createDebouncedSignal, createDebouncedResource } from '@fluixi/reactive';

const [term, setTerm, controls] = createDebouncedSignal('', 300);
term();                // settles 300ms after the last write
controls.immediate();  // the value as written — bind the input to this one
controls.pending();    // a write is waiting (not the same as a request in flight)
controls.flush();      // settle now

// Search-as-you-type as one primitive: the query debounces, the fetch follows it,
// and an empty query doesn't fetch at all.
const [results, search] = createDebouncedResource('', (q) => fetchResults(q), { delay: 300 });
search.setQuery('fluix');
results.loading;

// Or debounce any function
const save = createDebounce((draft) => persist(draft), 500);
```

## Batching

A write marks its dependents dirty and schedules them; memos stay lazy and recompute on
read, so the graph is glitch-free — nothing observes a half-applied update.

```typescript
batch(() => {
  a.set(1);
  b.set(2);
  c.set(3);
}); // dependents run once, after the batch closes

await flush(); // await the pending queue — mostly useful in tests
```

`startTransition` is the other half: it runs `fn` synchronously and captures the non-pure
effects it would fire into a deferred queue, so an expensive update doesn't block the
current view. Pure computations still settle immediately.

## API Reference

### Core API

- `createSignal(initialValue, options?)` - Create reactive state
- `createEffect(fn, options?)` - Run side effects
- `createMemo(fn, initialValue?, options?)` - Create derived state
- `batch(fn)` - Batch multiple updates
- `untrack(fn)` - Read signals without tracking
- `createRoot(fn)` - Create disposal root

### Transitions

- `startTransition(fn)` - Mark updates as low priority
- `useTransition()` - Track transition state

### Boundaries

- `createSuspenseBoundary()` / `provideSuspense(boundary, fn)` - Async boundary as a value
- `createErrorBoundary()` / `provideErrorBoundary(boundary, fn)` - Error boundary as a value
- `trackResourcePromise(promise)` - Register a promise with the enclosing suspense

### Context

- `createContext(defaultValue)` - Create context
- `provide(context, value, fn)` - Supply a value for the duration of a call
- `useContext(context)` - Consume context

### Other effects

- `createRenderEffect(fn)` - Runs before paint, for DOM writes
- `createComputed(fn)` - Runs eagerly, unlike a memo
- `on(deps, fn, options?)` - Explicit dependencies

### Owner Management

- `getOwner()` - Get current reactive owner
- `runWithOwner(owner, fn)` - Run with specific owner

### Lists

- `mapArray(list, fn)` - Map keyed by identity; a row survives a reorder
- `indexArray(list, fn)` - Map keyed by index
- `keyArray(list, key, fn)` - Map keyed by an explicit key

### Utilities

- `createSelector(source, fn)` - Keyed selector; only the row that changed re-runs
- `createResource(fetcher, source?)` / `resource(...)` - Async resource
- `createStore(initial)` / `store(initial)` - Nested reactive object
- `createDeferred(source, options?)` - A value that trails behind under load
- `createDebounce(fn, ms)` / `createDebouncedSignal(initial, ms)` / `createDebouncedResource(...)`
- `flush()` - Await the pending effect queue
- `unwrap(store)` / `untrackStore(fn)` - Escape hatches out of a store proxy
- `onCleanup(fn)` / `disposeScope(owner)` - Teardown

## Documentation

- [Signals](https://docs.fluixi.com/v1/en/signals) — state, reading and writing
- [Derived values](https://docs.fluixi.com/v1/en/derived-values) — memos and selectors
- [Effects](https://docs.fluixi.com/v1/en/effects) — side effects and cleanup
- [Stores](https://docs.fluixi.com/v1/en/stores) — nested reactive objects
- [Async](https://docs.fluixi.com/v1/en/async) — resources, suspense, transitions
- [TC39 Signals](https://docs.fluixi.com/v1/en/tc39-signals) — the model underneath

## Compiler intrinsics

Inside an app compiled by `@fluixi/compiler`, these primitives have `$`-prefixed twins that
need no import — `$signal`, `$memo`, `$effect`, `$store`, `$resource`. They compile to the
calls above, so there is one reactive graph and no difference in behaviour. This package
stays importable exactly as documented here, which is what a library that never runs the
compiler needs.

## Performance tips

1. **Batch related updates** — `batch(() => { a.set(1); b.set(2); })` runs dependents once.
2. **Transitions for expensive updates** — `startTransition(() => list.set(compute()))`
   keeps the current view interactive while the next one is prepared.
3. **Memo the expensive part** — a memo costs a node; it pays for itself when the
   computation is heavier than the bookkeeping.
4. **Read narrowly** — reading a whole object subscribes you to every write to it. Reach
   for the property you need, or derive it.
5. **Key your lists** — `mapArray` keeps a row's nodes across a reorder; `indexArray`
   rebuilds them.

## Building

```bash
nx build reactive
```

## Running Tests

```bash
nx test reactive
```

## License

MIT

## Credits

The graph implements the **TC39 Signals** model. The ergonomics owe a lot to prior art —
SolidJS for fine-grained primitives and scheduling, React for transitions and suspense as
concepts, Vue 3 for reactivity design. None of that was invented here.
