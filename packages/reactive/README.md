<div align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/512x512.png" alt="Fluixi" width="120" height="120" />

  <h1>@fluixi/reactive</h1>

  <p><strong>Fine-grained reactive signals, memos, effects, stores and an RxJS-style observable layer.</strong></p>

  <p>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e.svg" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" />
    <img alt="Registry" src="https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github" />
    <img alt="Inspired by SolidJS" src="https://img.shields.io/badge/inspired%20by-SolidJS-2c4f7c" />
  </p>
</div>

---

A powerful, fine-grained reactive system with SolidJS-inspired features for building high-performance applications.

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
import { createSignal, createEffect, createMemo, batch } from '@fluixi/reactive';

// Create reactive state
const [count, setCount] = createSignal(0);

// Derived state (cached)
const doubled = createMemo(() => count() * 2);

// Side effects (auto-tracking)
createEffect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Update state
setCount(1); // Effect runs: "Count: 1, Doubled: 2"

// Batch multiple updates
batch(() => {
  setCount(2);
  setCount(3);
}); // Effect runs once: "Count: 3, Doubled: 6"
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

## What's New (v3.2.0+)

### Major Enhancements

✨ **Priority-Based Scheduling** - Updates execute in optimal order  
✨ **SolidJS-Style Batching** - New `runUpdates()` mechanism  
✨ **Transitions API** - Non-blocking updates with `startTransition()`  
✨ **Suspense Boundaries** - Declarative async with `createSuspense()`  
✨ **Error Boundaries** - Graceful error handling with `catchError()`  
✨ **Context API** - State sharing with `createContext()`  
✨ **Enhanced Debugging** - Detailed warnings and performance metrics  
✨ **Transition State Tracking** - Automatic priority in computations  

### Breaking Changes

**None!** All enhancements are 100% backward compatible.

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