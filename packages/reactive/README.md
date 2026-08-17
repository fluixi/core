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

### 🎯 Core Reactivity
- **Signals** - Fine-grained reactive primitives
- **Effects** - Automatic dependency tracking
- **Memos** - Cached computed values
- **Batch Updates** - SolidJS-style batching with `runUpdates()`

### ⚡ Advanced Features
- **Priority-Based Scheduling** - Optimal update ordering (RENDER → COMPUTE → EFFECT → TRANSITION)
- **Transitions** - Non-blocking updates for better UX
- **Suspense Boundaries** - Declarative async data loading
- **Error Boundaries** - Graceful error handling
- **Context API** - State sharing without prop drilling
- **Render Effects** - Synchronous DOM updates
- **Reactions** - Manual dependency tracking
- **Owner Management** - Advanced lifecycle control

### 🔍 Developer Experience
- **Enhanced Debugging** - Detailed warnings with dependency chains and performance metrics
- **Memory Leak Detection** - Find potential issues early
- **Node Statistics** - Monitor reactive graph performance
- **TypeScript** - Full type safety and inference
- **RxJS Integration** - Seamless Observable interop

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

### Advanced Usage

```typescript
import {
  startTransition,
  useTransition,
  createSuspense,
  trackPromise,
  catchError,
  createContext,
  useContext
} from '@fluixi/reactive';

// Non-blocking updates
const [isPending, start] = useTransition();
start(() => {
  setLargeDataSet(expensiveComputation());
});

// Async data with suspense
const UserProfile = createSuspense(
  () => {
    const data = trackPromise(fetchUser(userId()));
    return <Profile data={data} />;
  },
  <ProfileSkeleton />
);

// Error handling
const safeData = catchError(
  () => parseData(input()),
  (error) => {
    console.error(error);
    return fallbackValue;
  }
);

// Context for state sharing
const ThemeContext = createContext({ mode: 'light' });
ThemeContext.Provider({
  value: { mode: 'dark' },
  children: () => <App />
});

// Consume context
const theme = useContext(ThemeContext);
```

## Priority-Based Scheduling

Updates are processed in optimal order:

```typescript
enum UpdatePriority {
  IMMEDIATE = 0,    // Immediate synchronous updates
  RENDER = 1,       // DOM updates (highest priority)
  COMPUTE = 2,      // Memos and computed values
  EFFECT = 3,       // Side effects
  TRANSITION = 4,   // Low-priority updates (lowest)
}
```

## Batch & Update Queue

SolidJS-inspired batching with `runUpdates()`:

```typescript
batch(() => {
  setA(1);
  setB(2);
  setC(3);
}); // All effects run once in priority order

// Internal mechanism:
// 1. Updates queued in updateQueue
// 2. runUpdates() processes queue
// 3. Flushes in priority order: renders → computations → effects
```

## Enhanced Debugging

Automatic warnings for performance issues:

```
⚠️ [Reactivity Warning] Coarse Dependency Detected

Node Information:
┌─────────────┬──────────────────┐
│ Node Name   │ userData         │
│ Observers   │ 18               │
└─────────────┴──────────────────┘

Reason:
  Reading large object (23 keys) - consider using 
  derived signals for specific properties

Performance Metrics:
┌───────────────────┬──────────┐
│ Updates           │ 45       │
│ Avg Frequency     │ 120ms    │
└───────────────────┴──────────┘

Suggestions:
  • Use derived signals for specific properties
  • Consider breaking into smaller signals
```

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

### Suspense

- `createSuspense(fn, fallback)` - Create async boundary
- `trackPromise(promise)` - Register promise with suspense

### Error Handling

- `catchError(fn, handler)` - Handle errors gracefully

### Context

- `createContext(defaultValue)` - Create context
- `useContext(context)` - Consume context

### Enhanced Effects

- `createRenderEffect(fn)` - Synchronous DOM updates
- `createReaction(onInvalidate)` - Manual dependency tracking
- `on(deps, fn, options?)` - Explicit dependencies

### Owner Management

- `getOwner()` - Get current reactive owner
- `runWithOwner(owner, fn)` - Run with specific owner

### Debugging

- `warnCoarseRead(node, reason)` - Enhanced warnings
- `getNodeStats()` - Get reactive graph statistics
- `findPotentialLeaks()` - Find memory leaks
- `enableDevMode()` - Enable dev mode features

### Utilities

- `createEnhancedSignal(initialValue)` - Signal with extras
- `createAsyncSignal(asyncFn)` - Async signal
- `createLazySignal(fn)` - Lazy-evaluated signal
- `createSignalWithHistory(initialValue)` - Signal with undo/redo
- `createThrottledSignal(signal, delay)` - Throttled updates
- `createDebouncedSignal(signal, delay)` - Debounced updates
- `createTrigger()` - Manual trigger
- `createSelector(source, fn)` - Keyed selector
- `createResource(fetcher, source?)` - Async resource
- `createStore(initialValue)` - Nested reactive object

## Documentation

Complete documentation available at:
- [Overview](../../my-docusaurus-app/docs/signal/overview.md) - Introduction and concepts
- [Core API](../../my-docusaurus-app/docs/signal/signal.md) - Complete API reference
- [SolidJS Features](../../my-docusaurus-app/docs/signal/solidjs-features.md) - Advanced features guide
- [Advanced Patterns](../../my-docusaurus-app/docs/signal/advanced-patterns.md) - Complex patterns
- [Quick Reference](../../my-docusaurus-app/docs/signal/quick-reference.md) - Quick lookup
- [What's New](../../my-docusaurus-app/docs/signal/whats-new.md) - Latest enhancements

## Compiler intrinsics

Inside an app compiled by `@fluixi/compiler`, these primitives have `$`-prefixed twins that
need no import — `$signal`, `$memo`, `$effect`, `$store`, `$resource`. They compile to the
calls above, so there is one reactive graph and no difference in behaviour. This package
stays importable exactly as documented here, which is what a library that never runs the
compiler needs.

## Performance Tips

1. **Use transitions for expensive updates**
   ```typescript
   startTransition(() => setLargeList(compute()));
   ```

2. **Batch related updates**
   ```typescript
   batch(() => { setA(1); setB(2); });
   ```

3. **Use memos for expensive computations**
   ```typescript
   const result = createMemo(() => expensive(signal()));
   ```

4. **Leverage suspense for async**
   ```typescript
   createSuspense(() => trackPromise(fetch()), <Loading />);
   ```

5. **Monitor with debugging tools**
   ```typescript
   const stats = getNodeStats();
   const leaks = findPotentialLeaks();
   ```

## Best Practices

### ✅ Do

- Use `batch()` for multiple related updates
- Use `startTransition()` for non-urgent updates
- Add error boundaries with `catchError()`
- Use context instead of prop drilling
- Monitor performance with debugging tools

### ❌ Don't

- Update signals without batching when multiple updates needed
- Block UI with expensive synchronous computations
- Ignore errors in reactive code
- Prop drill when context would work better

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

Inspired by:
- [SolidJS](https://www.solidjs.com/) - Reactivity primitives and scheduling
- [React](https://react.dev/) - Transitions and Suspense concepts
- [Vue 3](https://vuejs.org/) - Reactivity system design

---

**Version:** 3.2.0+  
**Status:** ✅ Production Ready