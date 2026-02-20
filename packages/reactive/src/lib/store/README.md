# Reactive Store

A robust, immutable reactive store implementation following SolidJS patterns with proper proxy handling and fine-grained reactivity.

## Overview

This store implementation provides:

- **Immutable by default**: External users cannot mutate the store directly
- **Fine-grained reactivity**: Track individual properties and nested paths
- **Proper proxy handling**: Proxies are bound to store nodes, not values
- **Symbol-based internal access**: Use symbols like `$RAW`, `$NODE`, `$PROXY` for internal state
- **SolidJS compatibility**: Follows SolidJS store patterns and APIs

## Key Concepts

### Store Node Architecture

The store uses a tree-based architecture where each node in the tree represents a part of your state:

```
Root Node (state)
  ├── Property Node (user)
  │   ├── Property Node (name)
  │   └── Property Node (email)
  └── Property Node (items)
      ├── Array Element Node [0]
      └── Array Element Node [1]
```

- Each node manages its own reactivity via signals
- Proxies are created once per node and cached
- Changes propagate through the tree efficiently

### Symbols

The store uses special symbols for internal access:

- `$RAW` - Access raw state without reactivity
- `$NODE` - Access the underlying StoreNode
- `$PROXY` - Check if a value is a proxy
- `$TRACK` - Internal tracking symbol
- `$NAME` - Get the node's debug name
- `$STORE` - Internal store marker

## Basic Usage

### Creating a Store

```typescript
import { createStore } from '@awc/reactive/store';

const [state, setState] = createStore({
  user: {
    name: 'John',
    age: 30
  },
  items: [1, 2, 3]
});
```

### Reading State

The state is a reactive proxy. Access properties normally:

```typescript
// In a reactive context (effect, memo, component)
createEffect(() => {
  console.log(state.user.name); // Tracks user.name
});
```

### Updating State

Use the setter function to update state:

```typescript
// Pattern 1: Update entire state
setState({ user: { name: 'Jane', age: 25 }, items: [4, 5, 6] });

// Pattern 2: Update with function
setState(prev => ({
  ...prev,
  user: { ...prev.user, age: prev.user.age + 1 }
}));

// Pattern 3: Update specific property
setState('user', { name: 'Jane', age: 25 });

// Pattern 4: Update with function at path
setState('user', 'age', age => age + 1);

// Pattern 5: Update nested path
setState('user.name', 'Jane');
```

## Advanced Features

### Batching Updates

Batch multiple updates to trigger effects only once:

```typescript
import { batch } from '@awc/reactive/signal';

batch(() => {
  setState('user', 'name', 'Jane');
  setState('user', 'age', 25);
  setState('items', [4, 5, 6]);
});
// Effects run once after all updates
```

### Produce (Immer-style mutations)

Use `produce` for complex updates with a mutable draft:

```typescript
const store = new Store(initialState);

store.produce(draft => {
  draft.user.name = 'Jane';
  draft.items.push(4);
  draft.user.age += 1;
});
// Automatically creates immutable copy
```

Or use the helper function:

```typescript
import { produce } from '@awc/reactive/store';

const nextState = produce(currentState, draft => {
  draft.user.name = 'Jane';
  draft.items.push(4);
});
```

### Reconcile (Smart Merge)

Reconcile efficiently merges new state with existing state, preserving references where possible:

```typescript
const store = new Store(initialState);

store.reconcile(newState);
// Only changed parts are updated
```

Arrays are reconciled by comparing each element:

```typescript
const [state, setState] = createStore({
  items: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]
});

// Only Item 1 is updated, Item 2 reference is preserved
store.reconcile({
  items: [
    { id: 1, name: 'Updated Item 1' },
    { id: 2, name: 'Item 2' }
  ]
});
```

### Accessing Raw State

Use `unwrap()` to get the raw state without reactivity:

```typescript
import { unwrap } from '@awc/reactive/store';

const raw = unwrap(state);
// raw is not a proxy, won't trigger reactivity

// Or use the symbol
const raw2 = state[$RAW];
```

### Store Node Access

Access the underlying store node for advanced use cases:

```typescript
import { getStoreNode, $NODE } from '@awc/reactive/store';

const node = getStoreNode(state);
// or
const node = state[$NODE];

// Get nested node
const userNode = getStoreNode(state.user);
```

## Immutability

The store is **immutable by default**. Attempts to mutate the proxy directly will fail:

```typescript
const [state, setState] = createStore({ count: 0 });

// ❌ This will NOT work (and shows a warning in dev mode)
state.count = 5;

// ✅ Use the setter instead
setState('count', 5);
```

This is enforced by the proxy handler which rejects direct `set` and `deleteProperty` operations.

## Fine-Grained Reactivity

The store tracks access at the property level:

```typescript
const [state, setState] = createStore({
  user: { name: 'John', age: 30 },
  theme: 'dark'
});

// Effect 1: Only tracks state.user.name
createEffect(() => {
  console.log('Name:', state.user.name);
});

// Effect 2: Only tracks state.theme
createEffect(() => {
  console.log('Theme:', state.theme);
});

// Only Effect 1 runs
setState('user', 'name', 'Jane');

// Only Effect 2 runs
setState('theme', 'light');
```

## API Reference

### `createStore<T>(initialState: T, options?: StoreOptions): [T, StoreSetter<T>]`

Creates a new reactive store.

**Options:**
- `name?: string` - Debug name for the store
- `equals?: false | ((prev, next) => boolean)` - Custom equality function
- `immutable?: boolean` - Enable immutable mode (default: true)

**Returns:** A tuple of `[state, setState]`

### `createMutableStore<T>(initialState: T, options?: StoreOptions): [T, StoreSetter<T>]`

Creates a mutable store. Currently same as `createStore` with `immutable: false`.

### `unwrap<T>(value: T): T`

Unwraps a proxy to get the raw value.

### `getStoreNode<T>(proxy: any): StoreNode<T> | null`

Gets the store node from a proxy.

### `isStoreProxy(value: any): boolean`

Checks if a value is a store proxy.

### `produce<T>(state: T, recipe: (draft: T) => void): T`

Creates new state from a mutable draft (standalone helper).

### `reconcile<T>(current: T, next: T | ((current: T) => T)): T`

Smart merge of states (standalone helper).

### `modifiable<T, R>(state: T, fn: (draft: T) => R): R`

Temporarily allow mutations within a function (uses untrack).

## Comparison with SolidJS Store

This implementation follows SolidJS store patterns:

| Feature | SolidJS | This Implementation |
|---------|---------|---------------------|
| Immutable by default | ✅ | ✅ |
| Fine-grained reactivity | ✅ | ✅ |
| Proxy bound to node | ✅ | ✅ |
| Symbol access ($RAW, etc) | ✅ | ✅ |
| Setter patterns | ✅ | ✅ |
| Produce helper | ✅ | ✅ |
| Reconcile helper | ✅ | ✅ |
| Batching | ✅ | ✅ |
| Array mutation prevention | ✅ | ✅ |

## Differences from Previous Implementation

### Before (Issues)

```typescript
// ❌ Proxies recreated on value changes
// ❌ Symbols attached to values, not proxies
// ❌ Proxy could be mutated from outside
// ❌ Complex signal management
```

### After (Fixed)

```typescript
// ✅ Proxy created once per node, stable across updates
// ✅ Symbols attached to proxy via handler
// ✅ Proxy immutable, mutations only via setter
// ✅ Clean signal-per-property architecture
```

## Performance Considerations

- **Lazy child nodes**: Child nodes are created only when accessed
- **Signal caching**: Property signals are created once and reused
- **Structural sharing**: `reconcile` preserves unchanged references
- **Batched updates**: Multiple updates can be batched to reduce effect runs

## Best Practices

1. **Use batching for multiple updates**:
   ```typescript
   batch(() => {
     setState('a', 1);
     setState('b', 2);
     setState('c', 3);
   });
   ```

2. **Use produce for complex mutations**:
   ```typescript
   store.produce(draft => {
     draft.deeply.nested.value = 42;
     draft.array.push(item);
   });
   ```

3. **Use reconcile for server data**:
   ```typescript
   store.reconcile(await fetchData());
   ```

4. **Access raw state when needed**:
   ```typescript
   const raw = unwrap(state);
   JSON.stringify(raw); // Won't trigger reactivity
   ```

5. **Use specific paths in effects**:
   ```typescript
   // ✅ Good: Specific tracking
   createEffect(() => console.log(state.user.name));
   
   // ❌ Avoid: Tracks everything
   createEffect(() => console.log(state));
   ```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
interface User {
  name: string;
  age: number;
}

interface State {
  user: User;
  items: number[];
}

const [state, setState] = createStore<State>({
  user: { name: 'John', age: 30 },
  items: [1, 2, 3]
});

// Type-safe access
setState('user', 'name', 'Jane'); // ✅
setState('user', 'invalid', 'x'); // ❌ Type error

// Path inference
setState('user.name', 'Jane'); // ✅ Type: string
setState('user.age', 25); // ✅ Type: number
```

## Examples

### Counter

```typescript
const [state, setState] = createStore({ count: 0 });

const increment = () => setState('count', c => c + 1);
const decrement = () => setState('count', c => c - 1);
const reset = () => setState('count', 0);
```

### Todo List

```typescript
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const [state, setState] = createStore<{ todos: Todo[] }>({
  todos: []
});

const addTodo = (text: string) => {
  setState('todos', todos => [
    ...todos,
    { id: Date.now(), text, completed: false }
  ]);
};

const toggleTodo = (id: number) => {
  setState('todos', todos =>
    todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
};

const removeTodo = (id: number) => {
  setState('todos', todos => todos.filter(todo => todo.id !== id));
};
```

### Form State

```typescript
const [form, setForm] = createStore({
  username: '',
  email: '',
  password: '',
  errors: {} as Record<string, string>
});

const updateField = (field: string, value: string) => {
  batch(() => {
    setForm(field, value);
    setForm('errors', field, ''); // Clear error
  });
};

const validate = () => {
  const errors: Record<string, string> = {};
  
  if (!form.username) errors.username = 'Required';
  if (!form.email.includes('@')) errors.email = 'Invalid email';
  if (form.password.length < 8) errors.password = 'Too short';
  
  setForm('errors', errors);
  return Object.keys(errors).length === 0;
};
```

## Debugging

Enable debug names for better tracing:

```typescript
const [state, setState] = createStore(initialState, {
  name: 'appStore'
});

// Each property signal will be named:
// appStore.user
// appStore.user.name
// appStore.user.age
// etc.
```

Access node names:

```typescript
console.log(state[$NAME]); // 'appStore'
console.log(state.user[$NAME]); // 'appStore.user'
```

## License

MIT