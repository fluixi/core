<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/kettlejs

**A modern, reactive UI framework with fine-grained reactivity, routing and SSR.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)
![Framework](https://img.shields.io/badge/framework-KettleJS%20%F0%9F%AB%96-ff6b35)

---

A modern, reactive framework for building web applications with [lit-html](https://lit.dev) and fine-grained reactivity, inspired by [SolidJS](https://www.solidjs.com/).

## Features

- 🚀 **Fine-grained Reactivity** - Powered by `@fluixi/reactive` for efficient, surgical updates
- 🎯 **lit-html Integration** - Leverage the power and simplicity of lit-html templates
- 🔄 **Control Flow Components** - Show, For, Switch, Portal, and Dynamic components
- 🛣️ **Built-in Router** - Client-side routing with nested routes and lazy loading
- 📡 **Resource Management** - Async data fetching with automatic loading states
- 🎭 **Context API** - Share state across component trees without prop drilling
- 🏗️ **TypeScript First** - Full type safety and excellent IDE support
- 🛠️ **CLI Tools** - Project and component generators for rapid development
- 📦 **Zero Runtime Overhead** - Compile-time optimizations for minimal bundle size

## Installation

```bash
npm install @fluixi/kettlejs @fluixi/reactive lit
# or
yarn add @fluixi/kettlejs @fluixi/reactive lit
# or
pnpm add @fluixi/kettlejs @fluixi/reactive lit
```

## Quick Start

### Creating a New Project

```bash
# Using the CLI
npx @fluixi/kettlejs new my-app

# Or install globally
npm install -g @fluixi/kettlejs
kettlejs new my-app
```

### Basic Example

```typescript
import { createSignal, render, html } from '@fluixi/kettlejs';

const Counter = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div>
      <h1>Count: ${count()}</h1>
      <button @click=${() => setCount(count() + 1)}>Increment</button>
      <button @click=${() => setCount(count() - 1)}>Decrement</button>
      <button @click=${() => setCount(0)}>Reset</button>
    </div>
  `;
};

render(Counter, document.getElementById('app')!);
```

## Core Concepts

### Signals

Signals are the foundation of reactivity in KettleJS. They create reactive state that automatically updates the UI when changed.

```typescript
import { createSignal, createEffect } from '@fluixi/kettlejs';

const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('Alice');

// Effects run automatically when dependencies change
createEffect(() => {
  console.log(`${name()} has counted to ${count()}`);
});

setCount(5); // Logs: "Alice has counted to 5"
setName('Bob'); // Logs: "Bob has counted to 5"
```

### Components

Components are pure functions that return lit-html templates. They can use reactive primitives to manage state.

```typescript
import { html, createSignal, Component, ComponentProps } from '@fluixi/kettlejs';

interface GreetingProps extends ComponentProps {
  initialName?: string;
}

const Greeting: Component<GreetingProps> = (props) => {
  const [name, setName] = createSignal(props.initialName || 'World');

  return html`
    <div>
      <h1>Hello, ${name()}!</h1>
      <input
        type="text"
        .value=${name()}
        @input=${(e: Event) => setName((e.target as HTMLInputElement).value)}
      />
    </div>
  `;
};
```

### Control Flow

KettleJS provides control flow components for conditional rendering and lists.

#### Show - Conditional Rendering

```typescript
import { Show, createSignal, html } from '@fluixi/kettlejs';

const UserProfile = () => {
  const [user, setUser] = createSignal<User | null>(null);
  const [loading, setLoading] = createSignal(true);

  return html`
    ${Show({
      when: loading,
      fallback: Show({
        when: user,
        fallback: html`<p>No user found</p>`,
        children: (u) => html`<p>Welcome, ${u.name}!</p>`
      }),
      children: html`<p>Loading...</p>`
    })}
  `;
};
```

#### For - List Rendering

```typescript
import { For, createSignal, html } from '@fluixi/kettlejs';

const TodoList = () => {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn KettleJS', done: false },
    { id: 2, text: 'Build an app', done: false },
  ]);

  return html`
    <ul>
      ${For({
        each: todos,
        children: (todo, index) => html`
          <li>
            <input
              type="checkbox"
              .checked=${todo.done}
              @change=${(e) => {
                const newTodos = [...todos()];
                newTodos[index].done = e.target.checked;
                setTodos(newTodos);
              }}
            />
            ${todo.text}
          </li>
        `
      })}
    </ul>
  `;
};
```

#### Switch/Match - Multiple Conditions

```typescript
import { Switch, Match, createSignal, html } from '@fluixi/kettlejs';

const StatusView = () => {
  const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');

  return html`
    ${Switch({
      children: [
        Match({ when: () => status() === 'loading', children: html`<p>Loading...</p>` }),
        Match({ when: () => status() === 'success', children: html`<p>Success!</p>` }),
        Match({ when: () => status() === 'error', children: html`<p>Error!</p>` })
      ]
    })}
  `;
};
```

#### Portal - Render Outside Hierarchy

```typescript
import { Portal, createSignal, Show, html } from '@fluixi/kettlejs';

const Modal = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return html`
    <button @click=${() => setIsOpen(true)}>Open Modal</button>

    ${Show({
      when: isOpen,
      children: Portal({
        children: html`
          <div class="modal-overlay">
            <div class="modal-content">
              <h2>Modal Title</h2>
              <p>Modal content goes here</p>
              <button @click=${() => setIsOpen(false)}>Close</button>
            </div>
          </div>
        `
      })
    })}
  `;
};
```

### Resources

Resources handle async data fetching with built-in loading and error states.

```typescript
import { createResource, Show, html } from '@fluixi/kettlejs';

interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

const UserDetail = () => {
  const [userId, setUserId] = createSignal(1);
  const [user, { refetch }] = createResource(() => userId(), fetchUser);

  return html`
    ${Show({
      when: user.loading,
      fallback: Show({
        when: user.error,
        fallback: Show({
          when: user,
          children: (u) => html`
            <div>
              <h2>${u.name}</h2>
              <p>${u.email}</p>
              <button @click=${refetch}>Refresh</button>
            </div>
          `
        }),
        children: html`<p>Error: ${user.error?.message}</p>`
      }),
      children: html`<p>Loading user...</p>`
    })}
  `;
};
```

### Context API

Share state across component trees without prop drilling.

```typescript
import { createContext, useContext, Provider, html } from '@fluixi/kettlejs';

interface Theme {
  primaryColor: string;
  secondaryColor: string;
}

const ThemeContext = createContext<Theme>({
  primaryColor: '#007bff',
  secondaryColor: '#6c757d'
});

const ThemedButton = () => {
  const theme = useContext(ThemeContext);

  return html`
    <button style="background: ${theme.primaryColor}">
      Themed Button
    </button>
  `;
};

const App = () => {
  const theme = { primaryColor: '#28a745', secondaryColor: '#dc3545' };

  return Provider({
    context: ThemeContext,
    value: theme,
    children: html`
      <div>
        <h1>My App</h1>
        ${ThemedButton()}
      </div>
    `
  });
};
```

### Router

Built-in client-side routing with nested routes and lazy loading.

```typescript
import { createRouter, Router, Link, useParams, html } from '@fluixi/kettlejs';

const Home = () => html`<h1>Home Page</h1>`;

const UserDetail = () => {
  const params = useParams();
  return html`<h1>User ${params.id}</h1>`;
};

const routes = [
  { path: '/', component: Home },
  { path: '/users/:id', component: UserDetail },
  { path: '/about', component: () => html`<h1>About</h1>` }
];

const App = () => {
  const router = createRouter(routes);

  return Router({
    router,
    children: html`
      <div>
        <nav>
          ${Link({ href: '/', children: 'Home' })}
          ${Link({ href: '/about', children: 'About' })}
        </nav>
        <main id="content"></main>
      </div>
    `
  });
};
```

## CLI Commands

### Create a New Project

```bash
# Interactive mode
kettlejs new

# With options
kettlejs new my-app --template full
```

### Generate a Component

```bash
# Interactive mode
kettlejs generate component

# With options
kettlejs g c MyComponent --type with-state --path components/MyComponent/MyComponent.ts
```

Component types:
- `basic` - Simple component
- `with-state` - Component with reactive state
- `with-resource` - Component with async data fetching
- `with-router` - Component with router integration
- `full` - Full-featured component with all features

## Lifecycle Hooks

```typescript
import { onMount, onUnmount, createSignal, html } from '@fluixi/kettlejs';

const MyComponent = () => {
  const [count, setCount] = createSignal(0);

  onMount(() => {
    console.log('Component mounted');
    const interval = setInterval(() => setCount(c => c + 1), 1000);

    // Cleanup function
    return () => {
      console.log('Component unmounting');
      clearInterval(interval);
    };
  });

  onUnmount(() => {
    console.log('Additional cleanup');
  });

  return html`<div>Count: ${count()}</div>`;
};
```

## Advanced Patterns

### Derived State (Memos)

```typescript
import { createSignal, createMemo, html } from '@fluixi/kettlejs';

const ExpensiveCalculation = () => {
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(2);

  // Memo caches the result and only recalculates when dependencies change
  const sum = createMemo(() => {
    console.log('Calculating sum...');
    return a() + b();
  });

  return html`
    <div>
      <p>Sum: ${sum()}</p>
      <button @click=${() => setA(a() + 1)}>Increment A</button>
      <button @click=${() => setB(b() + 1)}>Increment B</button>
    </div>
  `;
};
```

### Batched Updates

```typescript
import { createSignal, batch, html } from '@fluixi/kettlejs';

const BatchExample = () => {
  const [firstName, setFirstName] = createSignal('John');
  const [lastName, setLastName] = createSignal('Doe');

  const updateName = () => {
    batch(() => {
      setFirstName('Jane');
      setLastName('Smith');
    }); // UI updates only once
  };

  return html`
    <div>
      <p>${firstName()} ${lastName()}</p>
      <button @click=${updateName}>Update Name</button>
    </div>
  `;
};
```

### Error Boundaries

```typescript
import { createSignal, Show, html } from '@fluixi/kettlejs';

const ErrorBoundary = (props: { children: any }) => {
  const [error, setError] = createSignal<Error | null>(null);

  try {
    return html`
      ${Show({
        when: () => !error(),
        fallback: html`<div>Error: ${error()?.message}</div>`,
        children: props.children
      })}
    `;
  } catch (e) {
    setError(e as Error);
    return html`<div>Error: ${(e as Error).message}</div>`;
  }
};
```

## API Reference

### Core

- `createSignal(initialValue, options?)` - Create a reactive signal
- `createEffect(fn)` - Run side effects when dependencies change
- `createMemo(fn)` - Create derived reactive state
- `createComponent(fn)` - Create a component with lifecycle management
- `render(component, container)` - Render a component into the DOM
- `onMount(fn)` - Run code when component mounts
- `onUnmount(fn)` - Run code when component unmounts
- `batch(fn)` - Batch multiple updates together
- `untrack(fn)` - Run code without tracking dependencies

### Control Flow

- `Show({ when, fallback?, children })` - Conditional rendering
- `For({ each, fallback?, children })` - List rendering
- `Index({ each, fallback?, children })` - Non-keyed list rendering
- `Switch({ fallback?, children })` - Multiple condition branches
- `Match({ when, children })` - Condition branch in Switch
- `Portal({ mount?, children })` - Render outside component tree
- `Dynamic({ component, props?, children? })` - Render dynamic components

### Context

- `createContext(defaultValue, name?)` - Create a context
- `useContext(context)` - Access context value
- `Provider({ context, value, children })` - Provide context value

### Resources

- `createResource(source, fetcher, options?)` - Create async resource
- `createResources([...])` - Create multiple resources
- `createLazyResource(source, fetcher, options?)` - Create lazy resource

### Router

- `createRouter(routes, options?)` - Create router instance
- `Router({ router, children })` - Router provider component
- `Link({ href, children })` - Navigation link
- `useRouter()` - Access router instance
- `useLocation()` - Access current location
- `useNavigate()` - Get navigation function
- `useParams()` - Get route parameters
- `useQuery()` - Get query parameters

## TypeScript Support

KettleJS is written in TypeScript and provides full type safety:

```typescript
import { Component, ComponentProps, createSignal } from '@fluixi/kettlejs';

interface UserProps extends ComponentProps {
  userId: number;
  onUserLoad?: (user: User) => void;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const UserComponent: Component<UserProps> = (props) => {
  const [user, setUser] = createSignal<User | null>(null);

  // TypeScript knows the types of all signals and props
  return html`<div>${user()?.name}</div>`;
};
```

## Comparison with Other Frameworks

### vs React

- ✅ No virtual DOM - direct DOM updates for better performance
- ✅ True fine-grained reactivity without re-renders
- ✅ Simpler mental model - no hooks rules or dependency arrays
- ✅ Smaller bundle size
- ⚠️ Smaller ecosystem (but growing!)

### vs SolidJS

- ✅ Similar reactivity model and API
- ✅ Uses lit-html for familiar template syntax
- ✅ Integrated with @fluixi/reactive library
- ⚠️ Different template syntax (lit-html vs JSX)

### vs Vue

- ✅ More explicit reactivity with signals
- ✅ Better TypeScript inference
- ✅ Lighter weight
- ⚠️ No single-file components

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

KettleJS is inspired by:
- [SolidJS](https://www.solidjs.com/) - For the reactivity model and API design
- [Lit](https://lit.dev/) - For the template system
- The [TC39 Signals Proposal](https://github.com/tc39/proposal-signals)

## Links

- [Documentation](https://github.com/your-org/kettlejs/docs)
- [Examples](https://github.com/your-org/kettlejs/examples)
- [GitHub](https://github.com/your-org/kettlejs)
- [npm](https://www.npmjs.com/package/@fluixi/kettlejs)

---

Made with ☕ by the Adafri team