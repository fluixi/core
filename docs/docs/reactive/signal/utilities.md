---
sidebar_position: 4
---


# Signal Utilities

The Signal Utilities module provides helper functions for transforming, combining, and manipulating reactive signals. These utilities make it easier to work with signals in various common scenarios and implement reactive patterns.

## Transformation Utilities

### `map<T, U>(signal, fn, options?)`

Transform a signal value through a mapping function.

#### Parameters

- `signal: Accessor<T>` - Source signal to transform
- `fn: (value: T) => U` - Mapping function to apply to signal value
- `options?: MemoOptions<U>` - Memo options for equality checking

#### Returns

`Accessor<U>` - New accessor with transformed value

#### Example

```typescript
const count = createSignal(5);
const doubled = map(count[0], x => x * 2);
console.log(doubled()); // 10
```

### `filter<T>(signal, predicate, options?)`

Filter an array signal using a predicate function.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `predicate: (value: T, index: number) => boolean` - Filter function to test each element
- `options?: MemoOptions<T[]>` - Memo options for equality checking

#### Returns

`Accessor<T[]>` - New accessor with filtered array

#### Example

```typescript
const [numbers] = createSignal([1, 2, 3, 4, 5]);
const evens = filter(numbers, x => x % 2 === 0);
console.log(evens()); // [2, 4]
```

### `reduce<T, U>(signal, reducer, initialValue, options?)`

Reduce an array signal to a single value.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `reducer: (accumulator: U, current: T, index: number) => U` - Reducer function
- `initialValue: U` - Initial accumulator value
- `options?: MemoOptions<U>` - Memo options for equality checking

#### Returns

`Accessor<U>` - New accessor with reduced value

#### Example

```typescript
const [numbers] = createSignal([1, 2, 3, 4, 5]);
const sum = reduce(numbers, (acc, x) => acc + x, 0);
console.log(sum()); // 15
```

### `find<T>(signal, predicate, options?)`

Find first element in array signal matching predicate.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `predicate: (value: T, index: number) => boolean` - Predicate function to test elements
- `options?: MemoOptions<T | undefined>` - Memo options for equality checking

#### Returns

`Accessor<T | undefined>` - New accessor with found element or undefined

#### Example

```typescript
const [users] = createSignal([
  { id: 1, name: 'Alice' }, 
  { id: 2, name: 'Bob' }
]);
const user = find(users, u => u.id === 2);
console.log(user()?.name); // 'Bob'
```

### `sort<T>(signal, compareFn?, options?)`

Sort an array signal.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `compareFn?: (a: T, b: T) => number` - Optional compare function for sorting
- `options?: MemoOptions<T[]>` - Memo options for equality checking

#### Returns

`Accessor<T[]>` - New accessor with sorted array

#### Example

```typescript
const [numbers] = createSignal([3, 1, 4, 1, 5]);
const sorted = sort(numbers);
console.log(sorted()); // [1, 1, 3, 4, 5]
```

### `distinct<T>(signal, options?)`

Get unique values from array signal.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `options?: MemoOptions<T[]>` - Memo options for equality checking

#### Returns

`Accessor<T[]>` - New accessor with unique values

#### Example

```typescript
const [numbers] = createSignal([1, 2, 2, 3, 3, 3, 4]);
const unique = distinct(numbers);
console.log(unique()); // [1, 2, 3, 4]
```

## Array Testing Utilities

### `some<T>(signal, predicate, options?)`

Check if any element in array signal matches predicate.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `predicate: (value: T, index: number) => boolean` - Predicate function to test elements
- `options?: MemoOptions<boolean>` - Memo options for equality checking

#### Returns

`Accessor<boolean>` - New accessor returning boolean

#### Example

```typescript
const [numbers] = createSignal([1, 2, 3, 4, 5]);
const hasEven = some(numbers, x => x % 2 === 0);
console.log(hasEven()); // true
```

### `every<T>(signal, predicate, options?)`

Check if all elements in array signal match predicate.

#### Parameters

- `signal: Accessor<T[]>` - Source signal containing array
- `predicate: (value: T, index: number) => boolean` - Predicate function to test elements
- `options?: MemoOptions<boolean>` - Memo options for equality checking

#### Returns

`Accessor<boolean>` - New accessor returning boolean

#### Example

```typescript
const [numbers] = createSignal([2, 4, 6, 8]);
const allEven = every(numbers, x => x % 2 === 0);
console.log(allEven()); // true
```

## Combination Utilities

### `combine<T extends any[], U>(signals, combiner, options?)`

Combine multiple signals into a single computed signal.

#### Parameters

- `signals: { [K in keyof T]: Accessor<T[K]> }` - Array of signals to combine
- `combiner: (values: T) => U` - Function to combine signal values
- `options?: MemoOptions<U>` - Memo options for equality checking

#### Returns

`Accessor<U>` - New accessor with combined value

#### Example

```typescript
const [a] = createSignal(1);
const [b] = createSignal(2);
const sum = combine([a, b], ([x, y]) => x + y);
console.log(sum()); // 3
```

### `merge<T>(primary, fallback, options?)`

Merge two signals, returning value from first truthy signal.

#### Parameters

- `primary: Accessor<T>` - Primary signal
- `fallback: Accessor<T>` - Fallback signal if primary is falsy
- `options?: MemoOptions<T>` - Memo options for equality checking

#### Returns

`Accessor<T>` - New accessor with merged value

#### Example

```typescript
const [user] = createSignal(null);
const [guest] = createSignal({ name: 'Guest' });
const current = merge(user, guest);
console.log(current()?.name); // 'Guest'
```

### `zip<T, U, V>(a, b, operator, options?)`

Combine two signals using a binary operator.

#### Parameters

- `a: Accessor<T>` - First signal
- `b: Accessor<U>` - Second signal
- `operator: (a: T, b: U) => V` - Binary operator function
- `options?: MemoOptions<V>` - Memo options for equality checking

#### Returns

`Accessor<V>` - New accessor with combined value

#### Example

```typescript
const [x] = createSignal(5);
const [y] = createSignal(3);
const product = zip(x, y, (a, b) => a * b);
console.log(product()); // 15
```

## Selection Utilities

### `select<T, U>(signal, selector, equals?)`

Select a derived value from a signal with custom equality.

#### Parameters

- `signal: Accessor<T>` - Source signal
- `selector: (value: T) => U` - Function to select value from signal
- `equals?: (a: U, b: U) => boolean` - Optional equality function

#### Returns

`Accessor<U>` - New accessor with selected value

#### Example

```typescript
const [user] = createSignal({ id: 1, name: 'Alice', age: 30 });
const userName = select(user, u => u.name);
// Only updates when name changes, not when age changes
```

### `pick<T, K extends keyof T>(signal, keys, options?)`

Pick specific properties from an object signal.

#### Parameters

- `signal: Accessor<T>` - Source signal containing object
- `keys: K[]` - Array of property keys to pick
- `options?: MemoOptions<Pick<T, K>>` - Memo options for equality checking

#### Returns

`Accessor<Pick<T, K>>` - New accessor with picked properties

#### Example

```typescript
const [user] = createSignal({
  id: 1,
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});
const userData = pick(user, ['name', 'email']);
console.log(userData()); // { name: 'Alice', email: 'alice@example.com' }
```

### `omit<T, K extends keyof T>(signal, keys, options?)`

Omit specific properties from an object signal.

#### Parameters

- `signal: Accessor<T>` - Source signal containing object
- `keys: K[]` - Array of property keys to omit
- `options?: MemoOptions<Omit<T, K>>` - Memo options for equality checking

#### Returns

`Accessor<Omit<T, K>>` - New accessor with omitted properties

#### Example

```typescript
const [user] = createSignal({
  id: 1,
  name: 'Alice',
  age: 30,
  password: 'secret'
});
const safeUser = omit(user, ['password']);
console.log(safeUser()); // { id: 1, name: 'Alice', age: 30 }
```

## Conditional Utilities

### `when<T>(condition, whenTrue, whenFalse, options?)`

Conditionally compute signal based on condition.

#### Parameters

- `condition: Accessor<boolean>` - Condition signal or accessor
- `whenTrue: Accessor<T>` - Accessor to use when condition is true
- `whenFalse: Accessor<T>` - Accessor to use when condition is false
- `options?: MemoOptions<T>` - Memo options for equality checking

#### Returns

`Accessor<T>` - New accessor with conditional value

#### Example

```typescript
const [isLoggedIn] = createSignal(false);
const [user] = createSignal({ name: 'Alice' });
const [guest] = createSignal({ name: 'Guest' });
const currentUser = when(isLoggedIn, user, guest);
console.log(currentUser()?.name); // 'Guest'
```

### `guard<T>(condition, accessor, options?)`

Compute signal only when condition is true, otherwise return undefined.

#### Parameters

- `condition: Accessor<boolean>` - Condition signal or accessor
- `accessor: Accessor<T>` - Accessor to use when condition is true
- `options?: MemoOptions<T | undefined>` - Memo options for equality checking

#### Returns

`Accessor<T | undefined>` - New accessor with conditional value or undefined

#### Example

```typescript
const [showDetails] = createSignal(false);
const [details] = createSignal({ info: 'Details here' });
const visibleDetails = guard(showDetails, details);
console.log(visibleDetails()); // undefined (when showDetails is false)
```

## Timing Utilities

### `debounce<T>(signal, delay, options?)`

Debounce a signal - only update after delay period with no changes.

#### Parameters

- `signal: Accessor<T>` - Source signal to debounce
- `delay: number` - Delay in milliseconds
- `options?: MemoOptions<T>` - Memo options for equality checking

#### Returns

`Accessor<T>` - New accessor with debounced value

#### Example

```typescript
const [search] = createSignal('');
const debouncedSearch = debounce(search, 300);
// debouncedSearch only updates 300ms after last search change
```

### `throttle<T>(signal, delay, options?)`

Throttle a signal - limit update frequency.

#### Parameters

- `signal: Accessor<T>` - Source signal to throttle
- `delay: number` - Minimum delay between updates in milliseconds
- `options?: MemoOptions<T>` - Memo options for equality checking

#### Returns

`Accessor<T>` - New accessor with throttled value

#### Example

```typescript
const [scroll] = createSignal(0);
const throttledScroll = throttle(scroll, 100);
// throttledScroll updates at most once per 100ms
```

### Additional Utilities

### `createDeferred<T>()`

Creates a deferred promise with exposed resolve and reject methods, similar to jQuery's $.Deferred or the Promise constructor pattern.

#### Returns

`DeferredPromise<T>` - Object with:
- `promise: Promise<T>` - The promise
- `resolve: (value: T | PromiseLike<T>) => void` - Resolve function
- `reject: (reason?: any) => void` - Reject function

#### Example

```typescript
function fetchWithTimeout(url, timeoutMs) {
  const { promise, resolve, reject } = createDeferred();
  
  fetch(url)
    .then(resolve)
    .catch(reject);
  
  const timeoutId = setTimeout(() => {
    reject(new Error('Request timeout'));
  }, timeoutMs);
  
  return promise.finally(() => clearTimeout(timeoutId));
}

// Usage
const data = await fetchWithTimeout('/api/data', 5000);
```

#### Advanced Example

```typescript
function raceWithRetry(promises, retryCount = 3) {
  const { promise, resolve, reject } = createDeferred();
  let attempts = 0;
  
  function attempt() {
    attempts++;
    Promise.race(promises)
      .then(resolve)
      .catch(error => {
        if (attempts < retryCount) {
          console.warn(`Attempt ${attempts} failed, retrying...`);
          setTimeout(attempt, 1000 * attempts);
        } else {
          reject(error);
        }
      });
  }
  
  attempt();
  return promise;
}
```
