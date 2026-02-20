---
sidebar_position: 1
title: Signals
---

# Signals

Signals are the foundation of reactivity in KettleJS. They provide a way to create reactive state that automatically notifies subscribers when the value changes.

## What is a Signal?

A signal is a reactive primitive that holds a value and notifies dependents when that value changes. Think of it as a "smart variable" that the framework can track and respond to.

```typescript
import { createSignal } from '@awc/reactive';

const [count, setCount] = createSignal(0);

// Read the value
console.log(count()); // 0

// Update the value
setCount(5);
console.log(count()); // 5
```

## Creating Signals

### Basic Signal

```typescript
import { createSignal } from '@awc/reactive';

const [value, setValue] = createSignal<string>('initial value');

// Read
const current = value();

// Write
setValue('new value');
```

### Signal with Type Inference

TypeScript will infer the type from the initial value:

```typescript
const [count, setCount] = createSignal(0); // number
const [name, setName] = createSignal('Alice'); // string
const [items, setItems] = createSignal([1, 2, 3]); // number[]
```

### Signal with Explicit Type

For nullable or union types, specify the type explicitly:

```typescript
const [user, setUser] = createSignal<User | null>(null);
const [status, setStatus] = createSignal<'idle' | 'loading' | 'error'>('idle');
```

## Reading Signals

Signals are read by calling them as a function:

```typescript
const [count, setCount] = createSignal(0);

// Reading creates a dependency
const value = count(); // 0

// In templates
html`<p>Count: ${count()}</p>`;
```

**Important:** You must call the signal as a function to read it. Just referencing the signal variable won't work:

```typescript
// ❌ Wrong - doesn't read the value
console.log(count);

// ✅ Correct - reads the value
console.log(count());
```

## Updating Signals

### Direct Update

Set a new value directly:

```typescript
const [count, setCount] = createSignal(0);

setCount(10);
```

### Function Update

Use a function to update based on the previous value:

```typescript
const [count, setCount] = createSignal(0);

// Increment
setCount(prev => prev + 1);

// Decrement
setCount(prev => prev - 1);

// Conditional update
setCount(prev => prev > 0 ? prev - 1 : 0);
```

### Object Updates

For objects, always create a new object (immutable updates):

```typescript
interface User {
  name: string;
  age: number;
}

const [user, setUser] = createSignal<User>({
  name: 'Alice',
  age: 30
});

// ❌ Wrong - mutation doesn't trigger updates
setUser(prev => {
  prev.age = 31;
  return prev;
});

// ✅ Correct - create new object
setUser(prev => ({
  ...prev,
  age: 31
}));
```

### Array Updates

For arrays, also use immutable operations:

```typescript
const [items, setItems] = createSignal<number[]>([1, 2, 3]);

// Add item
setItems(prev => [...prev, 4]);

// Remove item
setItems(prev => prev.filter(item => item !== 2));

// Update item
setItems(prev => prev.map(item => item === 2 ? 20 : item));

// Sort (creates new array)
setItems(prev => [...prev].sort());
```

## Signal Options

Signals accept an optional second parameter for configuration:

```typescript
const [value, setValue] = createSignal('initial', {
  equals: (prev, next) => prev === next,
  name: 'mySignal'
});
```

### Custom Equality

By default, signals use strict equality (`===`) to compare values. You can provide a custom equality function:

```typescript
// Deep equality for objects
import { deepEqual } from '@awc/kettlejs';

const [user, setUser] = createSignal<User>(
  { name: 'Alice', age: 30 },
  { equals: deepEqual }
);

// Now updates only happen if the object deeply changed
```

### Always Update

To force updates even when the value hasn't changed:

```typescript
const [time, setTime] = createSignal(Date.now(), {
  equals: () => false // Always consider values as different
});

// This will trigger updates even if the timestamp is the same
setTime(Date.now());
```

## Reactive Context

Signals only track dependencies when read inside a reactive context:

```typescript
import { createSignal, createEffect } from '@awc/reactive';

const [count, setCount] = createSignal(0);

// ✅ Inside effect - creates dependency
createEffect(() => {
  console.log('Count:', count());
});

// ❌ Outside reactive context - no dependency
console.log('Count:', count());
```

### Reactive Contexts Include:

- **Effects** - `createEffect(() => {...})`
- **Memos** - `createMemo(() => {...})`
- **Component Renders** - Inside component template functions
- **Derived Signals** - Functions that read signals

## Signal Patterns

### Counter Pattern

```typescript
const Counter = () => {
  const [count, setCount] = createSignal(0);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(0);

  return html`
    <div>
      <p>Count: ${count()}</p>
      <button @click=${increment}>+</button>
      <button @click=${decrement}>-</button>
      <button @click=${reset}>Reset</button>
    </div>
  `;
};
```

### Toggle Pattern

```typescript
const Toggle = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  const toggle = () => setIsOpen(!isOpen());

  return html`
    <button @click=${toggle}>
      ${isOpen() ? 'Close' : 'Open'}
    </button>
  `;
};
```

### Form Input Pattern

```typescript
const Form = () => {
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');

  return html`
    <form>
      <input
        type="text"
        .value=${name()}
        @input=${(e: Event) => setName((e.target as HTMLInputElement).value)}
      />
      <input
        type="email"
        .value=${email()}
        @input=${(e: Event) => setEmail((e.target as HTMLInputElement).value)}
      />
    </form>
  `;
};
```

### Loading State Pattern

```typescript
const DataLoader = () => {
  const [loading, setLoading] = createSignal(false);
  const [data, setData] = createSignal<Data | null>(null);
  const [error, setError] = createSignal<Error | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return html`
    ${Show({
      when: loading,
      fallback: Show({
        when: error,
        fallback: Show({
          when: data,
          children: (d) => html`<div>${d.title}</div>`
        }),
        children: html`<div>Error: ${error()?.message}</div>`
      }),
      children: html`<div>Loading...</div>`
    })}
  `;
};
```

### List Management Pattern

```typescript
const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([]);

  const addTodo = (text: string) => {
    const newTodo = { id: Date.now(), text, done: false };
    setTodos([...todos(), newTodo]);
  };

  const removeTodo = (id: number) => {
    setTodos(todos().filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos().map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  return html`
    <ul>
      ${For({
        each: todos,
        children: (todo) => html`
          <li>
            <input
              type="checkbox"
              .checked=${todo.done}
              @change=${() => toggleTodo(todo.id)}
            />
            ${todo.text}
            <button @click=${() => removeTodo(todo.id)}>×</button>
          </li>
        `
      })}
    </ul>
  `;
};
```

## Performance Considerations

### Granular Updates

Signals update only the parts of the DOM that depend on them:

```typescript
const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

// Only the firstName span updates when firstName changes
html`
  <div>
    <span>${firstName()}</span>
    <span>${lastName()}</span>
  </div>
`;
```

### Avoid Unnecessary Signals

Don't create signals for values that never change:

```typescript
// ❌ Unnecessary signal
const [apiUrl] = createSignal('https://api.example.com');

// ✅ Use a constant
const apiUrl = 'https://api.example.com';
```

### Batch Updates

When updating multiple signals, use `batch()` to combine updates:

```typescript
import { batch } from '@awc/reactive';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

// ❌ Two separate updates
setFirstName('Jane');
setLastName('Smith');

// ✅ Single batched update
batch(() => {
  setFirstName('Jane');
  setLastName('Smith');
});
```

## Common Pitfalls

### 1. Forgetting to Call the Signal

```typescript
const [count, setCount] = createSignal(0);

// ❌ Wrong - references the function, not the value
html`<p>Count: ${count}</p>`;

// ✅ Correct - calls the function to get value
html`<p>Count: ${count()}</p>`;
```

### 2. Mutating Objects/Arrays

```typescript
const [user, setUser] = createSignal({ name: 'Alice' });

// ❌ Wrong - mutation doesn't trigger updates
user().name = 'Bob';

// ✅ Correct - create new object
setUser({ ...user(), name: 'Bob' });
```

### 3. Reading Signals Outside Reactive Context

```typescript
const [count, setCount] = createSignal(0);

// ❌ This won't re-run when count changes
const doubled = count() * 2;

// ✅ Use a memo for derived values
const doubled = createMemo(() => count() * 2);
```

### 4. Creating Signals in Loops

```typescript
// ❌ Don't create signals in loops
items.forEach(item => {
  const [selected, setSelected] = createSignal(false);
});

// ✅ Use a signal with a Map or Set
const [selected, setSelected] = createSignal(new Set<number>());
```

## Advanced Patterns

### Computed Signals (Getters)

Create read-only signals derived from other signals:

```typescript
const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

const fullName = createMemo(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
```

### Signal Store Pattern

Group related signals together:

```typescript
const createStore = <T extends object>(initial: T) => {
  const [store, setStore] = createSignal(initial);

  const update = (partial: Partial<T>) => {
    setStore({ ...store(), ...partial });
  };

  return [store, update] as const;
};

const [user, updateUser] = createStore({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});

updateUser({ age: 31 });
```

### Async Signal Pattern

Handle async operations with signals:

```typescript
const createAsyncSignal = <T>(fetcher: () => Promise<T>) => {
  const [loading, setLoading] = createSignal(false);
  const [data, setData] = createSignal<T | null>(null);
  const [error, setError] = createSignal<Error | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, data, error, fetch };
};
```

## Next Steps

- Learn about [Effects](./effects.md) for side effects
- Understand [Memos](./memos.md) for computed values
- Explore [Batching](./batching.md) for optimization
- See [Component Lifecycle](./lifecycle.md) for component integration

## Related Resources

- [API Reference: createSignal](../api-reference/core.md#createsignal)
- [Examples: Signal Patterns](../guides/examples.md#signals)
- [@awc/reactive Documentation](../../reactive/signals.md)