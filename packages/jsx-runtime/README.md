<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/jsx-runtime

**A fine-grained JSX runtime — native JSX and lit-html templates, no virtual DOM.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Registry](https://img.shields.io/badge/registry-GitHub%20Packages-181717?logo=github)
![JSX](https://img.shields.io/badge/JSX-runtime-f7df1e?logo=javascript&logoColor=black)

---

A comprehensive JSX runtime with fine-grained reactivity, inspired by SolidJS. This package provides a modern JSX implementation that supports both native JSX and lit-html templates, with seamless integration with signal and store systems for optimal performance.

## Features

- 🎯 **Fine-Grained Reactivity**: Surgical DOM updates without virtual DOM overhead
- 🔄 **Dual-Mode JSX**: Use native JSX or lit-html templates interchangeably
- 🚀 **Optimal Performance**: Only updates what actually changed
- 🧩 **Control Flow**: Built-in Show, For, Switch, Portal components
- 📦 **Signal & Store Support**: Works with any reactive system
- 🎨 **Lit-HTML Integration**: Full compatibility with lit-html directives
- 🔧 **Compiler Support**: Includes transformation utilities for build-time optimization
- 📘 **Full TypeScript**: Complete type safety with JSX intrinsic elements

## Installation

```bash
npm install @fluixi/jsx-runtime @fluixi/dom
# or
pnpm add @fluixi/jsx-runtime @fluixi/dom
# or
yarn add @fluixi/jsx-runtime @fluixi/dom
```

## Quick Start

### Configure TypeScript

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/jsx-runtime",
    "types": ["@fluixi/jsx-runtime"]
  }
}
```

### Basic Usage

```tsx
import { render } from '@fluixi/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  );
}

render(<Counter />, document.getElementById('app')!);
```

### With Reactive Values

```tsx
import { createSignal } from '@fluixi/reactive/signal';

function App() {
  const [name, setName] = createSignal('World');

  return (
    <div>
      {/* Reactive text - updates automatically */}
      <h1>Hello, {name()}!</h1>
      
      {/* Reactive attribute */}
      <input
        value={name()}
        onInput={(e) => setName(e.target.value)}
      />
    </div>
  );
}
```

## JSX Syntax

### Elements

```tsx
// Native elements
<div className="container">Content</div>

// Self-closing
<img src="image.jpg" alt="Image" />

// Components
<MyComponent prop="value" />
```

### Reactive Attributes

```tsx
import { createSignal } from '@fluixi/reactive/signal';

const [color, setColor] = createSignal('red');
const [size, setSize] = createSignal(16);

<div
  style={{
    color: color(),           // Reactive
    fontSize: `${size()}px`   // Reactive
  }}
  className={`text-${color()}`}  // Reactive
  data-color={color()}            // Reactive
>
  Content
</div>
```

### Event Handlers

```tsx
// Click handler
<button onClick={() => console.log('clicked')}>
  Click me
</button>

// Input handler
<input onInput={(e) => console.log(e.target.value)} />

// Custom events
<div onCustomEvent={(e) => handleCustom(e)} />
```

### Children

```tsx
// Text children
<div>Hello World</div>

// Element children
<div>
  <span>Child 1</span>
  <span>Child 2</span>
</div>

// Reactive children
<div>{count()}</div>

// Array children
<div>
  {items().map(item => <div key={item.id}>{item.name}</div>)}
</div>

// Mixed children
<div>
  Static text
  {dynamic()}
  <span>Element</span>
</div>
```

### Fragments

```tsx
// Fragment shorthand
<>
  <div>First</div>
  <div>Second</div>
</>

// Named fragment
<Fragment>
  <div>First</div>
  <div>Second</div>
</Fragment>
```

## Control Flow Components

### Show

Conditional rendering with optional fallback.

```tsx
import { Show } from '@fluixi/jsx-runtime';

function Profile() {
  const [user, setUser] = createSignal(null);

  return (
    <Show
      when={user()}
      fallback={<div>Loading...</div>}
    >
      {(u) => (
        <div>
          <h1>{u.name}</h1>
          <p>{u.email}</p>
        </div>
      )}
    </Show>
  );
}
```

### For

Keyed list rendering with optimal updates.

```tsx
import { For } from '@fluixi/jsx-runtime';

function TodoList() {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn JSX', done: false },
    { id: 2, text: 'Build app', done: false },
  ]);

  return (
    <ul>
      <For each={todos()}>
        {(todo, index) => (
          <li>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => updateTodo(index(), e.target.checked)}
            />
            {todo.text}
          </li>
        )}
      </For>
    </ul>
  );
}
```

### Index

Index-based list rendering (use when items change but positions don't).

```tsx
import { Index } from '@fluixi/jsx-runtime';

function NumberList() {
  const [numbers] = createSignal([1, 2, 3, 4, 5]);

  return (
    <ul>
      <Index each={numbers()}>
        {(num, index) => (
          <li>#{index}: {num()}</li>
        )}
      </Index>
    </ul>
  );
}
```

### Switch/Match

Multi-way conditional rendering.

```tsx
import { Switch, Match } from '@fluixi/jsx-runtime';

function StatusView() {
  const [status, setStatus] = createSignal('loading');

  return (
    <Switch fallback={<div>Unknown status</div>}>
      <Match when={status() === 'loading'}>
        <div>Loading...</div>
      </Match>
      <Match when={status() === 'success'}>
        <div>Success!</div>
      </Match>
      <Match when={status() === 'error'}>
        <div>Error occurred</div>
      </Match>
    </Switch>
  );
}
```

### Portal

Render content in a different DOM location.

```tsx
import { Portal } from '@fluixi/jsx-runtime';

function Modal({ isOpen, children }) {
  return (
    <Show when={isOpen()}>
      <Portal mount={document.body}>
        <div class="modal-backdrop">
          <div class="modal">
            {children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
```

### Dynamic

Dynamically render components based on runtime conditions.

```tsx
import { Dynamic } from '@fluixi/jsx-runtime';

function DynamicComponent() {
  const [component, setComponent] = createSignal('div');
  
  return (
    <Dynamic
      component={component()}
      className="dynamic"
    >
      Content
    </Dynamic>
  );
}
```

### ErrorBoundary

Catch and handle errors in component trees.

```tsx
import { ErrorBoundary } from '@fluixi/jsx-runtime';

function App() {
  return (
    <ErrorBoundary
      fallback={(err, reset) => (
        <div>
          <h1>Error: {err.message}</h1>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

## Lit-HTML Integration

Use lit-html templates alongside JSX.

### With signal directive

```tsx
import { html } from 'lit';
import { signal } from '@fluixi/jsx-runtime';

function Component() {
  const [count, setCount] = createSignal(0);

  return html`
    <div>
      <p>Count: ${signal(count)}</p>
      <button @click=${() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  `;
}
```

### Helper utilities

```tsx
import { template, templateSVG, $, $if } from '@fluixi/jsx-runtime';

function Component() {
  const [show, setShow] = createSignal(true);
  const [name, setName] = createSignal('World');

  // Auto-wrapped template
  return template`
    <div>
      ${$if(show, `Hello, ${$(name)}!`, 'Hidden')}
    </div>
  `;
}
```

## Component Patterns

### Function Components

```tsx
interface Props {
  name: string;
  age: number;
}

function Greeting(props: Props) {
  return <div>Hello, {props.name} ({props.age})</div>;
}
```

### With Children

```tsx
interface CardProps {
  title: string;
  children: JSX.Element;
}

function Card(props: CardProps) {
  return (
    <div class="card">
      <h2>{props.title}</h2>
      <div class="card-body">
        {props.children}
      </div>
    </div>
  );
}

// Usage
<Card title="My Card">
  <p>Card content here</p>
</Card>
```

### With Signals

```tsx
function Counter(props: { initial?: number }) {
  const [count, setCount] = createSignal(props.initial ?? 0);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>-</button>
    </div>
  );
}
```

### Memoized Components

```tsx
import { memo } from '@fluixi/jsx-runtime';

const ExpensiveComponent = memo((props: { data: any }) => {
  // Expensive rendering logic
  return <div>{/* ... */}</div>;
});
```

### Component Helpers

```tsx
import { jsxComponent, defineComponent } from '@fluixi/jsx-runtime';

// Simple component wrapper
const MyComponent = jsxComponent((props: Props) => {
  return <div>{/* ... */}</div>;
});

// With name for debugging
const NamedComponent = defineComponent('MyComponent', (props: Props) => {
  return <div>{/* ... */}</div>;
});
```

## Refs

### Element Refs

```tsx
import { createRef } from '@fluixi/jsx-runtime';

function Component() {
  const inputRef = createRef<HTMLInputElement>();

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
    </div>
  );
}
```

### Callback Refs

```tsx
function Component() {
  let divElement: HTMLDivElement | null = null;

  const handleRef = (el: HTMLDivElement | null) => {
    divElement = el;
    if (el) {
      console.log('Element mounted:', el);
    }
  };

  return <div ref={handleRef}>Content</div>;
}
```

### Forward Ref

```tsx
import { forwardRef } from '@fluixi/jsx-runtime';

const FancyInput = forwardRef<HTMLInputElement, { label: string }>(
  (props, ref) => {
    return (
      <div>
        <label>{props.label}</label>
        <input ref={ref} />
      </div>
    );
  }
);

// Usage
const inputRef = createRef<HTMLInputElement>();
<FancyInput label="Name" ref={inputRef} />
```

## Styling

### Inline Styles

```tsx
// Object style
<div style={{ color: 'red', fontSize: '16px' }}>
  Styled text
</div>

// String style
<div style="color: red; font-size: 16px;">
  Styled text
</div>

// Reactive styles
<div style={{ color: color() }}>
  Dynamic color
</div>
```

### CSS Classes

```tsx
// String
<div className="btn btn-primary">Button</div>

// Array
<div className={['btn', isActive() && 'active'].filter(Boolean)}>
  Button
</div>

// Object (with classMap from lit)
import { classMap } from 'lit/directives/class-map.js';

<div className={classMap({ btn: true, active: isActive() })}>
  Button
</div>

// Reactive
<div className={`btn btn-${type()}`}>Button</div>
```

## Advanced Usage

### Batch Updates

```tsx
import { jsxBatch } from '@fluixi/jsx-runtime';

function Component() {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  const [c, setC] = createSignal(0);

  const updateAll = () => {
    jsxBatch(() => {
      setA(1);
      setB(2);
      setC(3);
    });
    // Only one render cycle
  };

  return <button onClick={updateAll}>Update All</button>;
}
```

### Server-Side Rendering

```tsx
import { renderToString } from '@fluixi/jsx-runtime';

async function handler() {
  const html = await renderToString(<App />);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
```

### Hydration

```tsx
import { hydrate } from '@fluixi/jsx-runtime';

// Hydrate server-rendered content
hydrate(<App />, document.getElementById('app')!);
```

## Compiler Options

The package includes a compiler module for build-time optimizations.

### Transform JSX

```typescript
import { transform } from '@fluixi/jsx-runtime/compiler';

const result = transform(code, {
  useLitHTML: true,
  optimize: true,
  delegateEvents: true,
  delegatedEvents: ['click', 'input', 'change'],
});

console.log(result.code);
console.log(result.metadata);
```

### Babel Plugin

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['@fluixi/jsx-runtime/compiler/babel', {
      useLitHTML: true,
      optimize: true,
    }]
  ]
};
```

### TypeScript Transformer

```typescript
import { createTypeScriptTransformer } from '@fluixi/jsx-runtime/compiler';

const transformer = createTypeScriptTransformer({
  optimize: true,
});
```

## Performance Tips

1. **Use `For` for lists**: Keyed reconciliation is faster than mapping
2. **Memoize expensive components**: Use `memo()` wrapper
3. **Batch updates**: Use `jsxBatch()` for multiple state changes
4. **Avoid inline object creation**: Extract to variables
5. **Use `Index` for stable lists**: When order doesn't change

```tsx
// ❌ Bad - creates new object every render
<div style={{ color: 'red' }}>Text</div>

// ✅ Good - object is stable
const style = { color: 'red' };
<div style={style}>Text</div>

// ❌ Bad - new function every render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ Good - stable function
const handleClick = () => handleClick(id);
<button onClick={handleClick}>Click</button>
```

## TypeScript

### Component Types

```typescript
import type { JSXElement, JSXComponent } from '@fluixi/jsx-runtime';

// Function component type
const Component: JSXComponent<{ name: string }> = (props) => {
  return <div>{props.name}</div>;
};

// Element type
function render(): JSXElement {
  return <div>Content</div>;
}
```

### Props Interface

```typescript
import type { JSXProps } from '@fluixi/jsx-runtime';

interface MyProps extends JSXProps {
  title: string;
  count: number;
  onUpdate?: (value: number) => void;
}

function MyComponent(props: MyProps) {
  return <div>{props.title}: {props.count}</div>;
}
```

### Intrinsic Elements

```typescript
// All HTML elements are typed
<div>Text</div>
<button onClick={() => {}}>Button</button>
<input type="text" value="text" />

// With proper event types
<button onClick={(e: MouseEvent) => console.log(e)}>
  Click
</button>

<input onInput={(e: InputEvent) => {
  const target = e.target as HTMLInputElement;
  console.log(target.value);
}} />
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ required
- No IE11 support

## Debugging

### Development Mode

```typescript
import { createReactiveJSX } from '@fluixi/jsx-runtime';

const jsx = createReactiveJSX({
  signalSystem: mySignalSystem,
  development: true, // Enables warnings and checks
});
```

### Component Names

Use `defineComponent` for better debugging:

```tsx
import { defineComponent } from '@fluixi/jsx-runtime';

const MyComponent = defineComponent('MyComponent', (props) => {
  return <div>{props.children}</div>;
});
```

## Migration Guide

### From React

```tsx
// React
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}

// This package
import { createSignal } from '@fluixi/reactive/signal';

function Counter() {
  const [count, setCount] = createSignal(0);
  return <div onClick={() => setCount(count() + 1)}>{count()}</div>;
}
// Note: Signals are functions!
```

### From Solid

```tsx
// Very similar! Main difference is import paths
import { createSignal, Show, For } from 'solid-js';
// becomes
import { createSignal } from '@fluixi/reactive/signal';
import { Show, For } from '@fluixi/jsx-runtime';
```

## Examples

Check the examples directory for complete applications:

- Counter app
- Todo list
- Data fetching
- Forms
- Routing

## Contributing

Contributions welcome! Please see the main repository for guidelines.

## License

MIT

## Related Packages

- `@fluixi/dom` - Core reactive DOM runtime
- `@fluixi/reactive` - Signal and store implementations
- `lit` - Template literals for HTML

## Resources

- [SolidJS Documentation](https://www.solidjs.com/)
- [Lit Documentation](https://lit.dev/)
- [Fine-Grained Reactivity](https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf)