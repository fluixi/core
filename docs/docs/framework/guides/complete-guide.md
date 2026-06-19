---
sidebar_position: 1
title: Complete Guide to Fluixi
---

# Complete Guide to Fluixi

A comprehensive guide to building modern web applications with Fluixi.

## Table of Contents

- [Introduction](#introduction)
- [Core Concepts](#core-concepts)
- [Component Patterns](#component-patterns)
- [State Management](#state-management)
- [Control Flow](#control-flow)
- [Routing](#routing)
- [Data Fetching](#data-fetching)
- [Context & Dependency Injection](#context--dependency-injection)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Introduction

Fluixi is a reactive framework that combines fine-grained reactivity with lit-html templates. It provides a SolidJS-like API with the familiar template syntax of Lit.

### Why Fluixi?

- **Fine-Grained Reactivity**: Updates happen at the signal level, not component level
- **No Virtual DOM**: Direct DOM manipulation for better performance
- **TypeScript First**: Built with TypeScript for excellent type safety
- **Lit Compatible**: Seamlessly integrate with existing Lit projects
- **Small Bundle Size**: ~15KB minified + gzipped

## Core Concepts

### Signals: Reactive State

Signals are the foundation of reactivity in Fluixi:

```typescript
import { createSignal } from '@fluixi/reactive';

const [count, setCount] = createSignal(0);

// Read the value
console.log(count()); // 0

// Update the value
setCount(5);
setCount(prev => prev + 1); // Functional update
```

#### When to Use Signals

- Component state that changes over time
- Form inputs and user interactions
- Data that needs to trigger UI updates
- Shared state between components (via context)

#### When NOT to Use Signals

- Constants that never change
- Computed values (use memos instead)
- Configuration objects
- One-time initialization values

### Effects: Side Effects

Effects run automatically when their dependencies change:

```typescript
import { createEffect } from '@fluixi/reactive';

createEffect(() => {
  console.log('Count is:', count());
});

setCount(10); // Logs: "Count is: 10"
```

#### Common Effect Use Cases

```typescript
// LocalStorage sync
createEffect(() => {
  localStorage.setItem('theme', theme());
});

// API polling
createEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
});

// Document title
createEffect(() => {
  document.title = `${pageTitle()} - My App`;
});

// Analytics tracking
createEffect(() => {
  analytics.track('page_view', { page: currentPage() });
});
```

### Memos: Computed Values

Memos cache computed values and only recalculate when dependencies change:

```typescript
import { createMemo } from '@fluixi/reactive';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

const fullName = createMemo(() => {
  console.log('Computing full name...');
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // "John Doe" (computed)
console.log(fullName()); // "John Doe" (cached)

setFirstName('Jane');
console.log(fullName()); // "Jane Doe" (recomputed)
```

#### Memos vs Effects

| Use Case | Memo | Effect |
|----------|------|--------|
| Computed values | ✅ | ❌ |
| Side effects | ❌ | ✅ |
| Returns value | ✅ | ❌ |
| Cached | ✅ | ❌ |
| Lazy evaluation | ✅ | ❌ |

## Component Patterns

### Functional Components

The simplest way to create components:

```typescript
import { html, Component } from '@fluixi/core';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: Component<ButtonProps> = (props) => {
  const variant = props.variant || 'primary';
  
  return html`
    <button 
      class="btn btn-${variant}"
      @click=${props.onClick}
    >
      ${props.label}
    </button>
  `;
};

// Usage
const App = () => {
  return html`
    ${Button({ 
      label: 'Click Me', 
      onClick: () => console.log('Clicked!') 
    })}
  `;
};
```

### FluixiElement: Custom Elements

For components that need web component features:

```typescript
import { html, createSignal } from '@fluixi/core';
import { FluixiElement } from '@fluixi/core/core';
import { customElement, property } from 'lit/decorators.js';

@customElement('user-card')
export class UserCard extends FluixiElement {
  @property() userId: number = 0;
  
  private [user, setUser] = createSignal<User | null>(null);
  private [loading, setLoading] = createSignal(false);
  
  connectedCallback() {
    super.connectedCallback();
    this.loadUser();
  }
  
  async loadUser() {
    this.setLoading(true);
    try {
      const userData = await fetchUser(this.userId);
      this.setUser(userData);
    } finally {
      this.setLoading(false);
    }
  }
  
  view() {
    return html`
      ${Show({
        when: this.loading,
        fallback: Show({
          when: this.user,
          children: (u) => html`
            <div class="user-card">
              <h3>${u.name}</h3>
              <p>${u.email}</p>
            </div>
          `
        }),
        children: html`<div>Loading...</div>`
      })}
    `;
  }
}

// Usage in HTML
// <user-card userId="123"></user-card>
```

### WithSignals Mixin

Add reactivity to existing Lit elements:

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core';
import { createSignal } from '@fluixi/reactive';

@customElement('counter-element')
export class CounterElement extends WithSignals(LitElement) {
  private count = createSignal(0);
  
  render() {
    return html`
      <div>
        <p>Count: ${this.count[0]()}</p>
        <button @click=${() => this.count[1](this.count[0]() + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

## State Management

### Local State

For component-specific state:

```typescript
const TodoApp = () => {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [input, setInput] = createSignal('');
  
  const addTodo = () => {
    if (input().trim()) {
      setTodos([...todos(), { 
        id: Date.now(), 
        text: input(), 
        done: false 
      }]);
      setInput('');
    }
  };
  
  return html`
    <input 
      .value=${input()}
      @input=${(e: Event) => setInput((e.target as HTMLInputElement).value)}
    />
    <button @click=${addTodo}>Add</button>
    <!-- ... -->
  `;
};
```

### Shared State with Context

For state shared across components:

```typescript
import { createContext, useContext, Provider } from '@fluixi/core/context';

// Create context
interface AppState {
  user: User | null;
  theme: Theme;
  updateUser: (user: User) => void;
  updateTheme: (theme: Theme) => void;
}

const AppContext = createContext<AppState>({
  user: null,
  theme: { mode: 'light' },
  updateUser: () => {},
  updateTheme: () => {}
});

// Provider component
const AppProvider: Component = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [theme, setTheme] = createSignal<Theme>({ mode: 'light' });
  
  const state: AppState = {
    user: user(),
    theme: theme(),
    updateUser: setUser,
    updateTheme: setTheme
  };
  
  return Provider({
    context: AppContext,
    value: state,
    children: props.children
  });
};

// Consumer component
const UserProfile: Component = () => {
  const { user, updateUser } = useContext(AppContext);
  
  return html`
    ${Show({
      when: () => user !== null,
      children: (u) => html`<div>${u.name}</div>`
    })}
  `;
};
```

### Store Pattern

For complex state management:

```typescript
interface TodoStore {
  todos: Accessor<Todo[]>;
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  removeTodo: (id: number) => void;
  filter: Accessor<'all' | 'active' | 'completed'>;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  filteredTodos: Accessor<Todo[]>;
}

const createTodoStore = (): TodoStore => {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [filter, setFilter] = createSignal<'all' | 'active' | 'completed'>('all');
  
  const filteredTodos = createMemo(() => {
    const f = filter();
    const t = todos();
    
    if (f === 'active') return t.filter(todo => !todo.done);
    if (f === 'completed') return t.filter(todo => todo.done);
    return t;
  });
  
  return {
    todos,
    addTodo: (text: string) => {
      setTodos([...todos(), { id: Date.now(), text, done: false }]);
    },
    toggleTodo: (id: number) => {
      setTodos(todos().map(todo => 
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ));
    },
    removeTodo: (id: number) => {
      setTodos(todos().filter(todo => todo.id !== id));
    },
    filter,
    setFilter,
    filteredTodos
  };
};

// Usage
const TodoApp = () => {
  const store = createTodoStore();
  
  return html`
    <!-- Use store methods -->
    <button @click=${() => store.addTodo('New task')}>Add</button>
  `;
};
```

## Control Flow

### Show: Conditional Rendering

```typescript
// Basic show
${Show({
  when: isLoggedIn,
  children: html`<div>Welcome!</div>`
})}

// With fallback
${Show({
  when: user,
  fallback: html`<div>Please log in</div>`,
  children: (u) => html`<div>Hello, ${u.name}</div>`
})}

// Nested conditions
${Show({
  when: loading,
  fallback: Show({
    when: error,
    fallback: Show({
      when: data,
      children: (d) => html`<div>${d}</div>`
    }),
    children: (e) => html`<div>Error: ${e.message}</div>`
  }),
  children: html`<div>Loading...</div>`
})}
```

### For: List Rendering

```typescript
// Basic list
${For({
  each: items,
  children: (item, index) => html`
    <li>${index}: ${item.name}</li>
  `
})}

// With fallback
${For({
  each: items,
  fallback: html`<li>No items</li>`,
  children: (item) => html`<li>${item.name}</li>`
})}

// Complex items
${For({
  each: users,
  children: (user) => html`
    <div class="user-card">
      <h3>${user.name}</h3>
      <p>${user.email}</p>
      <button @click=${() => deleteUser(user.id)}>Delete</button>
    </div>
  `
})}
```

### Switch: Multiple Conditions

```typescript
${Switch({
  fallback: html`<div>Unknown status</div>`,
  children: [
    Match({ 
      when: () => status() === 'loading', 
      children: html`<div>Loading...</div>` 
    }),
    Match({ 
      when: () => status() === 'success', 
      children: html`<div>Success!</div>` 
    }),
    Match({ 
      when: () => status() === 'error', 
      children: html`<div>Error!</div>` 
    })
  ]
})}
```

### Portal: Render Outside Hierarchy

```typescript
const Modal: Component<{ isOpen: boolean }> = (props) => {
  return Show({
    when: () => props.isOpen,
    children: Portal({
      children: html`
        <div class="modal-overlay">
          <div class="modal-content">
            <h2>Modal Title</h2>
            <p>Modal content</p>
          </div>
        </div>
      `
    })
  });
};
```

## Routing

### Basic Router Setup

```typescript
import { createRouter, Router, Link } from '@fluixi/core/router';

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage },
  { path: '/users/:id', component: UserPage },
  { path: '*', component: NotFoundPage }
];

const App = () => {
  const router = createRouter(routes);
  
  return Router({
    router,
    children: html`
      <nav>
        ${Link({ href: '/', children: 'Home' })}
        ${Link({ href: '/about', children: 'About' })}
      </nav>
      <main id="content"></main>
    `
  });
};
```

### Route Parameters

```typescript
import { useParams, useQuery } from '@fluixi/core/router';

const UserPage: Component = () => {
  const params = useParams();
  const query = useQuery();
  
  const [user, setUser] = createSignal<User | null>(null);
  
  createEffect(() => {
    const userId = params.id;
    fetchUser(userId).then(setUser);
  });
  
  return html`
    ${Show({
      when: user,
      children: (u) => html`
        <div>
          <h1>${u.name}</h1>
          <p>User ID: ${params.id}</p>
          <p>Sort: ${query.sort || 'default'}</p>
        </div>
      `
    })}
  `;
};
```

### Navigation

```typescript
import { useNavigate } from '@fluixi/core/router';

const LoginForm: Component = () => {
  const navigate = useNavigate();
  
  const handleLogin = async () => {
    await login(username(), password());
    navigate('/dashboard');
  };
  
  return html`
    <form @submit=${handleLogin}>
      <!-- form fields -->
      <button type="submit">Login</button>
    </form>
  `;
};
```

## Data Fetching

### Using Resources

```typescript
import { createResource } from '@fluixi/core/resources';

const UserProfile: Component = () => {
  const [userId, setUserId] = createSignal(1);
  
  const [user, { refetch, mutate }] = createResource(
    userId,
    async (id) => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    }
  );
  
  return html`
    ${Show({
      when: () => user.loading,
      fallback: Show({
        when: () => user.error,
        fallback: Show({
          when: user,
          children: (u) => html`
            <div>
              <h2>${u.name}</h2>
              <button @click=${refetch}>Refresh</button>
            </div>
          `
        }),
        children: (err) => html`<div>Error: ${err.message}</div>`
      }),
      children: html`<div>Loading...</div>`
    })}
  `;
};
```

### Manual Data Fetching

```typescript
const DataComponent: Component = () => {
  const [data, setData] = createSignal<Data | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  onMount(fetchData);
  
  return html`<!-- render -->`;
};
```

## Context & Dependency Injection

### Theme Context

```typescript
interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
}

const ThemeContext = createContext<Theme>({
  mode: 'light',
  primaryColor: '#007bff'
});

const ThemeProvider: Component = (props) => {
  const [theme, setTheme] = createSignal<Theme>({
    mode: 'light',
    primaryColor: '#007bff'
  });
  
  const toggleMode = () => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light'
    }));
  };
  
  return Provider({
    context: ThemeContext,
    value: theme(),
    children: props.children
  });
};

// Use theme
const ThemedButton: Component = () => {
  const theme = useContext(ThemeContext);
  
  return html`
    <button style="background: ${theme.primaryColor}">
      ${theme.mode === 'dark' ? '☀️' : '🌙'}
    </button>
  `;
};
```

### Service Injection

```typescript
interface ApiService {
  get: (url: string) => Promise<any>;
  post: (url: string, data: any) => Promise<any>;
}

const ApiContext = createContext<ApiService>({
  get: async () => {},
  post: async () => {}
});

const ApiProvider: Component = (props) => {
  const api: ApiService = {
    get: async (url) => {
      const response = await fetch(url);
      return response.json();
    },
    post: async (url, data) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    }
  };
  
  return Provider({
    context: ApiContext,
    value: api,
    children: props.children
  });
};

// Use API service
const DataComponent: Component = () => {
  const api = useContext(ApiContext);
  const [data, setData] = createSignal(null);
  
  onMount(async () => {
    const result = await api.get('/api/data');
    setData(result);
  });
  
  return html`<!-- render -->`;
};
```

## Performance Optimization

### Batching Updates

```typescript
import { batch } from '@fluixi/reactive';

const updateMultiple = () => {
  // Without batch - triggers multiple updates
  setFirstName('Jane');
  setLastName('Smith');
  setAge(30);
  
  // With batch - single update
  batch(() => {
    setFirstName('Jane');
    setLastName('Smith');
    setAge(30);
  });
};
```

### Memoization

```typescript
// Expensive computation
const filteredAndSorted = createMemo(() => {
  console.log('Computing...');
  return items()
    .filter(item => item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
});

// Only recomputes when items changes
html`${For({ each: filteredAndSorted, children: renderItem })}`;
```

### Untrack for Snapshots

```typescript
import { untrack } from '@fluixi/reactive';

createEffect(() => {
  trigger(); // Tracked
  
  // Read current value without tracking
  const snapshot = untrack(() => data());
  console.log('Snapshot:', snapshot);
});
```

### Lazy Loading

```typescript
const LazyComponent = () => {
  const [Component, setComponent] = createSignal<Component | null>(null);
  
  const loadComponent = async () => {
    const module = await import('./HeavyComponent');
    setComponent(() => module.HeavyComponent);
  };
  
  return html`
    <button @click=${loadComponent}>Load Component</button>
    ${Show({
      when: Component,
      children: (C) => html`${C()}`
    })}
  `;
};
```

## Testing

### Testing Components

```typescript
import { describe, it, expect } from 'vitest';
import { render, html } from '@fluixi/core';

describe('Counter', () => {
  it('increments count', async () => {
    const container = document.createElement('div');
    
    render(Counter, container);
    
    const button = container.querySelector('button');
    const display = container.querySelector('p');
    
    expect(display?.textContent).toBe('Count: 0');
    
    button?.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(display?.textContent).toBe('Count: 1');
  });
});
```

### Testing Signals

```typescript
import { createSignal, createEffect } from '@fluixi/reactive';

describe('Signals', () => {
  it('updates effects', () => {
    const [count, setCount] = createSignal(0);
    let effectRuns = 0;
    
    createEffect(() => {
      count();
      effectRuns++;
    });
    
    expect(effectRuns).toBe(1);
    
    setCount(1);
    expect(effectRuns).toBe(2);
  });
});
```

## Best Practices

### 1. Component Organization

```typescript
// ✅ Good - small, focused components
const UserCard: Component<{ user: User }> = ({ user }) => {
  return html`
    <div class="user-card">
      <h3>${user.name}</h3>
      <p>${user.email}</p>
    </div>
  `;
};

const UserList: Component<{ users: User[] }> = ({ users }) => {
  return html`
    <div class="user-list">
      ${For({
        each: () => users,
        children: (user) => UserCard({ user })
      })}
    </div>
  `;
};
```

### 2. Signal Naming

```typescript
// ✅ Good - descriptive names
const [isLoading, setIsLoading] = createSignal(false);
const [currentUser, setCurrentUser] = createSignal(null);
const [todoItems, setTodoItems] = createSignal([]);

// ❌ Bad - vague names
const [flag, setFlag] = createSignal(false);
const [data, setData] = createSignal(null);
```

### 3. Effect Cleanup

```typescript
// ✅ Good - proper cleanup
createEffect(() => {
  const ws = new WebSocket('ws://example.com');
  
  ws.onmessage = (e) => console.log(e.data);
  
  return () => {
    ws.close();
  };
});
```

### 4. Type Safety

```typescript
// ✅ Good - fully typed
interface TodoProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TodoItem: Component<TodoProps> = (props) => {
  return html`<!-- ... -->`;
};
```

### 5. Avoid Prop Drilling

```typescript
// ❌ Bad - prop drilling
const GrandChild = ({ theme }: { theme: Theme }) => html`...`;
const Child = ({ theme }: { theme: Theme }) => GrandChild({ theme });
const Parent = () => {
  const [theme] = createSignal<Theme>({ mode: 'light' });
  return Child({ theme: theme() });
};

// ✅ Good - use context
const ThemeContext = createContext<Theme>({ mode: 'light' });
const GrandChild = () => {
  const theme = useContext(ThemeContext);
  return html`...`;
};
```

## Conclusion

Fluixi provides a powerful, reactive framework for building modern web applications. Key takeaways:

- Use **signals** for reactive state
- Use **effects** for side effects
- Use **memos** for computed values
- Leverage **control flow** components for cleaner code
- Use **context** to avoid prop drilling
- Always **type your components** with TypeScript
- **Test** your components and logic
- Follow **best practices** for maintainable code

For more information, check out:
- [API Reference](../api-reference/core.md)
- [Examples Repository](https://github.com/adafri/fluixi-examples)
- [Community Discord](https://discord.gg/fluixi)

Happy coding! 🫖