---
sidebar_position: 1
title: Overview
---

# KettleJS Framework

**KettleJS** is a modern, reactive framework for building web applications with [lit-html](https://lit.dev) and fine-grained reactivity, inspired by [SolidJS](https://www.solidjs.com/).

## Overview

KettleJS combines the power of fine-grained reactive primitives from `@awc/reactive` with the simplicity and familiarity of lit-html templates. It provides a complete framework for building modern web applications with excellent performance, TypeScript support, and developer experience.

## Key Features

### 🚀 Fine-Grained Reactivity
Powered by `@awc/reactive` signals for efficient, surgical DOM updates. No virtual DOM overhead - updates happen exactly where they're needed.

### 🎯 lit-html Integration
Leverage the power and simplicity of lit-html templates with familiar template literal syntax. No build step required for basic development.

### 🔄 Control Flow Components
Built-in control flow components like `Show`, `For`, `Switch`, `Portal`, and `Dynamic` make it easy to handle conditional rendering, lists, and dynamic content.

### 🛣️ Built-in Router
Full-featured client-side router with nested routes, lazy loading, route guards, and more.

### 📡 Resource Management
Async data fetching with automatic loading states, error handling, and refetching capabilities.

### 🎭 Context API
Share state across component trees without prop drilling. Fully integrated with the reactive graph.

### 🏗️ TypeScript First
Written in TypeScript with full type safety and excellent IDE support. Get autocomplete, type checking, and inline documentation.

### 🛠️ CLI Tools
Project and component generators for rapid development. Multiple component patterns supported.

### 📦 Zero Runtime Overhead
Compile-time optimizations and direct DOM manipulation for minimal bundle size and maximum performance.

### 🔌 Lit Element Integration
Seamlessly integrate with existing Lit projects through mixins and reactive controllers.

## Architecture

KettleJS is built on several key architectural principles:

```
┌─────────────────────────────────────────┐
│           KettleJS Framework            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │   Core API   │  │  Control Flow   │ │
│  │              │  │                 │ │
│  │ • Component  │  │ • Show          │ │
│  │ • Element    │  │ • For/Index     │ │
│  │ • Lifecycle  │  │ • Switch/Match  │ │
│  │ • Rendering  │  │ • Portal        │ │
│  └──────────────┘  │ • Dynamic       │ │
│                    └─────────────────┘ │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │   Context    │  │   Resources     │ │
│  │              │  │                 │ │
│  │ • Provider   │  │ • Async Data    │ │
│  │ • Consumer   │  │ • Loading State │ │
│  │ • Scoping    │  │ • Error Handle  │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │    Router    │  │   Directives    │ │
│  │              │  │                 │ │
│  │ • Routes     │  │ • ref           │ │
│  │ • Navigation │  │ • signal        │ │
│  │ • Params     │  │ • Lit built-in  │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│          @awc/reactive (Core)           │
│  • Signals • Effects • Memos • Batch    │
├─────────────────────────────────────────┤
│              lit-html                   │
│         (Template Rendering)            │
└─────────────────────────────────────────┘
```

### Reactive Layer
At the foundation is `@awc/reactive`, which provides the signal-based reactivity system. This handles all state management, dependency tracking, and effect execution.

### Rendering Layer
Built on lit-html, KettleJS uses template literals for declarative UI. The reactive layer automatically triggers re-renders when signals change.

### Component Layer
Multiple ways to create components:
- **Functional Components**: Pure functions returning templates
- **KettleElement**: Base class extending LitElement
- **WithSignals Mixin**: Add reactivity to any Lit element
- **Reactive Controllers**: Fine-grained reactive control

### Framework Features
High-level features like routing, resources, context, and control flow components built on top of the core layers.

## Component Patterns

KettleJS supports multiple component patterns to fit different use cases:

### 1. Functional Components
```typescript
const Counter = () => {
  const [count, setCount] = createSignal(0);
  return html`
    <button @click=${() => setCount(count() + 1)}>
      Count: ${count()}
    </button>
  `;
};
```

### 2. KettleElement Base Class
```typescript
@customElement('my-counter')
class MyCounter extends KettleElement {
  private [count, setCount] = createSignal(0);
  
  view() {
    return html`
      <button @click=${() => this.setCount(this.count() + 1)}>
        Count: ${this.count()}
      </button>
    `;
  }
}
```

### 3. WithSignals Mixin
```typescript
@customElement('my-counter')
class MyCounter extends WithSignals(LitElement) {
  private count = createSignal(0);
  
  render() {
    return html`
      <button @click=${() => this.count[1](this.count[0]() + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

### 4. Reactive Controllers
```typescript
@customElement('my-counter')
class MyCounter extends LitElement {
  private reactive = new ReactiveController(this);
  private count = createSignal(0);
  
  render() {
    return html`
      <button @click=${() => this.count[1](this.count[0]() + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

## Philosophy

KettleJS is designed around several core principles:

### Fine-Grained Reactivity
Updates happen at the signal level, not the component level. When a signal changes, only the specific DOM nodes that depend on it are updated.

### Explicit Over Implicit
Reactivity is explicit through signal accessors. You always know what's reactive and what's not.

### Progressive Enhancement
Start with functional components and add complexity (custom elements, SSR, etc.) only when needed.

### TypeScript Native
First-class TypeScript support isn't an afterthought - it's built into the design.

### Lit Compatible
Seamlessly integrate with existing Lit projects and ecosystems.

### Standards-Based
Built on web standards and established libraries (lit-html, custom elements) rather than proprietary abstractions.

## Getting Started

Ready to dive in? Check out these resources:

- [Installation Guide](./getting-started/installation.md) - Get KettleJS set up in your project
- [Quick Start](./getting-started/quick-start.md) - Build your first KettleJS app
- [Core Concepts](./core-concepts/signals.md) - Understand reactivity fundamentals
- [Components Guide](./components/functional-components.md) - Learn component patterns
- [API Reference](./api-reference/core.md) - Complete API documentation

## Comparison with Other Frameworks

| Feature | KettleJS | React | SolidJS | Vue | Svelte |
|---------|----------|-------|---------|-----|--------|
| Reactivity Model | Fine-grained signals | Virtual DOM | Fine-grained signals | Proxy-based | Compiled |
| Template Syntax | lit-html | JSX | JSX | Template strings | Template files |
| Bundle Size | ~15KB | ~40KB | ~7KB | ~30KB | ~10KB |
| TypeScript | Native | Good | Excellent | Good | Good |
| Learning Curve | Low | Medium | Low-Medium | Medium | Low |
| Ecosystem | Growing | Huge | Growing | Large | Growing |
| SSR Support | Yes | Yes | Yes | Yes | Yes |
| Web Components | Native | Via libs | Via libs | Via libs | Via libs |

## Community & Support

- **GitHub**: [github.com/adafri/kettlejs](https://github.com/adafri/kettlejs)
- **Discord**: Join our community server
- **Twitter**: [@KettleJS](https://twitter.com/kettlejs)
- **Stack Overflow**: Tag your questions with `kettlejs`

## Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/adafri/kettlejs/blob/main/CONTRIBUTING.md) for details on:

- Reporting bugs
- Suggesting features
- Submitting pull requests
- Writing documentation

## License

KettleJS is [MIT licensed](https://github.com/adafri/kettlejs/blob/main/LICENSE).

---

Built with ☕ by the Adafri team
