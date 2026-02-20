---
sidebar_position: 1
---

# Introduction to KettleJS

**KettleJS** is a modern, reactive web framework that combines the power of fine-grained reactivity with the simplicity of lit-html templating. Built on top of Lit and leveraging signal-based reactivity from @awc/reactive, KettleJS provides a developer-friendly API for building fast, efficient web applications.

## Why KettleJS?

### 🚀 Fine-Grained Reactivity
KettleJS uses signals for state management, providing surgical updates to your DOM without unnecessary re-renders. Only the exact parts of your UI that depend on changed data will update.

### 🎯 Simple & Intuitive
Built on familiar patterns from Lit and inspired by modern frameworks like SolidJS, KettleJS offers a shallow learning curve while maintaining powerful capabilities.

### ⚡ High Performance
- Fine-grained reactivity minimizes DOM operations
- Efficient lit-html rendering engine
- Automatic cleanup and memory management
- Tree-shakeable for minimal bundle sizes

### 🔧 Developer Experience
- Full TypeScript support with excellent type inference
- Hot module replacement (HMR) support
- Comprehensive CLI for scaffolding
- Multiple component patterns (class-based, functional, JSX)
- React ecosystem compatibility via React Bridge

### 🌐 Standards-Based
- Built on Web Components standards
- Works with any framework or vanilla JavaScript
- Progressive enhancement ready
- Server-Side Rendering (SSR) support

## Core Features

### Reactive Primitives
```typescript
import { createSignal, createEffect, createMemo } from '@awc/reactive/signal';

// Signals - reactive state
const [count, setCount] = createSignal(0);

// Effects - side effects that auto-track dependencies
createEffect(() => {
  console.log('Count changed:', count());
});

// Memos - derived computed values
const doubled = createMemo(() => count() * 2);
```

### Component Patterns

#### KettleElement (Recommended)
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
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

#### Functional Components
```typescript
import { html, Component } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);
  
  return html`
    <button @click=${() => setCount(c => c + 1)}>
      Count: ${count()}
    </button>
  `;
};
```

#### JSX Support
```typescript
/** @jsx h */
import { h } from '@awc/kettlejs/jsx-runtime';
import { createSignal } from '@awc/reactive/signal';

export function Counter() {
  const [count, setCount] = createSignal(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
}
```

### Control Flow
```typescript
import { Show, For } from '@awc/kettlejs/control-flow';

// Conditional rendering
Show({
  when: () => isLoggedIn(),
  children: html`<div>Welcome back!</div>`,
  fallback: html`<div>Please log in</div>`
});

// List rendering
For({
  each: () => items(),
  children: (item, index) => html`
    <div key=${item.id}>${item.name}</div>
  `
});
```

### Resource Management
```typescript
import { createResource } from '@awc/kettlejs/resources';

const [data, { refetch, mutate }] = createResource(
  () => userId(), // Source signal
  fetchUser,      // Fetcher function
  {
    initialValue: null,
    onError: (error) => console.error('Failed to load user:', error)
  }
);

// Access resource state
data.loading  // true when fetching
data.error    // error if fetch failed
data()        // the actual data
```

### Routing
```typescript
import { createRouter, Route, Link } from '@awc/kettlejs/router';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserProfile }
];

const router = createRouter(routes);

// Navigation
Link({ href: '/about', children: 'About Us' });

// Access route params
const params = useParams();
const userId = params.id;
```

### Context API
```typescript
import { createContext, useContext, Provider } from '@awc/kettlejs/context';

// Create context
const ThemeContext = createContext('light');

// Provide value
Provider({
  context: ThemeContext,
  value: () => theme(),
  children: html`<app-content></app-content>`
});

// Consume value
const theme = useContext(ThemeContext);
```

## Multiple Rendering Modes

KettleJS supports three rendering approaches:

### 1. Lit-HTML (Default)
Native lit-html templates with full KettleJS features.

### 2. JSX Runtime
Native JSX support without React dependency.

### 3. React Bridge
Full React ecosystem compatibility while using KettleJS signals.

```typescript
import { useSignal, useKettleEffect } from '@awc/kettlejs/react-bridge';

export function Counter() {
  const [count, setCount] = useSignal(0);
  
  useKettleEffect(() => {
    console.log('Count:', count());
  });
  
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>;
}
```

## Server-Side Rendering (SSR)

```typescript
import { renderToString, renderToPage } from '@awc/kettlejs/core';

// Render to string
const html = await renderToString(template);

// Render complete page
const page = await renderToPage(template, {
  title: 'My App',
  stylesheets: ['/styles.css'],
  scripts: ['/app.js']
});
```

## CLI Tooling

KettleJS includes a powerful CLI for project and component generation:

```bash
# Create new project
kettlejs new my-app

# Generate component
kettlejs g c Counter --type with-state --mode jsx

# Interactive mode
kettlejs generate component
```

## Architecture

```
KettleJS Framework
├── Core
│   ├── KettleElement (base class)
│   ├── Component rendering
│   ├── Hydration
│   └── SSR utilities
├── Reactivity (@awc/reactive)
│   ├── Signals
│   ├── Effects
│   ├── Memos
│   └── Stores
├── Control Flow
│   ├── Show
│   ├── For
│   ├── Dynamic
│   └── Portal
├── Router
│   ├── Client-side routing
│   ├── File-system routing
│   └── Middleware support
├── Resources
│   ├── Async data fetching
│   ├── Cache management
│   └── Optimistic updates
├── Context
│   └── Dependency injection
├── JSX Runtime
│   └── Native JSX support
├── React Bridge
│   └── React compatibility
└── Build Tools
    ├── Vite plugin
    ├── Builder
    └── Dev server
```

## Browser Support

KettleJS works in all modern browsers:

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile browsers (iOS 14+, Android Chrome)

## Bundle Size

- Core: ~8KB (gzipped)
- With router: ~12KB (gzipped)
- Full bundle: ~15KB (gzipped)

Tree-shaking reduces bundle size based on features used.

## Getting Started

Ready to build with KettleJS? Check out these guides:

- [Installation](./installation.md) - Get KettleJS set up in your project
- [Quick Start](./quick-start.md) - Build your first component in 5 minutes
- [Core Concepts](./core-concepts.md) - Understand signals and reactivity
- [Tutorial](./tutorial/intro.md) - Step-by-step guide to building an app

## Ecosystem

- **@awc/reactive** - Fine-grained reactivity library
- **@awc/kettlejs** - Main framework
- **Vite Plugin** - Build tool integration
- **CLI** - Project scaffolding
- **React Bridge** - React compatibility layer

## Community

- [GitHub Repository](https://github.com/your-org/kettlejs)
- [Discord Community](https://discord.gg/kettlejs)
- [Twitter](https://twitter.com/kettlejs)

## License

MIT License - see [LICENSE](https://github.com/your-org/kettlejs/blob/main/LICENSE) for details.

---

**Next:** [Installation →](./installation.md)