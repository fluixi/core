---
sidebar_position: 3
---

# Working with Arrays

Comprehensive guide to reactive arrays in stores.

## Overview

Stores provide first-class support for reactive arrays with:

- **Fine-grained reactivity** - Track individual element changes
- **Array methods** - Push, pop, splice, and more
- **Index selectors** - Update elements by index
- **Wildcard updates** - Update all elements at once
- **Nested arrays** - Full support for multi-dimensional arrays

## Creating Array Stores

```typescript
import { createStore } from '@awc/reactive';

// Simple array
const [numbers, setNumbers] = createStore([1, 2, 3, 4, 5]);

// Array of objects
const [todos, setTodos] = createStore([
  { id: 1, text: 'Learn stores', done: false },
  { id: 2, text: 'Build app', done: false }
]);

// Nested arrays
const [matrix, setMatrix] = createStore([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]);
```

## Accessing Array Elements

Array access is automatically tracked in reactive contexts:

```typescript
const [items, setItems] = createStore([1, 2, 3, 4, 5]);

createEffect(() => {
  // Tracks the entire array iteration
  const sum = items.reduce((acc, val) => acc + val, 0);
  console.log('Sum:', sum);
});

createEffect(() => {
  // Only tracks the first element
  console.log('First:', items[0]);
});
```

## Updating Array Elements

### By Index

Update specific elements using bracket notation:

```typescript
const [items, setItems] = createStore([1, 2, 3, 4, 5]);

// Update single element
setItems('[0]', 10);
console.log(items); // [10, 2, 3, 4, 5]

// Update with function
setItems('[1]', (val) => val * 2);
console.log(items); // [10, 4, 3, 4, 5]
```

### Nested Properties

Update properties of objects in arrays:

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: false }
]);

// Update property of specific element
setTodos('[0].done', true);
setTodos('[1].text', 'Updated task');

// Update with function
setTodos('[0].id', (id) => id + 100);
```

### Wildcard Updates

Update all elements at once using the wildcard selector `[*]`:

```typescript
const [numbers, setNumbers] = createStore([1, 2, 3, 4, 5]);

// Update all elements
setNumbers('[*]', (n) => n * 2);
console.log(numbers); // [2, 4, 6, 8, 10]

// Update property on all objects
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: false }
]);

setTodos('[*].done', true);
// All todos are now marked as done
```

## Array Methods

The store setter provides convenient array methods:

### push()

Add items to the end of an array:

```typescript
const [items, setItems] = createStore([1, 2, 3]);

setItems.push('', 4);
console.log(items); // [1, 2, 3, 4]

// Add multiple items
setItems.push('', 5, 6, 7);
console.log(items); // [1, 2, 3, 4, 5, 6, 7]

// Push to nested array
const [state, setState] = createStore({
  lists: { todos: [1, 2, 3] }
});

setState.push('lists.todos', 4, 5);
```

### pop()

Remove and return the last item:

```typescript
const [items, setItems] = createStore([1, 2, 3, 4, 5]);

const last = setItems.pop('');
console.log(last); // 5
console.log(items); // [1, 2, 3, 4]

// Pop from nested array
const [state, setState] = createStore({
  queue: ['a', 'b', 'c']
});

const item = setState.pop('queue');
console.log(item); // 'c'
```

### shift()

Remove and return the first item:

```typescript
const [queue, setQueue] = createStore(['first', 'second', 'third']);

const first = setQueue.shift('');
console.log(first); // 'first'
console.log(queue); // ['second', 'third']

// Process queue
while (queue.length > 0) {
  const item = setQueue.shift('');
  processItem(item);
}
```

### insert()

Insert an item at a specific index:

```typescript
const [items, setItems] = createStore(['a', 'c', 'd']);

setItems.insert('', 1, 'b');
console.log(items); // ['a', 'b', 'c', 'd']

// Insert at beginning
setItems.insert('', 0, 'start');

// Insert at end
setItems.insert('', items.length, 'end');
```

### splice()

Remove and/or insert items:

```typescript
const [items, setItems] = createStore([1, 2, 3, 4, 5]);

// Remove 2 items starting at index 1
const removed = setItems.splice('', 1, 2);
console.log(removed); // [2, 3]
console.log(items); // [1, 4, 5]

// Remove 1 and insert 2
setItems.splice('', 1, 1, 10, 20);
console.log(items); // [1, 10, 20, 5]

// Insert without removing
setItems.splice('', 2, 0, 15);
console.log(items); // [1, 10, 15, 20, 5]
```

### removeAt()

Remove an item at a specific index:

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1' },
  { id: 2, text: 'Task 2' },
  { id: 3, text: 'Task 3' }
]);

setTodos.removeAt('', 1);
console.log(todos.length); // 2
console.log(todos[1].id); // 3
```

## Reactive Patterns

### Filtering

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: true },
  { id: 3, text: 'Task 3', done: false }
]);

// Reactive filtered list
const activeTodos = createMemo(() => {
  return todos.filter(t => !t.done);
});

createEffect(() => {
  console.log('Active:', activeTodos().length);
});
```

### Mapping

```typescript
const [users, setUsers] = createStore([
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 }
]);

// Reactive mapped values
const names = createMemo(() => {
  return users.map(u => u.name);
});

createEffect(() => {
  console.log('Names:', names().join(', '));
});
```

### Reducing

```typescript
const [cart, setCart] = createStore([
  { id: 1, name: 'Item 1', price: 10, quantity: 2 },
  { id: 2, name: 'Item 2', price: 15, quantity: 1 }
]);

// Reactive total
const total = createMemo(() => {
  return cart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
});

createEffect(() => {
  console.log('Total: $', total());
});
```

### Finding

```typescript
const [items, setItems] = createStore([
  { id: 1, active: false },
  { id: 2, active: true },
  { id: 3, active: false }
]);

// Reactive find
const activeItem = createMemo(() => {
  return items.find(item => item.active);
});

createEffect(() => {
  const item = activeItem();
  if (item) {
    console.log('Active item:', item.id);
  }
});
```

## Nested Arrays

### Multi-dimensional Arrays

```typescript
const [matrix, setMatrix] = createStore([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]);

// Update nested element
setMatrix('[0][1]', 20);
console.log(matrix[0]); // [1, 20, 3]

// Update entire row
setMatrix('[1]', [40, 50, 60]);

// Update all elements in a row
setMatrix('[0][*]', (n) => n * 10);
console.log(matrix[0]); // [10, 200, 30]
```

### Arrays in Objects

```typescript
const [state, setState] = createStore({
  user: {
    name: 'Alice',
    tags: ['admin', 'user']
  }
});

// Update nested array
setState('user.tags[0]', 'superadmin');

// Push to nested array
setState.push('user.tags', 'moderator');

// Update all tags
setState('user.tags[*]', (tag) => tag.toUpperCase());
```

### Arrays of Arrays

```typescript
const [groups, setGroups] = createStore([
  { id: 1, name: 'Group 1', members: ['Alice', 'Bob'] },
  { id: 2, name: 'Group 2', members: ['Charlie', 'David'] }
]);

// Add member to first group
setGroups.push('[0].members', 'Eve');

// Update member in second group
setGroups('[1].members[0]', 'Chuck');

// Remove member
const [state, setState] = createStore(groups);
setState.removeAt('[0].members', 1);
```

## Common Use Cases

### Todo List

```typescript
interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: Date;
}

const [todos, setTodos] = createStore<Todo[]>([]);

// Add todo
function addTodo(text: string) {
  const todo: Todo = {
    id: Date.now(),
    text,
    done: false,
    createdAt: new Date()
  };
  setTodos.push('', todo);
}

// Toggle todo
function toggleTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos(`[${index}].done`, (done) => !done);
  }
}

// Remove todo
function removeTodo(id: number) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    setTodos.removeAt('', index);
  }
}

// Clear completed
function clearCompleted() {
  const [newTodos] = createStore(
    todos.filter(t => !t.done)
  );
  setTodos((state) => newTodos);
}

// Reactive stats
const stats = createMemo(() => ({
  total: todos.length,
  completed: todos.filter(t => t.done).length,
  active: todos.filter(t => !t.done).length
}));
```

### Shopping Cart

```typescript
interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

const [cart, setCart] = createStore<CartItem[]>([]);

// Add item
function addToCart(product: { id: number; name: string; price: number }) {
  const index = cart.findIndex(item => item.productId === product.id);
  
  if (index !== -1) {
    // Increase quantity
    setCart(`[${index}].quantity`, (q) => q + 1);
  } else {
    // Add new item
    setCart.push('', {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }
}

// Update quantity
function updateQuantity(productId: number, quantity: number) {
  const index = cart.findIndex(item => item.productId === productId);
  if (index !== -1) {
    if (quantity <= 0) {
      setCart.removeAt('', index);
    } else {
      setCart(`[${index}].quantity`, quantity);
    }
  }
}

// Remove item
function removeFromCart(productId: number) {
  const index = cart.findIndex(item => item.productId === productId);
  if (index !== -1) {
    setCart.removeAt('', index);
  }
}

// Clear cart
function clearCart() {
  setCart((state) => []);
}

// Reactive totals
const subtotal = createMemo(() => {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

const tax = createMemo(() => subtotal() * 0.1);
const total = createMemo(() => subtotal() + tax());
```

### Data Table

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const [users, setUsers] = createStore<User[]>([]);
const [sortBy, setSortBy] = createSignal<keyof User>('name');
const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('asc');

// Sorted users
const sortedUsers = createMemo(() => {
  const field = sortBy();
  const dir = sortDir();
  
  return [...users].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === 'asc' ? compare : -compare;
  });
});

// Update user
function updateUser(id: number, updates: Partial<User>) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    Object.entries(updates).forEach(([key, value]) => {
      setUsers(`[${index}].${key}`, value);
    });
  }
}

// Delete user
function deleteUser(id: number) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    setUsers.removeAt('', index);
  }
}

// Bulk update
function updateRole(userIds: number[], newRole: string) {
  batch(() => {
    userIds.forEach(id => {
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        setUsers(`[${index}].role`, newRole);
      }
    });
  });
}
```

## Performance Tips

### 1. Use Index Updates

```typescript
// ❌ Slower - finds index twice
const index = items.findIndex(i => i.id === id);
setItems((state) => {
  const newItems = [...state];
  newItems[index] = { ...newItems[index], done: true };
  return newItems;
});

// ✅ Faster - direct index update
const index = items.findIndex(i => i.id === id);
setItems(`[${index}].done`, true);
```

### 2. Batch Array Operations

```typescript
// ❌ Multiple updates trigger multiple effects
setItems('[0]', 10);
setItems('[1]', 20);
setItems('[2]', 30);

// ✅ Batch updates
batch(() => {
  setItems('[0]', 10);
  setItems('[1]', 20);
  setItems('[2]', 30);
});
```

### 3. Use Wildcard for Bulk Updates

```typescript
// ❌ Individual updates
items.forEach((item, index) => {
  setItems(`[${index}].done`, true);
});

// ✅ Single wildcard update
setItems('[*].done', true);
```

### 4. Normalize When Possible

```typescript
// ❌ Nested arrays are harder to update
const [state, setState] = createStore({
  users: [
    { id: 1, name: 'Alice', posts: [...] }
  ]
});

// ✅ Normalized structure
const [state, setState] = createStore({
  users: {
    '1': { id: 1, name: 'Alice' }
  },
  posts: {
    '1': { id: 1, userId: 1, text: '...' }
  }
});
```

## Best Practices

1. **Use memos for computed arrays** - Cache filtered/sorted results
2. **Batch related updates** - Combine multiple changes
3. **Use wildcards carefully** - Good for bulk updates, but triggers all observers
4. **Track only what you need** - Access specific indices instead of iterating when possible
5. **Consider normalization** - Flat structures are easier to update efficiently

## See Also

- [API Reference](./api-reference.md) - Complete API documentation
- [Overview](./overview.md) - Store basics
- [Advanced Patterns](./advanced-patterns.md) - Complex use cases
- [Performance](./performance.md) - Optimization strategies