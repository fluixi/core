<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/dom

**The DOM runtime the compiler targets — surgical fine-grained updates, hydration and SSR.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/dom?logo=npm)](https://www.npmjs.com/package/@fluixi/dom)

---

The runtime `@fluixi/compiler` emits calls into. It provides the low-level DOM operations —
element creation, reactive attributes and properties, insertion, control flow, hydration —
that make a change update exactly the binding depending on it. Usable directly, though most
code reaches it through compiled JSX or `` html`` `` templates.

## Features

- 🎯 **Fine-Grained Reactivity**: Only updates the exact DOM nodes that need to change
- 🔄 **Signal & Store Integration**: Works with any reactive system (signals, stores, observables)
- 🔁 **Hydration**: adopts server-rendered nodes in place rather than rebuilding beside them
- 🚀 **Optimized Performance**: Template caching, event delegation, and minimal re-renders
- 🧩 **Control Flow Components**: Built-in Show, For, Switch, Portal, and more
- 📦 **Zero Dependencies**: Core runtime has no external dependencies on reactive systems
- 🔧 **Flexible Integration**: Use standalone or integrate with your reactive library

## Installation

```bash
npm install @fluixi/dom
# or
pnpm add @fluixi/dom
# or
yarn add @fluixi/dom
```

## Quick Start

### Basic Usage

```typescript
import { insert, createElement, setProperty } from '@fluixi/dom';

// Create an element
const div = createElement('div');

// Set properties
setProperty(div, 'className', 'container');
setProperty(div, 'textContent', 'Hello World');

// Insert into DOM
document.body.appendChild(div);
```

### With Signals

```typescript
import { insert, createElement } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

const div = createElement('div');

// Insert reactive text
insert(div, () => `Count: ${count()}`);

document.body.appendChild(div);

// Updates automatically!
setCount(1); // DOM updates to "Count: 1"
```

### Components

Bindings work as soon as you import — the example above needs no setup. Rendering
*components* needs one seam filled in, so a component call is owned and disposable:

```typescript
import 'fluixi'; // wires it for you at import time
```

Using `@fluixi/dom` without `fluixi`? Fill the seam yourself — see
[Integration](#integration).

## Core API

### DOM Manipulation

#### `insert(parent, accessor, marker?, init?)`

Insert dynamic content with automatic reactivity tracking.

```typescript
import { insert } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [text, setText] = createSignal('Hello');
const div = document.createElement('div');

// Insert reactive content
insert(div, () => text());

// Or insert static content
insert(div, 'Static text');

// With a marker for positioning
const marker = document.createTextNode('');
div.appendChild(marker);
insert(div, () => text(), marker);
```

#### `spread(options)`

Spread props onto an element with fine-grained updates.

```typescript
import { spread, createElement } from '@fluixi/dom';

const element = createElement('div');
const props = {
  className: 'container',
  style: { color: 'red' },
  onClick: () => console.log('clicked'),
};

spread({ element, props });
```

### Attributes & Properties

```typescript
import { setAttribute, setProperty, setClassName, setStyle } from '@fluixi/dom';

const div = createElement('div');

// Set attribute
setAttribute(div, 'data-id', '123');

// Set property
setProperty(div, 'value', 'text');

// Set className (handles strings, arrays, objects)
setClassName(div, 'btn btn-primary');
setClassName(div, ['btn', 'btn-primary']);
setClassName(div, { btn: true, 'btn-primary': true });

// Set style (handles strings or objects)
setStyle(div, 'color: red; font-size: 16px');
setStyle(div, { color: 'red', fontSize: '16px' });
```

### Dynamic Attributes & Properties

```typescript
import { setDynamicAttribute, setDynamicProperty } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [color, setColor] = createSignal('red');
const div = createElement('div');

// Reactive attribute
setDynamicAttribute(div, 'data-color', color);

// Reactive property
setDynamicProperty(div, 'className', () => `text-${color()}`);
```

### Event Delegation

```typescript
import { delegateEvents, addDelegatedEventListener } from '@fluixi/dom';

// Setup delegation for common events
delegateEvents(['click', 'input', 'change']);

// Add delegated listener
const button = createElement('button');
addDelegatedEventListener(button, 'click', (e) => {
  console.log('Button clicked!');
});
```

## Control Flow Components

### Show

Conditional rendering with optional fallback.

```typescript
import { Show } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [user, setUser] = createSignal(null);

// Basic usage
Show({
  when: user,
  children: (u) => `Hello, ${u.name}!`,
  fallback: 'Loading...',
});

// With reactive condition
Show({
  when: () => user() !== null,
  children: (u) => `Hello, ${u.name}!`,
});
```

### For

Keyed list rendering with optimal updates.

```typescript
import { For } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [items, setItems] = createSignal([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
]);

For({
  each: items,
  children: (item, index) => {
    const div = createElement('div');
    insert(div, () => `${index()}: ${item.name}`);
    return div;
  },
  fallback: 'No items',
});
```

### Index

Index-based list rendering (use when items change but positions don't).

```typescript
import { Index } from '@fluixi/dom';

Index({
  each: () => [1, 2, 3, 4, 5],
  children: (item, index) => {
    const div = createElement('div');
    insert(div, () => `Item ${index}: ${item()}`);
    return div;
  },
});
```

### Switch/Match

Multi-way conditional rendering.

```typescript
import { Switch, Match } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [state, setState] = createSignal('loading');

Switch({
  fallback: 'Unknown state',
  children: [
    Match({
      when: () => state() === 'loading',
      children: 'Loading...',
    }),
    Match({
      when: () => state() === 'success',
      children: 'Success!',
    }),
    Match({
      when: () => state() === 'error',
      children: 'Error occurred',
    }),
  ],
});
```

### Portal

Render content in a different DOM location.

```typescript
import { Portal } from '@fluixi/dom';

Portal({
  mount: document.body,
  children: createElement('div', { textContent: 'Portal content' }),
});
```

### Dynamic

Dynamically render components based on runtime conditions.

```typescript
import { Dynamic } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [component, setComponent] = createSignal('div');

Dynamic({
  component: component,
  className: 'dynamic-element',
  children: 'Dynamic content',
});
```

### ErrorBoundary

Catch and handle errors in component trees.

```typescript
import { ErrorBoundary } from '@fluixi/dom';

ErrorBoundary({
  fallback: (error, reset) => {
    const div = createElement('div');
    insert(div, `Error: ${error.message}`);
    
    const button = createElement('button');
    button.textContent = 'Retry';
    button.onclick = reset;
    
    div.appendChild(button);
    return div;
  },
  children: /* your components */,
});
```

## Integration

This package renders; it doesn't own a reactive system. One seam connects the two — how a
component call is wrapped — and it is a single function:

```typescript
import { registerCreateComponent } from '@fluixi/dom';

registerCreateComponent((Comp, props) => myOwnedCall(Comp, props));
```

**You almost never call this.** Importing `fluixi` wires `@fluixi/reactive` in for
you at import time, so an app just imports and renders. It matters if you use `@fluixi/dom`
on its own, or drive it with a different reactive library.

```typescript
import { isIntegrationInitialized, resetIntegration } from '@fluixi/dom';

isIntegrationInitialized(); // has something claimed the seam?
resetIntegration();         // drop it again — tests
```

`initializeIntegration({ signalSystem })` is the older entry point and still works; it picks
`createComponent` off what you pass and ignores the rest.

## Templates

`` html`` `` templates are compiled, not interpreted: `@fluixi/compiler` turns them into the
same calls this package exposes, so they cost nothing at runtime and need no template
library.

```ts
import { html } from 'fluixi';

function Counter() {
  const n = $signal(0);
  return html`<button @click=${() => n.set(n() + 1)}>${n()}</button>`;
}
```

The lit-html bridge this package once carried is gone — `lit` is not a dependency, and the
`@fluixi/dom/reactive` entry with its `$if`/`$each`/`rx` helpers no longer exists. Templates
go through the compiler now.

## Advanced Usage

### Memory Management

Bindings live and die with the owner they were created under, so tearing down a scope
removes its listeners and effects with it:

```typescript
import { createRoot, onCleanup } from '@fluixi/reactive';
import { insert } from '@fluixi/dom';

createRoot((dispose) => {
  insert(container, () => text());
  onCleanup(() => console.log('bindings gone'));

  dispose(); // runs the cleanups, drops the bindings
});
```

## Performance Tips

1. **Use `For` for lists**: The `For` component uses keyed reconciliation for optimal updates
2. **Delegate events**: Use `delegateEvents` for better performance with many event listeners
3. **Batch updates**: Wrap multiple updates in `batch()` to minimize re-renders
4. **Memoize expensive computations**: Use `createMemo` from your signal system
5. **Untrack when needed**: Use `untrack()` to read reactive values without creating dependencies
6. **Hoist static content**: Move static elements outside reactive contexts

```typescript
import { batch, createMemo, untrack } from '@fluixi/dom';

// Batch multiple updates
batch(() => {
  setSignal1(value1);
  setSignal2(value2);
  setSignal3(value3);
});

// Memoize expensive computations
const computed = createMemo(() => {
  return expensiveOperation(signal1(), signal2());
});

// Read without tracking
const value = untrack(() => signal());
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions.

```typescript
import type {
  Children,
  InsertOptions,
  SpreadOptions,
  SignalSystem,
  StoreSystem,
  ShowProps,
  ForProps,
} from '@fluixi/dom';

// Use types in your code
const mySignalSystem: SignalSystem = {
  createEffect: (fn) => {
    // Implementation
    return () => {};
  },
  batch: (fn) => {
    // Implementation
  },
};
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ required
- No polyfills needed for supported browsers

## Debugging

```typescript
import { isIntegrationInitialized } from '@fluixi/dom';

// A component rendering as a bare function usually means nothing claimed the seam
isIntegrationInitialized();
```

## Comparison with Other Libraries

### vs SolidJS

This package is heavily inspired by SolidJS's dom-expressions but:
- Works as a standalone library
- Can be driven by another reactive system through `registerCreateComponent`
- Serves both JSX and `` html`` `` templates, which compile to the same calls

### vs React

- Fine-grained reactivity (no virtual DOM)
- No reconciliation needed
- Direct DOM manipulation
- Smaller runtime size
- Better performance for many use cases

## Contributing

Contributions are welcome! Please see the main repository for guidelines.

## License

MIT

## Related Packages

- `@fluixi/jsx` - JSX runtime using this DOM package
- `@fluixi/reactive` - Signal and store implementations
- `@fluixi/compiler` - Compiles JSX and `` html`` `` into these calls

## Resources

- [SolidJS Documentation](https://www.solidjs.com/) — dom-expressions is the closest prior art
- [dom-expressions](https://github.com/ryansolid/dom-expressions)
- [Fluixi docs](https://docs.fluixi.com)