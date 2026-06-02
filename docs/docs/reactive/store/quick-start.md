---
sidebar_position: 0
---

# Quick Start

Get started with reactive stores in 5 minutes.

## Installation

```bash
npm install @fluixi/reactive
```

## Your First Store

```typescript
import { createStore } from '@fluixi/reactive';
import { createEffect } from '@fluixi/reactive';

// Create a store
const [count, setCount] = createStore({ value: 0 });

// React to changes
createEffect(() => {
  console.log('Count:', count.value);
});

// Update the store
setCount('value', 1);
// Output: "Count: 1"
```

## Basic Example: User Profile

```typescript
import { createStore, createEffect, createMemo } from '@fluixi/reactive';

// Define your state
interface UserProfile {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
}

// Create the store
const [user, setUser] = createStore<UserProfile>({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30,
  email: 'alice@example.com'
});

// Create computed values
const fullName = createMemo(() => {
  return `${user.firstName} ${user.lastName}`;
});

// React to changes
createEffect(() => {
  console.log('User:', fullName(), `(${user.age})`);
});
// Output: "User: Alice Johnson (30)"

// Update individual properties
setUser('lastName', 'Smith');
// Output: "User: Alice Smith (30)"

setUser('age', 31);
// Output: "User: Alice Smith (31)"
```

## Working with Arrays

```typescript
import { createStore } from '@fluixi/reactive';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// Create array store
const [todos, setTodos] = createStore<Todo[]>([
  { id: 1, text: 'Learn stores', done: false }
]);

// Add item
setTodos.push('', {
  id: 2,
  text: 'Build app',
  done: false
});

// Update item
setTodos('[0].done', true);

// Update all items
setTodos('[*].done', true);

// Remove item
setTodos.removeAt('', 1);
```

## Nested Objects

```typescript
import { createStore } from '@fluixi/reactive';

const [state, setState] = createStore({
  user: {
    profile: {
      name: 'Alice',
      email: 'alice@example.com'
    },
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
});

// Update nested properties
setState('user.profile.email', 'alice@newdomain.com');
setState('user.settings.theme', 'light');

// Access nested values
console.log(state.user.profile.name); // "Alice"
console.log(state.user.settings.theme); // "light"
```

## Reactive Effects

Effects automatically track which properties they access:

```typescript
const [state, setState] = createStore({
  count: 0,
  name: 'Alice'
});

// This effect only tracks 'count'
createEffect(() => {
  console.log('Count changed:', state.count);
});

// This effect only tracks 'name'
createEffect(() => {
  console.log('Name changed:', state.name);
});

setState('count', 1);  // Only first effect runs
setState('name', 'Bob'); // Only second effect runs
```

## Batching Updates

Combine multiple updates to trigger effects only once:

```typescript
import { batch, createStore, createEffect } from '@fluixi/reactive';

const [state, setState] = createStore({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30
});

let runs = 0;
createEffect(() => {
  state.firstName;
  state.lastName;
  state.age;
  runs++;
});

// Batch multiple updates
batch(() => {
  setState('firstName', 'Alicia');
  setState('lastName', 'Smith');
  setState('age', 31);
});

console.log(runs); // 2 (initial + 1 batched update)
```

## Complete Example: Todo App

```typescript
import { createStore, createMemo, createEffect, batch } from '@fluixi/reactive';

// Types
interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: Date;
}

// Store
const [todos, setTodos] = createStore<Todo[]>([]);

// Computed values
const stats = createMemo(() => ({
  total: todos.length,
  completed: todos.filter(t => t.done).length,
  active: todos.filter(t => !t.done).length
}));

const activeTodos = createMemo(() => {
  return todos.filter(t => !t.done);
});

const completedTodos = createMemo(() => {
  return todos.filter(t => t.done);
});

// Actions
function addTodo(text: string) {
  const todo: Todo = {
    id: Date.now(),
    text,
    done: false,
    createdAt: new Date()
  };
  setTodos.push('', todo);
}

function toggleTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos(`[${index}].done`, (done) => !done);
  }
}

function updateTodoText(id: number, text: string) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos(`[${index}].text`, text);
  }
}

function removeTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos.removeAt('', index);
  }
}

function clearCompleted() {
  batch(() => {
    const completed = completedTodos();
    completed.forEach(todo => removeTodo(todo.id));
  });
}

function toggleAll() {
  const allDone = todos.length > 0 && todos.every(t => t.done);
  setTodos('[*].done', !allDone);
}

// Effects
createEffect(() => {
  const s = stats();
  console.log(`${s.completed}/${s.total} completed, ${s.active} active`);
});

// Usage
addTodo('Learn reactive stores');
addTodo('Build amazing app');
addTodo('Deploy to production');

toggleTodo(todos[0].id);
toggleTodo(todos[1].id);

console.log('Active:', activeTodos().map(t => t.text));
console.log('Completed:', completedTodos().map(t => t.text));

clearCompleted();
console.log('Remaining:', todos.length);
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
    const response = await fetch('/api/data');
    const data = await response.json();
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
  errors: {} as Record<string, string>,
  touched: {} as Record<string, boolean>
});

function handleChange(field: string, value: any) {
  setForm('values', field, value);
  setForm('touched', field, true);
  validateField(field, value);
}

function validateField(field: string, value: any) {
  // Validation logic
  const error = validate(field, value);
  if (error) {
    setForm('errors', field, error);
  } else {
    setForm('errors', field, undefined);
  }
}
```

### Pagination

```typescript
const [state, setState] = createStore({
  items: [] as Item[],
  page: 1,
  pageSize: 10,
  total: 0
});

const paginatedItems = createMemo(() => {
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  return state.items.slice(start, end);
});

const totalPages = createMemo(() => {
  return Math.ceil(state.total / state.pageSize);
});

function nextPage() {
  if (state.page < totalPages()) {
    setState('page', (p) => p + 1);
  }
}

function prevPage() {
  if (state.page > 1) {
    setState('page', (p) => p - 1);
  }
}
```

## Next Steps

- [Overview](./overview.md) - Learn store concepts in depth
- [API Reference](./api-reference.md) - Complete API documentation
- [Arrays](./arrays.md) - Working with reactive arrays
- [Advanced Patterns](./advanced-patterns.md) - Complex use cases

## Tips

1. **Use path updates** - More efficient than function updates
2. **Batch related changes** - Combine updates with `batch()`
3. **Create memos for computed values** - Avoid recalculating
4. **Track only what you need** - Access specific properties
5. **Normalize complex data** - Flat structures are easier to update

## Common Mistakes

### ❌ Don't mutate directly

```typescript
// Wrong
state.count = 1;

// Correct
setState('count', 1);
```

### ❌ Don't recreate objects unnecessarily

```typescript
// Wrong
setState((prev) => ({ ...prev, count: prev.count + 1 }));

// Correct
setState('count', (c) => c + 1);
```

### ❌ Don't forget to batch

```typescript
// Wrong - triggers effects 3 times
setState('a', 1);
setState('b', 2);
setState('c', 3);

// Correct - triggers once
batch(() => {
  setState('a', 1);
  setState('b', 2);
  setState('c', 3);
});
```

## Need Help?

- Check the [Overview](./overview.md) for detailed explanations
- See [API Reference](./api-reference.md) for complete documentation
- Review [Advanced Patterns](./advanced-patterns.md) for complex scenarios