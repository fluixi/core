---
sidebar_position: 1
---

# Signal System Overview

The Signal system provides a fine-grained reactivity model that enables efficient state management, reactive computations, and side effects. Enhanced with SolidJS-inspired features, it now includes priority-based scheduling, transitions, suspense, error boundaries, and advanced debugging capabilities.

## Overview

The Signal module offers a comprehensive set of tools for creating and managing reactive state:

- **Core Signals** - Create and manipulate reactive values
- **Derived State** - Calculate values based on other signals
- **Effects & Reactions** - Run side effects when dependencies change
- **Transitions** - Non-blocking updates for better UX
- **Suspense** - Declarative async data loading
- **Error Boundaries** - Graceful error handling
- **Context API** - Clean state sharing without prop drilling
- **Advanced Debugging** - Detailed performance insights
- **Utilities** - Transform, combine, and manipulate signals

With this reactive system, you can build applications that automatically update in response to state changes with minimal boilerplate, maximum efficiency, and production-ready features.

## Key Concepts

### Signals

A Signal is a container for a value that can notify dependents when it changes. Signals are created with `createSignal` and return a getter/setter pair:

```ts
const [count, setCount] = createSignal(0);

// Read the value
console.log(count()); // 0

// Update the value
setCount(1);
setCount(prev => prev + 1); // Function updater
```

### Effects

Effects are side-effects that automatically re-execute when their dependencies change:

```ts
createEffect(() => {
  console.log("Current count:", count());
  // Automatically re-runs when count changes
});
```

### Memos

Memos are derived values that are cached and only recalculated when dependencies change:

```ts
const double = createMemo(() => count() * 2);
```

## Key Features

### Core Reactivity
- **Granular updates** - Only the affected parts of your application update
- **Automatic dependency tracking** - No need to manually specify dependencies
- **No diffing** - Changes propagate directly to affected computations
- **Lazy evaluation** - Computations only run when needed
- **Synchronous updates** - Predictable execution order
- **Priority-based scheduling** - Renders, computations, and effects run in order
- **Batched updates** - SolidJS-style batch with `runUpdates()` mechanism

### Advanced Features
- **Transitions** - Non-blocking updates with `startTransition()`
- **Suspense boundaries** - Declarative async loading with `createSuspense()`
- **Error boundaries** - Catch errors with `catchError()`
- **Context system** - Share state with `createContext()` and `useContext()`
- **Render effects** - Synchronous DOM updates with `createRenderEffect()`
- **Manual tracking** - Fine-grained control with `createReaction()` and `on()`
- **Owner management** - Lifecycle control with `getOwner()` and `runWithOwner()`

### Developer Experience
- **Enhanced debugging** - Detailed warnings with dependency chains and performance metrics
- **Memory leak detection** - Find potential leaks with `findPotentialLeaks()`
- **Node statistics** - Monitor reactivity with `getNodeStats()`
- **RxJS integration** - Interoperate with Observable streams
- **TypeScript support** - Full type safety and inference

## Getting Started

### Basic Usage

To start using the Signal system, import the core functions:

```ts
import { 
  createSignal, 
  createEffect,
  createMemo,
  batch
} from '@awc/reactive';

// Create a basic counter
const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);

// Run side-effects when state changes
createEffect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Update the state
setCount(1); // Effect runs: "Count: 1, Doubled: 2"

// Batch multiple updates (SolidJS-style with runUpdates)
batch(() => {
  setCount(2);
  setCount(3);
}); // Effect runs once: "Count: 3, Doubled: 6"
```

### Advanced Usage

Use SolidJS-inspired features for better UX and performance:

```ts
import { 
  startTransition,
  createSuspense,
  trackPromise,
  catchError,
  createContext,
  useContext
} from '@awc/reactive';

// Non-blocking updates with transitions
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
  (error) => fallbackValue
);

// Context for state sharing
const ThemeContext = createContext({ mode: 'light' });
const theme = useContext(ThemeContext);
```

## Documentation

### Getting Started
- [Core Signals](./signal.md) - Learn about the primary signal API
- [Signal Utilities](./utilities.md) - Explore tools for transforming and combining signals
- [Common Patterns](./patterns.md) - Discover common usage patterns

### Advanced Topics
- [SolidJS-Inspired Features](./solidjs-features.md) - Transitions, suspense, error boundaries, and more
- [Advanced Patterns](./advanced-patterns.md) - Batch mechanism, update queue, and complex patterns

## API Reference

### Core API
- `createSignal` - Create a basic reactive value
- `createEffect` - Run side effects reactively
- `createMemo` - Create derived state
- `batch` - Batch multiple updates with SolidJS-style `runUpdates()`
- `untrack` - Access signals without tracking

### Advanced API
- `startTransition` / `useTransition` - Non-blocking updates
- `createSuspense` / `trackPromise` - Async data loading
- `catchError` - Error handling
- `createContext` / `useContext` - State sharing
- `createRenderEffect` - Synchronous DOM updates
- `createReaction` / `on` - Manual dependency tracking
- `getOwner` / `runWithOwner` - Lifecycle management

### Debugging API
- `warnCoarseRead` - Enhanced dependency warnings
- `getNodeStats` - Node statistics
- `findPotentialLeaks` - Memory leak detection

See the [Core Signals](./signal.md) and [SolidJS Features](./solidjs-features.md) pages for complete API documentation.
