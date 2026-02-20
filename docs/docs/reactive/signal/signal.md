---
sidebar_position: 2
---

# Reactive Signals

The Signal module provides a fine-grained reactivity system inspired by SolidJS, but with additional capabilities and extended functionality. Signals form the foundation of the reactive system, allowing for efficient state tracking, computation, and effect management.

## Core Signal Functions

### `createSignal<T>(initialValue, options?)`

Creates a reactive signal with getter and setter functions.

#### Parameters

- `initialValue: T` - The initial value for the signal
- `options?: SignalOptions<T>` - Optional configuration:
  - `equals?: (a: T, b: T) => boolean` - Custom equality function for value comparison
  - `name?: string` - Optional name for debugging

#### Returns

`[Accessor<T>, Setter<T>]` - A tuple containing:
- A getter function to access the current value
- A setter function to update the value

#### Examples

```ts
// Basic signal creation
const [count, setCount] = createSignal(0);
console.log(count()); // 0
setCount(1);
console.log(count()); // 1

// Using function updater
setCount(prev => prev + 1);
console.log(count()); // 2

// With custom equality
const [user, setUser] = createSignal(
  { name: "Alice" },
  { equals: (a, b) => a.name === b.name }
);
```

### `createMemo<T>(fn, value?, options?)`

Creates a memoized computation that automatically tracks dependencies and updates when they change.

#### Parameters

- `fn: () => T` - Function that computes the memo value
- `value?: any` - Optional value (unused, for API compatibility)
- `options?: MemoOptions<T>` - Optional configuration:
  - `equals?: (a: T, b: T) => boolean` - Custom equality function
  - `name?: string` - Optional name for debugging

#### Returns

`Accessor<T>` - A getter function for the computed value

#### Examples

```ts
const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);

console.log(double()); // 0
setCount(5);
console.log(double()); // 10

// With custom equality
const expensiveComputation = createMemo(() => {
  // Complex calculation
  return { result: count() * count() };
}, undefined, { 
  equals: (a, b) => a.result === b.result 
});
```

### `createEffect(fn, value?, options?)`

Creates a reactive effect that automatically runs when its dependencies change.

#### Parameters

- `fn: EffectFn` - Effect function to execute
- `value?: any` - Optional value (passed to first execution)
- `options?: EffectOptions` - Optional configuration:
  - `name?: string` - Optional name for debugging
  - `manual?: boolean` - If true, effect won't run automatically
  - `priority?: number` - Execution priority (higher runs first)

#### Returns

`() => void` - A function to manually trigger the effect

#### Examples

```ts
const [count, setCount] = createSignal(0);

// Basic effect
createEffect(() => {
  console.log("Count changed:", count());
});

// Effect with cleanup
createEffect((prev) => {
  const timer = setInterval(() => console.log(count()), 1000);
  
  // Return cleanup function
  return () => clearInterval(timer);
});

// Manual effect
const runEffect = createEffect(() => {
  console.log("Manual effect:", count());
}, undefined, { manual: true });

// Trigger manually
runEffect();
```

## Advanced Signal Types

### `createRoot(fn)`

Creates a root reactive scope that automatically cleans up all signals, effects, and memos created within it.

#### Parameters

- `fn: (dispose: () => void) => T` - Function to execute within the root scope

#### Returns

`T` - The return value of the provided function

#### Example

```ts
const result = createRoot(dispose => {
  // Create signals, effects, etc.
  const [count, setCount] = createSignal(0);
  
  createEffect(() => {
    console.log("Count:", count());
  });
  
  // Call dispose() to clean up early if needed
  return "Root result";
});
```

### `createAsyncSignal<T>(initialValue, asyncFn, options?)`

Creates a signal that integrates with asynchronous operations, providing loading and error states.

#### Parameters

- `initialValue: T` - Initial signal value
- `asyncFn: AsyncFn<T, Args>` - Async function to execute
- `options?: AsyncSignalOptions<T>` - Signal options

#### Returns

`AsyncSignal<T, Args>` - Object with:
- `get: Accessor<T>` - Value accessor
- `set: Setter<T>` - Value setter
- `loading: Accessor<boolean>` - Loading state
- `error: Accessor<Error | null>` - Error state
- `execute: (...args: Args) => Promise<T>` - Execute the async function
- `reload: () => Promise<T>` - Re-execute with previous args

#### Example

```ts
const userSignal = createAsyncSignal(
  null, 
  async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

// Start the async operation
userSignal.execute(123);

// Use in UI
createEffect(() => {
  if (userSignal.loading()) {
    console.log("Loading...");
  } else if (userSignal.error()) {
    console.log("Error:", userSignal.error().message);
  } else {
    console.log("User:", userSignal.get());
  }
});
```

### `createLazySignal<T>(compute, options?)`

Creates a signal that computes its value only when first accessed.

#### Parameters

- `compute: ComputationFn<T>` - Function to compute the value
- `options?: SignalOptions<T>` - Signal options

#### Returns

`LazySignal<T>` - Object with:
- `get: Accessor<T>` - Value accessor
- `set: Setter<T>` - Value setter
- `node: ReactiveNode` - Node reference

#### Example

```ts
const expensiveValue = createLazySignal(() => {
  console.log("Computing expensive value...");
  return performExpensiveOperation();
});

// Nothing logged yet
console.log("Before accessing");

// Now the computation runs
console.log("Value:", expensiveValue.get());
```

### `createEnhancedSignal<T>(initialValue, options?)`

Creates a signal with enhanced functionality like subscription management and observable conversion.

#### Parameters

- `initialValue: T` - Initial signal value
- `options?: SignalOptions<T>` - Signal options

#### Returns

`EnhancedSignal<T>` - Enhanced signal object with:
- `get: Accessor<T>` - Value accessor
- `set: Setter<T>` - Value setter
- `subscribe: (fn) => () => void` - Subscription function
- `dispose: () => void` - Clean up function
- `toObservable: () => Observable<T>` - Convert to observable

#### Example

```ts
const counter = createEnhancedSignal(0);

// Subscribe to changes
const unsubscribe = counter.subscribe(value => {
  console.log("Counter changed:", value);
});

counter.set(1); // logs "Counter changed: 1"

// Later, clean up
unsubscribe();
```

### `createSignalWithHistory<T>(initialValue, options?)`

Creates a signal that maintains a history of values with undo/redo capability.

#### Parameters

- `initialValue: T` - Initial value
- `options?: SignalWithHistoryOptions<T>` - Options including:
  - `historyLength?: number` - Max history length
  - ...other signal options

#### Returns

`SignalWithHistory<T>` - Object with:
- `get: Accessor<T>` - Value accessor
- `set: Setter<T>` - Value setter
- `undo: () => void` - Undo to previous value
- `redo: () => void` - Redo previously undone value
- `canUndo: Accessor<boolean>` - Check if undo is available
- `canRedo: Accessor<boolean>` - Check if redo is available
- `history: Accessor<T[]>` - Access history array
- `currentIndex: Accessor<number>` - Current position in history

#### Example

```ts
const textInput = createSignalWithHistory("Initial text");

textInput.set("First edit");
textInput.set("Second edit");

textInput.undo(); // Back to "First edit"
console.log(textInput.get()); // "First edit"

textInput.redo(); // Forward to "Second edit"
console.log(textInput.get()); // "Second edit"
```

## Control Flow

### `batch(fn)`

Batches multiple signal updates into a single notification, improving performance.

#### Parameters

- `fn: () => T` - Function containing signal updates

#### Returns

`T` - The return value from the function

#### Example

```ts
const [a, setA] = createSignal(0);
const [b, setB] = createSignal(0);

createEffect(() => {
  console.log("Effect ran:", a(), b());
});

// Without batch: effect runs twice
setA(1); // Effect runs
setB(1); // Effect runs again

// With batch: effect runs once
batch(() => {
  setA(2);
  setB(2);
}); // Effect runs once after both updates
```

### `untrack(fn)`

Executes a function without tracking dependencies.

#### Parameters

- `fn: () => T` - Function to execute without tracking

#### Returns

`T` - The return value from the function

#### Example

```ts
const [count, setCount] = createSignal(0);

createEffect(() => {
  // This will not establish a dependency on count
  const value = untrack(() => count());
  
  console.log("Untracked value:", value);
});

// Effect won't re-run when count changes
setCount(1);
```

## Debugging

### `getNodeStats()`

Returns statistics about the current reactive system.

#### Returns

Object with statistics about nodes in the system

#### Example

```ts
console.log(getNodeStats());
// Output: 
// {
//   total: 5,
//   byType: { signal: 2, memo: 1, effect: 2 },
//   oldest: { type: 'signal', age: 10000 },
//   newest: { type: 'effect', age: 100 },
//   dependencies: [
//     { nodeId: 1, deps: 0, observers: 2 },
//     ...
//   ]
// }
```

### `enableDevMode()`

Enables development mode with additional checks and warnings.

#### Example

```ts
if (process.env.NODE_ENV !== 'production') {
  enableDevMode();
}
```

## Utilities

### `createTrigger()`

Creates a trigger function that notifies observers but doesn't hold a value.

#### Returns

`Trigger` - Object with:
- `get: () => void` - Dependency tracking function
- `set: () => void` - Trigger notification function

#### Example

```ts
const trigger = createTrigger();

createEffect(() => {
  trigger.get(); // Establish dependency
  console.log("Trigger effect ran");
});

// Later, trigger the effect
trigger.set(); // Effect will run
```

### `createDerivedTrigger<T>(source, options?)`

Creates a trigger that fires when a source signal's value changes according to custom criteria.

#### Parameters

- `source: Accessor<T>` - Source signal to derive from
- `options?: DerivedTriggerOptions<T>` - Options:
  - `equals?: (a: T, b: T) => boolean` - Equality function

#### Returns

`EnhancedTrigger` - Trigger with additional utilities

#### Example

```ts
const [position, setPosition] = createSignal({ x: 0, y: 0 });

// Only trigger when x coordinate changes
const xChangeTrigger = createDerivedTrigger(position, {
  equals: (a, b) => a.x === b.x
});

createEffect(() => {
  xChangeTrigger.get();
  console.log("X position changed!");
});

setPosition({ x: 10, y: 0 }); // Effect runs
setPosition({ x: 10, y: 20 }); // Effect doesn't run (x didn't change)
```

### `createThrottledSignal<T>(source, delay)`

Creates a signal that updates at most once per specified time period.

#### Parameters

- `source: Accessor<T>` - Source signal
- `delay: number` - Minimum time between updates in milliseconds

#### Returns

`EnhancedSignal<T>` - Throttled signal

#### Example

```ts
const [position, setPosition] = createSignal({ x: 0, y: 0 });
const throttledPosition = createThrottledSignal(position, 100);

// Update position rapidly
document.addEventListener('mousemove', e => {
  setPosition({ x: e.clientX, y: e.clientY });
});

// But only use throttled value for expensive operations
createEffect(() => {
  const pos = throttledPosition.get();
  performExpensiveRender(pos);
});
```

### `createDebouncedSignal<T>(source, delay)`

Creates a signal that updates only after a specified delay has passed since the last change.

#### Parameters

- `source: Accessor<T>` - Source signal
- `delay: number` - Delay in milliseconds

#### Returns

`EnhancedSignal<T>` - Debounced signal

#### Example

```ts
const [search, setSearch] = createSignal("");
const debouncedSearch = createDebouncedSignal(search, 300);

// Update on input
inputElement.addEventListener('input', e => {
  setSearch(e.target.value);
});

// Only perform search when typing pauses
createEffect(() => {
  const query = debouncedSearch.get();
  if (query.length > 0) {
    performSearch(query);
  }
});
```

# Utilities

### `createDeferred<T>()`

Creates a deferred promise with exposed resolve and reject methods.

#### Returns

`DeferredPromise<T>` - Object with:
- `promise: Promise<T>` - The promise
- `resolve: (value: T | PromiseLike<T>) => void` - Resolve function 
- `reject: (reason?: any) => void` - Reject function

#### Example

```ts
function fetchWithTimeout(url, timeout) {
  const deferred = createDeferred();
  
  fetch(url)
    .then(deferred.resolve)
    .catch(deferred.reject);
    
  setTimeout(() => {
    deferred.reject(new Error("Timeout"));
  }, timeout);
  
  return deferred.promise;
}
```

# Interoperability

### `signalToObservable<T>(signal)`

Converts a signal to an RxJS-compatible Observable.

#### Parameters

- `signal: Signal<T>` - Signal to convert

#### Returns

`Observable<T>` - An observable that emits when the signal changes

#### Example

```ts
const [count, setCount] = createSignal(0);
const count$ = signalToObservable({ get: count, set: setCount });

// Use with RxJS operators
count$.pipe(
  filter(x => x % 2 === 0),
  map(x => x * 10)
).subscribe(x => {
  console.log("Even count × 10:", x);
});
```

### `observableToSignal<T>(observable)`

Converts an RxJS Observable to a signal.

#### Parameters

- `observable: Observable<T>` - Observable to convert

#### Returns

`[Accessor<T | undefined>, Setter<T>, () => void]` - Tuple with:
- Accessor function
- Setter function
- Dispose function to clean up subscription

#### Example

```ts
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

const timer$ = interval(1000).pipe(map(n => n + 1));
const [time, setTime, disposeTimer] = observableToSignal(timer$);

createEffect(() => {
  console.log("Seconds elapsed:", time());
});

// Later cleanup
disposeTimer();
```

## Missing in the API

### `createDeferred<T>()`

Creates a deferred promise with exposed resolve and reject methods.

#### Returns

`DeferredPromise<T>` - Object with:
- `promise: Promise<T>` - The promise
- `resolve: (value: T) => void` - Resolve function
- `reject: (reason?: any) => void` - Reject function

#### Example

```ts
function fetchWithTimeout(url, timeout) {
  const deferred = createDeferred();
  
  fetch(url)
    .then(deferred.resolve)
    .catch(deferred.reject);
    
  setTimeout(() => {
    deferred.reject(new Error("Timeout"));
  }, timeout);
  
  return deferred.promise;
}
```
