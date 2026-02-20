---
sidebar_position: 7
---

# Quick Reference

Quick reference for the most commonly used Signal APIs and patterns.

## Core Signals

### `createSignal()`

Create a reactive value:

```typescript
import { createSignal } from '@awc/reactive';

const [count, setCount] = createSignal(0);

// Read value
console.log(count()); // 0

// Update value
setCount(1);
setCount(prev => prev + 1);
```

### `createEffect()`

Run side effects when dependencies change:

```typescript
import { createEffect } from '@awc/reactive';

createEffect(() => {
  console.log('Count:', count());
  // Automatically re-runs when count changes
});
```

### `createMemo()`

Create cached derived state:

```typescript
import { createMemo } from '@awc/reactive';

const doubled = createMemo(() => count() * 2);
// Only recalculates when count changes
```

### `batch()`

Batch multiple updates (SolidJS-style with `runUpdates()`):

```typescript
import { batch } from '@awc/reactive';

batch(() => {
  setCount(1);
  setName('John');
  setAge(30);
}); // Effects run once after all updates
```

### `untrack()`

Read signals without tracking:

```typescript
import { untrack } from '@awc/reactive';

createEffect(() => {
  const tracked = signal1();
  const untracked = untrack(() => signal2());
  // Only tracks signal1
});
```

---

## Transitions

### `startTransition()`

Non-blocking updates:

```typescript
import { startTransition } from '@awc/reactive';

await startTransition(() => {
  setLargeData(expensiveComputation());
});
```

### `useTransition()`

Track transition state:

```typescript
import { useTransition } from '@awc/reactive';

const [isPending, start] = useTransition();

start(() => setData(newData));

if (isPending()) {
  return <Loading />;
}
```

---

## Suspense

### `createSuspense()`

Async boundaries:

```typescript
import { createSuspense, trackPromise } from '@awc/reactive';

const DataView = createSuspense(
  () => {
    const data = trackPromise(fetchData());
    return <Display data={data} />;
  },
  <Loading />
);
```

### `trackPromise()`

Register promise with suspense:

```typescript
const data = trackPromise(
  fetch('/api/data').then(r => r.json())
);
```

---

## Error Handling

### `catchError()`

Handle errors gracefully:

```typescript
import { catchError } from '@awc/reactive';

const result = catchError(
  () => riskyOperation(),
  (error) => {
    console.error(error);
    return fallbackValue;
  }
);
```

---

## Context

### `createContext()`

Create typed context:

```typescript
import { createContext } from '@awc/reactive';

const ThemeContext = createContext({
  mode: 'light' as 'light' | 'dark'
});
```

### Context Provider

Provide values:

```typescript
ThemeContext.Provider({
  value: { mode: 'dark' },
  children: () => <App />
});
```

### `useContext()`

Consume context:

```typescript
import { useContext } from '@awc/reactive';

const theme = useContext(ThemeContext);
```

---

## Enhanced Effects

### `createRenderEffect()`

Synchronous DOM updates:

```typescript
import { createRenderEffect } from '@awc/reactive';

createRenderEffect(() => {
  element.textContent = signal();
});
```

### `createReaction()`

Manual dependency tracking:

```typescript
import { createReaction } from '@awc/reactive';

const track = createReaction(() => {
  console.log('Changed!');
});

track(() => signal()); // Track this signal
```

### `on()`

Explicit dependencies:

```typescript
import { on, createEffect } from '@awc/reactive';

createEffect(
  on(
    () => [count(), name()],
    ([c, n]) => console.log(c, n),
    { defer: true }
  )
);
```

---

## Owner Management

### `getOwner()`

Get current owner:

```typescript
import { getOwner } from '@awc/reactive';

const owner = getOwner();
```

### `runWithOwner()`

Run with specific owner:

```typescript
import { runWithOwner } from '@awc/reactive';

runWithOwner(owner, () => {
  createEffect(() => console.log('Effect'));
});
```

---

## Debugging

### `warnCoarseRead()`

Enhanced warnings (automatic):

```typescript
// Warns about:
// - Large objects (>5 keys)
// - Large arrays (>20 items)
// - High observer counts (>15)
```

### `getNodeStats()`

Get node statistics:

```typescript
import { getNodeStats } from '@awc/reactive';

const stats = getNodeStats();
console.log(stats.total);
console.log(stats.byType);
```

### `findPotentialLeaks()`

Find memory leaks:

```typescript
import { findPotentialLeaks } from '@awc/reactive';

const leaks = findPotentialLeaks();
if (leaks.length > 0) {
  console.warn('Leaks:', leaks);
}
```

---

## Common Patterns

### Loading State

```typescript
const [isPending, start] = useTransition();

start(() => setData(fetchData()));

return isPending() ? <Loading /> : <Data />;
```

### Error Recovery

```typescript
const data = catchError(
  () => parseJSON(input()),
  (error) => defaultValue
);
```

### Shared Theme

```typescript
const ThemeContext = createContext({ mode: 'light' });

// Provider
ThemeContext.Provider({
  value: { mode: mode() },
  children: () => <App />
});

// Consumer
const { mode } = useContext(ThemeContext);
```

### Batched Form Updates

```typescript
function handleSubmit(form: FormData) {
  batch(() => {
    setName(form.get('name'));
    setEmail(form.get('email'));
    setAge(form.get('age'));
  });
}
```

### Performance Monitoring

```typescript
const expensive = createMemo(() => {
  const start = performance.now();
  const result = heavyComputation();
  console.log('Duration:', performance.now() - start);
  return result;
});
```

---

## Update Priorities

```typescript
enum UpdatePriority {
  IMMEDIATE = 0,    // Immediate
  RENDER = 1,       // Highest (DOM updates)
  COMPUTE = 2,      // Memos
  EFFECT = 3,       // Side effects
  TRANSITION = 4,   // Lowest (deferred)
}
```

---

## Cheat Sheet

| Need | Use |
|------|-----|
| Reactive value | `createSignal()` |
| Derived value | `createMemo()` |
| Side effect | `createEffect()` |
| DOM update | `createRenderEffect()` |
| Batch updates | `batch()` |
| Non-blocking update | `startTransition()` |
| Async data | `createSuspense()` |
| Error handling | `catchError()` |
| Share state | `createContext()` |
| Manual tracking | `createReaction()` |
| Skip tracking | `untrack()` |
| Debug warnings | `warnCoarseRead()` |
| Check leaks | `findPotentialLeaks()` |

---

## Best Practices

### ✅ Do

```typescript
// Batch related updates
batch(() => {
  setA(1);
  setB(2);
});

// Use transitions for expensive work
startTransition(() => {
  setLargeList(compute());
});

// Add error boundaries
catchError(
  () => operation(),
  (err) => fallback
);

// Use context for shared state
const value = useContext(MyContext);
```

### ❌ Don't

```typescript
// Don't update without batching
setA(1);
setB(2); // Triggers effects twice

// Don't block UI
setLargeList(compute()); // Blocks!

// Don't ignore errors
riskyOperation(); // Might crash

// Don't prop drill
<Child prop1={x} prop2={y} prop3={z} />
```

---

## Next Steps

- [Core Signals](./signal.md) - Complete API reference
- [SolidJS Features](./solidjs-features.md) - Advanced features
- [Advanced Patterns](./advanced-patterns.md) - Complex patterns
- [Utilities](./utilities.md) - Helper functions