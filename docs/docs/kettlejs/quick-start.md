---
sidebar_position: 3
---

# Quick Start

Get up and running with KettleJS in 5 minutes! This guide will walk you through creating your first reactive component.

## Create a New Project

The fastest way to start is with the KettleJS CLI:

```bash
# Install CLI globally
npm install -g @awc/kettlejs

# Create new project
kettlejs new my-first-app

# Follow the prompts:
# - Project template: minimal
# - Component mode: lit-html
# - Advanced config: no

# Start development
cd my-first-app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Your First Component

Let's create a simple counter component to understand KettleJS basics.

### Step 1: Create the Component File

Create `src/components/Counter/Counter.ts`:

```typescript
import { html, Component } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';
import './Counter.css';

export const Counter: Component = () => {
  // Create a reactive signal for state
  const [count, setCount] = createSignal(0);

  // Event handlers
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(0);

  // Render template
  return html`
    <div class="counter">
      <h2>Counter Example</h2>
      <div class="display">
        <span class="count">${count()}</span>
      </div>
      <div class="controls">
        <button @click=${decrement}>-</button>
        <button @click=${reset}>Reset</button>
        <button @click=${increment}>+</button>
      </div>
    </div>
  `;
};
```

### Step 2: Add Styles

Create `src/components/Counter/Counter.css`:

```css
.counter {
  padding: 2rem;
  text-align: center;
  border: 2px solid #007bff;
  border-radius: 8px;
  max-width: 400px;
  margin: 2rem auto;
}

.counter h2 {
  color: #007bff;
  margin-bottom: 1.5rem;
}

.display {
  margin: 2rem 0;
}

.count {
  font-size: 4rem;
  font-weight: bold;
  color: #333;
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.controls button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.controls button:first-child,
.controls button:last-child {
  background: #007bff;
  color: white;
}

.controls button:nth-child(2) {
  background: #6c757d;
  color: white;
}

.controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.controls button:active {
  transform: translateY(0);
}
```

### Step 3: Use in Your App

Update `src/App.ts`:

```typescript
import { html, Component } from '@awc/kettlejs';
import { Counter } from './components/Counter/Counter';

export const App: Component = () => {
  return html`
    <div class="app">
      <h1>My KettleJS App</h1>
      ${Counter()}
    </div>
  `;
};
```

### Step 4: See It in Action

Save your files and the browser will hot-reload. You should see a working counter!

## Understanding the Code

### Signals

```typescript
const [count, setCount] = createSignal(0);
```

Signals are reactive primitives that store state:
- `count()` - Getter function that returns current value
- `setCount(value)` - Setter function to update value
- Automatically tracks dependencies
- Updates are batched for efficiency

### Templates

```typescript
html`<div>${count()}</div>`
```

KettleJS uses lit-html for templating:
- Tagged template literals
- Efficient DOM updates
- Reactive bindings with `${}`
- Event listeners with `@eventname`

### Event Handlers

```typescript
<button @click=${increment}>+</button>
```

Event handlers are simple functions:
- Use `@` prefix for events
- Pass function references
- Inline arrow functions work too

## Add Reactivity

Let's add an effect that logs when count changes:

```typescript
import { createSignal, createEffect } from '@awc/reactive/signal';

export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);

  // Effect runs whenever count changes
  createEffect(() => {
    console.log('Count is now:', count());
  });

  // ... rest of component
};
```

## Add Computed Values

Create derived state with memos:

```typescript
import { createSignal, createMemo } from '@awc/reactive/signal';

export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);

  // Computed value that updates automatically
  const doubled = createMemo(() => count() * 2);
  const isEven = createMemo(() => count() % 2 === 0);

  return html`
    <div class="counter">
      <div class="display">
        <p>Count: ${count()}</p>
        <p>Doubled: ${doubled()}</p>
        <p>Is Even: ${isEven() ? 'Yes' : 'No'}</p>
      </div>
      <!-- controls -->
    </div>
  `;
};
```

## Add Conditional Rendering

Use the `Show` component for conditionals:

```typescript
import { html, Component } from '@awc/kettlejs';
import { Show } from '@awc/kettlejs/control-flow';
import { createSignal } from '@awc/reactive/signal';

export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div class="counter">
      <div class="display">${count()}</div>
      
      ${Show({
        when: () => count() > 10,
        children: html`
          <div class="alert">
            Wow! You've clicked more than 10 times!
          </div>
        `
      })}
      
      ${Show({
        when: () => count() < 0,
        children: html`
          <div class="warning">
            Count is negative!
          </div>
        `
      })}
      
      <button @click=${() => setCount(c => c + 1)}>Increment</button>
    </div>
  `;
};
```

## Add List Rendering

Use the `For` component for lists:

```typescript
import { html, Component } from '@awc/kettlejs';
import { For } from '@awc/kettlejs/control-flow';
import { createSignal } from '@awc/reactive/signal';

export const TodoList: Component = () => {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn KettleJS', done: false },
    { id: 2, text: 'Build an app', done: false }
  ]);

  const addTodo = (text: string) => {
    setTodos(current => [
      ...current,
      { id: Date.now(), text, done: false }
    ]);
  };

  const toggleTodo = (id: number) => {
    setTodos(current =>
      current.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  return html`
    <div class="todo-list">
      <h2>Todo List</h2>
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
              <span style="${todo.done ? 'text-decoration: line-through' : ''}">
                ${todo.text}
              </span>
            </li>
          `
        })}
      </ul>
    </div>
  `;
};
```

## Create a Class-Based Component

For web components, use `KettleElement`:

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

@customElement('my-counter')
export class MyCounter extends KettleElement {
  private count = createSignal(0);

  view() {
    return html`
      <div class="counter">
        <p>Count: ${this.count[0]()}</p>
        <button @click=${() => this.count[1](c => c + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

Use it in HTML:

```html
<my-counter></my-counter>
```

## Fetch Data from API

Create a component that loads data:

```typescript
import { html, Component } from '@awc/kettlejs';
import { createResource } from '@awc/kettlejs/resources';

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  return response.json();
}

export const UserProfile: Component = () => {
  const [user, { refetch }] = createResource(
    () => '1', // user ID
    fetchUser
  );

  return html`
    <div class="user-profile">
      ${user.loading ? html`<p>Loading...</p>` : ''}
      ${user.error ? html`<p>Error: ${user.error.message}</p>` : ''}
      ${user() ? html`
        <div>
          <h2>${user()!.name}</h2>
          <p>Email: ${user()!.email}</p>
          <button @click=${refetch}>Refresh</button>
        </div>
      ` : ''}
    </div>
  `;
};
```

## Next Steps

Congratulations! You've learned the basics of KettleJS. Here's what to explore next:

### Core Concepts
- [Signals Deep Dive](./core-concepts/signals.md)
- [Effects and Reactivity](./core-concepts/effects.md)
- [Component Patterns](./core-concepts/components.md)

### Features
- [Control Flow](./features/control-flow.md)
- [Resource Management](./features/resources.md)
- [Routing](./features/routing.md)
- [Context API](./features/context.md)

### Advanced
- [Server-Side Rendering](./advanced/ssr.md)
- [JSX Support](./advanced/jsx.md)
- [React Bridge](./advanced/react-bridge.md)

### Examples
- [Todo App Tutorial](./tutorial/todo-app.md)
- [Real-World Examples](./examples/overview.md)

## Common Patterns

### State Management
```typescript
// Local state
const [state, setState] = createSignal(initialValue);

// Derived state
const computed = createMemo(() => transform(state()));

// Side effects
createEffect(() => {
  console.log('State changed:', state());
});
```

### Conditional Rendering
```typescript
${Show({
  when: condition,
  children: html`<div>Shown when true</div>`,
  fallback: html`<div>Shown when false</div>`
})}
```

### List Rendering
```typescript
${For({
  each: items,
  children: (item, index) => html`<div>${item.name}</div>`
})}
```

### Event Handling
```typescript
<button @click=${handleClick}>Click Me</button>
<input @input=${handleInput} />
<form @submit=${handleSubmit}>
```

## Tips

1. **Always call signals as functions**: `count()` not `count`
2. **Use arrow functions for updates**: `setCount(c => c + 1)`
3. **Memoize expensive computations**: Use `createMemo()`
4. **Clean up effects**: Return cleanup function from `createEffect`
5. **Use `For` for lists**: Better performance than `.map()`

## Getting Help

- [Full Documentation](./intro.md)
- [API Reference](./api/core.md)
- [GitHub Issues](https://github.com/your-org/kettlejs/issues)
- [Discord Community](https://discord.gg/kettlejs)

---

**Next:** [Core Concepts →](./core-concepts.md)