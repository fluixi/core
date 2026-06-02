---
sidebar_position: 1
---

# Store Overview

Fine-grained reactive state management with immutable updates and path-based access.

## What is a Store?

A **Store** is a reactive state container that provides:

- **Fine-grained reactivity** - Track changes at the property level
- **Immutable updates** - Structural sharing for efficient updates
- **Path-based access** - Update nested properties with dot notation
- **Type safety** - Full TypeScript support with path inference
- **Array support** - First-class support for reactive arrays

## Quick Start

```typescript
import { createStore } from '@fluixi/reactive';
import { createEffect } from '@fluixi/reactive';

// Create a store
const [user, setUser] = createStore({
  name: 'Alice',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA'
  },
  hobbies: ['reading', 'coding']
});

// Access properties - automatically tracked in reactive contexts
createEffect(() => {
  console.log(`${user.name} lives in ${user.address.city}`);
});
// Output: "Alice lives in New York"

// Update nested properties
setUser('address.city', 'Los Angeles');
// Output: "Alice lives in Los Angeles"

// Update with function
setUser('age', (age) => age + 1);
console.log(user.age); // 31
```

## Core Concepts

### 1. Fine-Grained Reactivity

Unlike signals that track entire values, stores track individual properties:

```typescript
const [state, setState] = createStore({
  count: 0,
  name: 'Alice'
});

// This effect only tracks 'count'
createEffect(() => {
  console.log('Count:', state.count);
});

// This won't trigger the effect
setState('name', 'Bob');

// This will trigger the effect
setState('count', 1);
```

### 2. Path-Based Updates

Update nested properties without recreating parent objects:

```typescript
const [data, setData] = createStore({
  user: {
    profile: {
      name: 'Alice',
      email: 'alice@example.com'
    }
  }
});

// Update deeply nested property
setData('user.profile.email', 'alice@newdomain.com');

// The store automatically handles structural sharing
console.log(data.user.profile.email);
// Output: "alice@newdomain.com"
```

### 3. Array Support

Arrays are first-class citizens with special methods:

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Learn stores', done: false },
  { id: 2, text: 'Build app', done: false }
]);

// Update array element by index
setTodos('[0].done', true);

// Update all elements with wildcard
setTodos('[*].done', true);

// Array methods
setTodos.push('', { id: 3, text: 'Deploy', done: false });
setTodos.pop('');
setTodos.splice('', 1, 1);
```

### 4. Immutability

Stores are immutable by default - you can't mutate them directly:

```typescript
const [state, setState] = createStore({ count: 0 });

// ❌ This won't work
// state.count = 1;

// ✅ Use the setter
setState('count', 1);
```

## Store vs Signal

| Feature | Signal | Store |
|---------|--------|-------|
| **Granularity** | Tracks entire value | Tracks individual properties |
| **Nested Updates** | Manual spreading | Path-based updates |
| **Arrays** | Standard array | Reactive array methods |
| **Use Case** | Simple values | Complex objects |
| **Performance** | Good for primitives | Better for large objects |

**Use Signals for:**
- Primitive values (numbers, strings, booleans)
- Simple objects that change as a whole
- High-frequency updates

**Use Stores for:**
- Complex nested objects
- Large data structures
- When you need fine-grained updates
- Array-heavy state

## Integration with Signals

Stores work seamlessly with signals and effects:

```typescript
const [user, setUser] = createStore({
  firstName: 'Alice',
  lastName: 'Johnson'
});

// Create a computed value from store
const fullName = createMemo(() => {
  return `${user.firstName} ${user.lastName}`;
});

// Use in effects
createEffect(() => {
  console.log('Full name:', fullName());
});

// Updates trigger the memo and effect
setUser('lastName', 'Smith');
// Output: "Full name: Alice Smith"
```

## TypeScript Support

Full type inference for paths and values:

```typescript
interface User {
  name: string;
  profile: {
    age: number;
    email: string;
  };
}

const [user, setUser] = createStore<User>({
  name: 'Alice',
  profile: {
    age: 30,
    email: 'alice@example.com'
  }
});

// ✅ Type-safe paths
setUser('profile.age', 31);

// ❌ TypeScript error - invalid path
// setUser('profile.invalid', 'value');

// ❌ TypeScript error - wrong type
// setUser('profile.age', 'not a number');
```

## Performance Considerations

### 1. Fine-Grained Updates

Stores only notify observers of changed properties:

```typescript
const [state, setState] = createStore({
  a: 1,
  b: 2,
  c: 3
});

let aRuns = 0, bRuns = 0;

createEffect(() => { state.a; aRuns++; });
createEffect(() => { state.b; bRuns++; });

setState('a', 10);
// Only the first effect runs
console.log(aRuns); // 2
console.log(bRuns); // 1
```

### 2. Structural Sharing

Stores use structural sharing to avoid unnecessary copies:

```typescript
const [data, setData] = createStore({
  unchanged: { large: 'object' },
  target: { value: 1 }
});

setData('target.value', 2);
// Only 'target' is recreated
// 'unchanged' keeps the same reference
```

### 3. Batching

Batch multiple updates to trigger effects only once:

```typescript
import { batch } from '@fluixi/reactive';

const [state, setState] = createStore({
  count: 0,
  name: 'Alice'
});

batch(() => {
  setState('count', 1);
  setState('name', 'Bob');
  setState('count', 2);
});
// Effects run once after batch completes
```

## Best Practices

### 1. Use Path Updates for Nested Properties

```typescript
// ❌ Don't do this
setState((prev) => ({
  ...prev,
  user: {
    ...prev.user,
    profile: {
      ...prev.user.profile,
      email: 'new@email.com'
    }
  }
}));

// ✅ Do this
setState('user.profile.email', 'new@email.com');
```

### 2. Use Memos for Derived State

```typescript
const [todos, setTodos] = createStore([...]);

// ✅ Create a memo for computed values
const completedCount = createMemo(() => {
  return todos.filter(t => t.done).length;
});

// Use in effects
createEffect(() => {
  console.log(`${completedCount()} tasks completed`);
});
```

### 3. Normalize Data When Possible

```typescript
// ❌ Nested arrays are harder to update
const [state, setState] = createStore({
  users: [
    { id: 1, name: 'Alice', posts: [...] }
  ]
});

// ✅ Normalize for easier updates
const [state, setState] = createStore({
  users: { '1': { id: 1, name: 'Alice' } },
  posts: { '1': { id: 1, userId: 1, text: '...' } }
});
```

### 4. Use Batch for Multiple Updates

```typescript
// ❌ Multiple separate updates
setState('a', 1);
setState('b', 2);
setState('c', 3);
// Effects run 3 times

// ✅ Batch updates
batch(() => {
  setState('a', 1);
  setState('b', 2);
  setState('c', 3);
});
// Effects run once
```

## Common Patterns

### Loading State

```typescript
const [state, setState] = createStore({
  data: null,
  loading: false,
  error: null
});

async function fetchData() {
  setState('loading', true);
  setState('error', null);
  
  try {
    const data = await fetch('/api/data').then(r => r.json());
    setState('data', data);
  } catch (error) {
    setState('error', error.message);
  } finally {
    setState('loading', false);
  }
}
```

### Form State

```typescript
const [form, setForm] = createStore({
  values: {
    name: '',
    email: '',
    age: 0
  },
  errors: {},
  touched: {}
});

function handleChange(field: string, value: any) {
  setForm('values', field, value);
  setForm('touched', field, true);
  
  // Validate
  const error = validate(field, value);
  if (error) {
    setForm('errors', field, error);
  } else {
    setForm('errors', field, undefined);
  }
}
```

### List Management

```typescript
const [todos, setTodos] = createStore<Todo[]>([]);

function addTodo(text: string) {
  const newTodo = { id: Date.now(), text, done: false };
  setTodos.push('', newTodo);
}

function toggleTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos(`[${index}].done`, (done) => !done);
  }
}

function removeTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos.removeAt('', index);
  }
}
```

## Next Steps

- [Store API Reference](./api-reference.md) - Complete API documentation
- [Array Operations](./arrays.md) - Working with reactive arrays
- [Advanced Patterns](./advanced-patterns.md) - Complex use cases
- [Performance Tips](./performance.md) - Optimization strategies

## Related

- [Signals](../signal/overview.md) - Simple reactive values
- [Effects](../signal/effects.md) - Reactive side effects
- [Memos](../signal/memos.md) - Computed values