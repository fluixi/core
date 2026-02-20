---
sidebar_position: 2
---

# Store API Reference

Complete API documentation for the reactive store system.

## createStore

Creates a reactive store with fine-grained tracking.

```typescript
function createStore<T>(
  initialState: T,
  options?: StoreOptions<T>
): [Immutable<T>, StoreSetter<T>]
```

### Parameters

- **initialState**: `T` - Initial store state
- **options**: `StoreOptions<T>` (optional) - Configuration options
  - `name?: string` - Store name for debugging
  - `immutable?: boolean` - Enable immutable mode (default: true)
  - `equals?: (a: T, b: T) => boolean` - Custom equality function

### Returns

A tuple containing:
1. **state**: `Immutable<T>` - Reactive proxy to access state
2. **setter**: `StoreSetter<T>` - Function to update state

### Example

```typescript
import { createStore } from '@awc/reactive';

// Basic store
const [user, setUser] = createStore({
  name: 'Alice',
  age: 30
});

// With options
const [state, setState] = createStore(
  { count: 0 },
  { name: 'counter', immutable: true }
);
```

## StoreSetter

The setter returned by `createStore` supports multiple update patterns.

### Path and Value

Update a specific path with a value:

```typescript
setState('path.to.property', value);
```

**Example:**

```typescript
const [user, setUser] = createStore({
  profile: { name: 'Alice', age: 30 }
});

setUser('profile.name', 'Bob');
setUser('profile.age', 31);
```

### Path and Function

Update a path using the current value:

```typescript
setState('path', (currentValue) => newValue);
```

**Example:**

```typescript
const [state, setState] = createStore({ count: 0 });

setState('count', (c) => c + 1);
setState('count', (c) => c * 2);
```

### Function Update

Update the entire state:

```typescript
setState((currentState) => newState);
```

**Example:**

```typescript
const [state, setState] = createStore({ a: 1, b: 2 });

setState((prev) => ({ ...prev, a: prev.a + 1 }));
```

### Partial Object

Merge a partial object into state:

```typescript
setState({ key: value });
```

**Example:**

```typescript
const [user, setUser] = createStore({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});

setUser({ age: 31, email: 'alice@newdomain.com' });
```

## Array Methods

When the store contains arrays, the setter includes special array methods.

### push

Add items to the end of an array:

```typescript
setState.push(path, ...items);
```

**Example:**

```typescript
const [state, setState] = createStore({
  todos: [{ id: 1, text: 'Task 1' }]
});

setState.push('todos', { id: 2, text: 'Task 2' });
setState.push('todos', 
  { id: 3, text: 'Task 3' },
  { id: 4, text: 'Task 4' }
);
```

### pop

Remove and return the last item from an array:

```typescript
const item = setState.pop(path);
```

**Example:**

```typescript
const [state, setState] = createStore({
  items: [1, 2, 3, 4, 5]
});

const last = setState.pop('items');
console.log(last); // 5
console.log(state.items); // [1, 2, 3, 4]
```

### shift

Remove and return the first item from an array:

```typescript
const item = setState.shift(path);
```

**Example:**

```typescript
const [state, setState] = createStore({
  queue: ['first', 'second', 'third']
});

const first = setState.shift('queue');
console.log(first); // 'first'
console.log(state.queue); // ['second', 'third']
```

### insert

Insert an item at a specific index:

```typescript
setState.insert(path, index, value);
```

**Example:**

```typescript
const [state, setState] = createStore({
  items: ['a', 'c', 'd']
});

setState.insert('items', 1, 'b');
console.log(state.items); // ['a', 'b', 'c', 'd']
```

### splice

Remove and/or insert items at a specific position:

```typescript
const removed = setState.splice(path, start, deleteCount, ...items);
```

**Example:**

```typescript
const [state, setState] = createStore({
  items: [1, 2, 3, 4, 5]
});

// Remove 2 items starting at index 1
const removed = setState.splice('items', 1, 2);
console.log(removed); // [2, 3]
console.log(state.items); // [1, 4, 5]

// Remove 1 and insert 2 items
setState.splice('items', 1, 1, 10, 20);
console.log(state.items); // [1, 10, 20, 5]
```

### removeAt

Remove an item at a specific index:

```typescript
const removed = setState.removeAt(path, index);
```

**Example:**

```typescript
const [state, setState] = createStore({
  todos: [
    { id: 1, text: 'Task 1' },
    { id: 2, text: 'Task 2' },
    { id: 3, text: 'Task 3' }
  ]
});

setState.removeAt('todos', 1);
console.log(state.todos.length); // 2
```

## Array Index Selectors

Update array elements using bracket notation.

### Single Index

Update a specific array element:

```typescript
setState('[0]', value);
setState('[0].property', value);
```

**Example:**

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: false }
]);

// Update entire element
setTodos('[0]', { id: 1, text: 'Updated Task', done: true });

// Update property of element
setTodos('[0].done', true);
setTodos('[1].text', 'New text');
```

### Wildcard Selector

Update all array elements:

```typescript
setState('[*]', value);
setState('[*].property', value);
```

**Example:**

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: false },
  { id: 3, text: 'Task 3', done: false }
]);

// Mark all as done
setTodos('[*].done', true);

// Double all values
const [numbers, setNumbers] = createStore([1, 2, 3, 4, 5]);
setNumbers('[*]', (n) => n * 2);
console.log(numbers); // [2, 4, 6, 8, 10]
```

## Reactive Integration

Stores work seamlessly with signals, memos, and effects.

### With Effects

Effects automatically track store property access:

```typescript
import { createEffect } from '@awc/reactive';

const [user, setUser] = createStore({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30
});

// Only tracks firstName and lastName
createEffect(() => {
  console.log(`Name: ${user.firstName} ${user.lastName}`);
});

// This won't trigger the effect
setUser('age', 31);

// This will trigger the effect
setUser('firstName', 'Alicia');
```

### With Memos

Create computed values from store properties:

```typescript
import { createMemo } from '@awc/reactive';

const [user, setUser] = createStore({
  firstName: 'Alice',
  lastName: 'Johnson'
});

const fullName = createMemo(() => {
  return `${user.firstName} ${user.lastName}`;
});

console.log(fullName()); // "Alice Johnson"

setUser('lastName', 'Smith');
console.log(fullName()); // "Alice Smith"
```

### With Batch

Batch multiple store updates:

```typescript
import { batch } from '@awc/reactive';

const [state, setState] = createStore({
  a: 1,
  b: 2,
  c: 3
});

let runs = 0;
createEffect(() => {
  state.a;
  state.b;
  state.c;
  runs++;
});

batch(() => {
  setState('a', 10);
  setState('b', 20);
  setState('c', 30);
});

console.log(runs); // 2 (initial + 1 batched update)
```

## Helper Functions

### createStoreEffect

Create an effect that tracks a specific store path:

```typescript
function createStoreEffect<T, U>(
  state: Immutable<T>,
  selector: (state: Immutable<T>) => U,
  effect: (value: U) => void | (() => void)
): () => void
```

**Example:**

```typescript
import { createStoreEffect } from '@awc/reactive';

const [user, setUser] = createStore({
  profile: { name: 'Alice', age: 30 }
});

// Only tracks user.profile.name
createStoreEffect(
  user,
  (state) => state.profile.name,
  (name) => {
    console.log('Name changed to:', name);
  }
);
```

### createStoreMemo

Create a memo from a store selector:

```typescript
function createStoreMemo<T, U>(
  store: Store<T>,
  selector: (state: Immutable<T>) => U,
  options?: MemoOptions<U>
): () => U
```

**Example:**

```typescript
import { createStoreMemo } from '@awc/reactive';

const [user, setUser] = createStore({
  firstName: 'Alice',
  lastName: 'Johnson'
});

const fullName = createStoreMemo(
  user,
  (state) => `${state.firstName} ${state.lastName}`
);

console.log(fullName()); // "Alice Johnson"
```

## Type Definitions

### `Immutable<T>`


Deep readonly type for store state:

```typescript
type Immutable<T> = T extends Primitive
  ? T
  : T extends Array<infer U>
  ? ReadonlyArray<Immutable<U>>
  : { readonly [K in keyof T]: Immutable<T[K]> };
```

### `StoreOptions<T>`

Configuration options for store creation:

```typescript
interface StoreOptions<T> {
  name?: string;
  immutable?: boolean;
  equals?: (a: T, b: T) => boolean;
}
```

### `SelectorFor<T>`

Type-safe path selector:

```typescript
type SelectorFor<T> = string & {
  // Generates valid paths for T
  // e.g., "user.profile.name" for nested objects
  // e.g., "[0].text" for arrays
};
```

## Special Symbols

### $RAW

Access the raw unproxied value:

```typescript
const rawValue = state[$RAW];
```

**Example:**

```typescript
import { $RAW } from '@awc/reactive';

const [state, setState] = createStore({ count: 0 });

// This doesn't track
const raw = state[$RAW];
console.log(raw.count); // 0
```

### $STORE

Access the store instance from the proxy:

```typescript
const storeInstance = state[$STORE];
```

## Advanced Usage

### Custom Equality

Provide custom equality checking:

```typescript
const [state, setState] = createStore(
  { items: [1, 2, 3] },
  {
    equals: (a, b) => {
      // Custom deep equality
      return JSON.stringify(a) === JSON.stringify(b);
    }
  }
);
```

### Structural Sharing

Stores automatically use structural sharing:

```typescript
const [state, setState] = createStore({
  unchanged: { large: 'object', with: 'data' },
  target: { value: 1 }
});

const before = state.unchanged;
setState('target.value', 2);
const after = state.unchanged;

console.log(before === after); // true (same reference)
```

### Nested Arrays

Work with nested array structures:

```typescript
const [state, setState] = createStore({
  matrix: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ]
});

// Update nested element
setState('matrix[0][1]', 20);

// Update all elements in a row
setState('matrix[0][*]', (n) => n * 10);

// Access in effects
createEffect(() => {
  const sum = state.matrix[0].reduce((a, b) => a + b, 0);
  console.log('Row 0 sum:', sum);
});
```

## Error Handling

### Immutability Errors

Attempting to mutate immutable stores:

```typescript
const [state] = createStore({ count: 0 });

// ❌ This will fail silently or throw in strict mode
state.count = 1;

// ✅ Use the setter
setState('count', 1);
```

### Path Errors

Invalid paths are caught at runtime:

```typescript
const [state, setState] = createStore({ user: { name: 'Alice' } });

// ❌ This will fail if the path doesn't exist
setState('user.invalid.path', 'value');

// ✅ Create the path first or use safe access
setState('user.profile', { email: 'alice@example.com' });
setState('user.profile.email', 'new@email.com');
```

## Performance Tips

1. **Use path updates**: More efficient than function updates for nested properties
2. **Batch related updates**: Combine multiple updates with `batch()`
3. **Normalize data**: Flat structures are easier to update
4. **Use memos**: Cache expensive computations
5. **Avoid unnecessary tracking**: Use `$RAW` for non-reactive access

## See Also

- [Overview](./overview.md) - Store basics and concepts
- [Arrays](./arrays.md) - Working with reactive arrays
- [Advanced Patterns](./advanced-patterns.md) - Complex use cases
- [Performance](./performance.md) - Optimization strategies
