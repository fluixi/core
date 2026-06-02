---
sidebar_position: 2
---

# Signals API

Complete API reference for reactive signals from `@fluixi/reactive/signal`.

## Core Primitives

### createSignal()

Creates a reactive signal for state management.

```typescript
function createSignal<T>(
  initialValue: T
): [Accessor<T>, Setter<T>]
```

**Type Parameters:**
- `T` - Type of the signal value

**Parameters:**
- `initialValue` - Initial value of the signal

**Returns:** Tuple of `[getter, setter]`
- `getter: () => T` - Function to read current value
- `setter: (value: T | ((prev: T) => T)) => void` - Function to update value

**Example:**
```typescript
import { createSignal } from '@fluixi/reactive/signal';

// Basic usage
const [count, setCount] = createSignal(0);
console.log(count()); // 0

// Update with value
setCount(1);

// Update with function
setCount(c => c + 1);

// Objects
const [user, setUser] = createSignal({ name: 'John', age: 30 });
setUser(u => ({ ...u, age: 31 }));

// Arrays
const [items, setItems] = createSignal([1, 2, 3]);
setItems(i => [...i, 4]);
```

### createEffect()

Creates a side effect that automatically tracks and re-runs when dependencies change.

```typescript
function createEffect<T>(
  fn: (prev?: T) => T,
  value?: T
): () => void
```

**Type Parameters:**
- `T` - Type of the effect's return value

**Parameters:**
- `fn` - Effect function to run. Receives previous return value
- `value` - Optional initial value

**Returns:** Disposal function to stop the effect

**Example:**
```typescript
import { createSignal, createEffect } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

// Basic effect
createEffect(() => {
  console.log('Count is:', count());
});

// Effect with cleanup
createEffect(() => {
  const timer = setInterval(() => {
    console.log('Tick:', count());
  }, 1000);

  // Cleanup function
  return () => clearInterval(timer);
});

// Effect with previous value
createEffect((prev) => {
  const current = count();
  console.log(`Changed from ${prev} to ${current}`);
  return current;
}, 0);

// Manual disposal
const dispose = createEffect(() => {
  console.log('Running');
});
dispose(); // Stop effect
```

### createMemo()

Creates a computed value that caches and only recalculates when dependencies change.

```typescript
function createMemo<T>(
  fn: (prev?: T) => T,
  value?: T
): Accessor<T>
```

**Type Parameters:**
- `T` - Type of the computed value

**Parameters:**
- `fn` - Computation function. Receives previous value
- `value` - Optional initial value

**Returns:** Accessor function that returns computed value

**Example:**
```typescript
import { createSignal, createMemo } from '@fluixi/reactive/signal';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

// Simple memo
const fullName = createMemo(() => {
  console.log('Computing full name');
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // Logs "Computing full name", returns "John Doe"
console.log(fullName()); // Returns "John Doe" (cached, no log)

setFirstName('Jane');
console.log(fullName()); // Logs "Computing full name", returns "Jane Doe"

// Memo with previous value
const [count, setCount] = createSignal(0);
const doubledDiff = createMemo((prev = 0) => {
  const current = count() * 2;
  const diff = current - prev;
  console.log(`Doubled changed by ${diff}`);
  return current;
}, 0);
```

### createRoot()

Creates a new reactive root/owner for manual control of reactive scope.

```typescript
function createRoot<T>(
  fn: (dispose: () => void) => T
): T
```

**Type Parameters:**
- `T` - Return type of the function

**Parameters:**
- `fn` - Function to run in new root. Receives disposal function

**Returns:** Result of the function

**Example:**
```typescript
import { createRoot, createSignal, createEffect } from '@fluixi/reactive/signal';

const cleanup = createRoot((dispose) => {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    console.log('Count:', count());
  });

  setCount(1);

  // Return disposal function
  return dispose;
});

// Later, cleanup everything
cleanup();
```

## Reactive Context

### getOwner()

Gets the current reactive owner/context.

```typescript
function getOwner(): Owner | null
```

**Returns:** Current owner or null if outside reactive context

**Example:**
```typescript
import { getOwner } from '@fluixi/reactive/signal';

function myComponent() {
  const owner = getOwner();
  
  setTimeout(() => {
    runWithOwner(owner, () => {
      // Create effects that belong to component's owner
      createEffect(() => {
        // ...
      });
    });
  }, 1000);
}
```

### runWithOwner()

Runs a function with a specific owner context.

```typescript
function runWithOwner<T>(
  owner: Owner | null,
  fn: () => T
): T | undefined
```

**Parameters:**
- `owner` - Owner context to use
- `fn` - Function to run

**Returns:** Function result or undefined if no owner

**Example:**
```typescript
import { getOwner, runWithOwner, createEffect } from '@fluixi/reactive/signal';

const owner = getOwner();

setTimeout(() => {
  runWithOwner(owner, () => {
    createEffect(() => {
      // This effect belongs to the captured owner
    });
  });
}, 1000);
```

## Batching & Control

### batch()

Batches multiple signal updates into a single reactive update cycle.

```typescript
function batch<T>(fn: () => T): T
```

**Parameters:**
- `fn` - Function containing updates to batch

**Returns:** Function result

**Example:**
```typescript
import { createSignal, createEffect, batch } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('John');

createEffect(() => {
  console.log('Effect runs once:', count(), name());
});

batch(() => {
  setCount(1);
  setName('Jane');
  setCount(2);
  setName('Bob');
});
// Effect runs only once after all updates
```

### untrack()

Reads signals without creating dependencies in the current reactive context.

```typescript
function untrack<T>(fn: () => T): T
```

**Parameters:**
- `fn` - Function to run without tracking

**Returns:** Function result

**Example:**
```typescript
import { createSignal, createMemo, untrack } from '@fluixi/reactive/signal';

const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

const computed = createMemo(() => {
  const valueA = a(); // Tracked
  const valueB = untrack(() => b()); // NOT tracked
  return valueA + valueB;
});

setA(10); // Triggers recomputation
setB(20); // Does NOT trigger recomputation
```

### on()

Explicitly defines dependencies for an effect or memo.

```typescript
function on<T, U>(
  deps: Accessor<T> | Accessor<T>[],
  fn: (input: T, prev: U | undefined) => U,
  options?: { defer?: boolean }
): (prev?: U) => U
```

**Parameters:**
- `deps` - Single accessor or array of accessors to track
- `fn` - Function to run when deps change. Receives input and previous value
- `options` - Configuration
  - `defer?: boolean` - If true, don't run immediately

**Returns:** Function suitable for effect or memo

**Example:**
```typescript
import { createSignal, createEffect, on } from '@fluixi/reactive/signal';

const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);
const [c, setC] = createSignal(3);

// Only depends on 'a', even though 'b' and 'c' are used
createEffect(on(a, () => {
  console.log('Only runs when a changes');
  console.log('Values:', a(), b(), c());
}));

setB(10); // Doesn't run effect
setC(20); // Doesn't run effect
setA(5);  // Runs effect

// Multiple dependencies
createEffect(on([a, b], ([aVal, bVal]) => {
  console.log('Runs when a or b changes:', aVal, bVal);
}));
```

## Advanced

### createReaction()

Creates a reaction that tracks dependencies but only runs when explicitly executed.

```typescript
function createReaction(
  fn: () => void,
  onInvalidate?: () => void
): (trackingFn: () => void) => void
```

**Parameters:**
- `fn` - Function to run on execution
- `onInvalidate` - Optional callback when dependencies change

**Returns:** Function to track dependencies and execute

**Example:**
```typescript
import { createSignal, createReaction } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

const track = createReaction(
  () => console.log('Reaction executed'),
  () => console.log('Dependencies invalidated')
);

// Set up tracking
track(() => count());

// Changes trigger onInvalidate but don't execute fn
setCount(1); // Logs: "Dependencies invalidated"
setCount(2); // Logs: "Dependencies invalidated"

// Manually execute
track(() => count()); // Logs: "Reaction executed"
```

### createSelector()

Creates a selector that only notifies when the selected key changes.

```typescript
function createSelector<T>(
  source: Accessor<T>
): (key: T) => Accessor<boolean>
```

**Parameters:**
- `source` - Source signal to select from

**Returns:** Function that creates selectors for specific keys

**Example:**
```typescript
import { createSignal, createSelector } from '@fluixi/reactive/signal';

const [selected, setSelected] = createSignal('a');
const isSelected = createSelector(selected);

// Create selector for 'a'
const isA = isSelected('a');
console.log(isA()); // true

// Create selector for 'b'
const isB = isSelected('b');
console.log(isB()); // false

setSelected('b');
console.log(isA()); // false
console.log(isB()); // true
```

## Types

### Accessor

Function type for reading signal values.

```typescript
type Accessor<T> = () => T
```

### Setter

Function type for updating signal values.

```typescript
type Setter<T> = (value: T | ((prev: T) => T)) => void
```

### Signal

Tuple type for signal getter and setter.

```typescript
type Signal<T> = [Accessor<T>, Setter<T>]
```

### Owner

Reactive owner/context type for managing reactive scope.

```typescript
interface Owner {
  owned: Owner[] | null;
  cleanups: (() => void)[] | null;
  context: Record<symbol, any> | null;
}
```

## Best Practices

### 1. Use Functional Updates

```typescript
// ✅ Good - uses current value
setCount(c => c + 1);

// ❌ Avoid - may use stale value
setCount(count() + 1);
```

### 2. Memoize Expensive Computations

```typescript
// ✅ Good - computed once per dependency change
const filtered = createMemo(() => items().filter(expensive));

// ❌ Avoid - recalculated every access
const filtered = () => items().filter(expensive);
```

### 3. Cleanup Effects

```typescript
// ✅ Good - cleanup on disposal
createEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
});

// ❌ Avoid - memory leak
createEffect(() => {
  setInterval(() => {}, 1000);
});
```

### 4. Batch Related Updates

```typescript
// ✅ Good - single update cycle
batch(() => {
  setName('John');
  setAge(30);
  setEmail('john@example.com');
});

// ❌ Avoid - three update cycles
setName('John');
setAge(30);
setEmail('john@example.com');
```

### 5. Explicit Dependencies with on()

```typescript
// ✅ Good - explicit dependencies
createEffect(on(userId, (id) => {
  fetchUserData(id);
  console.log('Other data:', otherData());
}));

// ❌ Avoid - accidental dependencies
createEffect(() => {
  fetchUserData(userId());
  console.log('Other data:', otherData()); // Unnecessary dependency
});
```

## Performance Tips

1. **Use memos for derived state** - Avoid recomputing values
2. **Batch updates** - Reduce reactive update cycles
3. **Untrack reads** - Avoid unnecessary dependencies
4. **Dispose effects** - Prevent memory leaks
5. **Use on() for explicit deps** - Control when effects run

## See Also

- [Core API](./core.md) - KettleJS core functionality
- [Core Concepts](../core-concepts.md) - Understanding reactivity
- [Store API](./store.md) - Complex state management
- [Context API](./context.md) - Dependency injection

---

**Related:**
- [@fluixi/reactive Documentation](../../reactive/intro.md)
- [Reactivity Deep Dive](../guides/reactivity.md)