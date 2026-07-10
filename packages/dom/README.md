<p align="center">
  <img src="https://raw.githubusercontent.com/fluixi/assets/main/logos/128x128.png" alt="Fluixi" width="120" height="120" />
</p>

# @fluixi/dom

**Reactive DOM runtime with surgical fine-grained updates, SSR and lit-html integration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![npm](https://img.shields.io/npm/v/@fluixi/dom?logo=npm)](https://www.npmjs.com/package/@fluixi/dom)
![lit-html](https://img.shields.io/badge/lit--html-compatible-324fff)

---

A comprehensive reactive DOM runtime with fine-grained updates, inspired by SolidJS's dom-expressions. This package provides low-level DOM manipulation utilities that work seamlessly with signal and store systems to enable optimal, surgical DOM updates.

## Features

- 🎯 **Fine-Grained Reactivity**: Only updates the exact DOM nodes that need to change
- 🔄 **Signal & Store Integration**: Works with any reactive system (signals, stores, observables)
- 🎨 **Lit-HTML Support**: Seamlessly integrate lit-html templates with native JSX
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

### Initialize Integration

```typescript
import { initializeIntegration } from '@fluixi/dom';
import { createEffect, batch } from '@fluixi/reactive/signal';

// Initialize with your reactive system
initializeIntegration({
  signalSystem: {
    createEffect,
    batch,
  },
});
```

## Core API

### DOM Manipulation

#### `insert(parent, accessor, marker?, init?)`

Insert dynamic content with automatic reactivity tracking.

```typescript
import { insert, createTextNode } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';

const [text, setText] = createSignal('Hello');
const div = document.createElement('div');

// Insert reactive content
insert(div, () => text());

// Or insert static content
insert(div, 'Static text');

// With a marker for positioning
const marker = createTextNode('');
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

## Integration System

The package provides a flexible integration system that works with any reactive library.

### Initialize with Signal System

```typescript
import { initializeIntegration } from '@fluixi/dom';
import * as signals from '@fluixi/reactive/signal';

initializeIntegration({
  signalSystem: {
    createEffect: signals.createEffect,
    batch: signals.batch,
    createMemo: signals.createMemo,
    untrack: signals.untrack,
    getOwner: signals.getOwner,
    runWithOwner: signals.runWithOwner,
    createRoot: signals.createRoot,
    onCleanup: signals.onCleanup,
  },
});
```

### Initialize with Store System

```typescript
import { initializeIntegration } from '@fluixi/dom';
import * as store from '@fluixi/reactive/store';

initializeIntegration({
  storeSystem: {
    isStore: store.isStore,
    unwrap: store.unwrap,
    isStoreProxy: store.isStoreProxy,
  },
});
```

### Auto-initialization

The package attempts to auto-initialize by detecting available reactive systems:

```typescript
import { autoInitialize } from '@fluixi/dom';

// Manually trigger auto-initialization
autoInitialize();
```

### Global Registration

Register your reactive systems globally for automatic detection:

```typescript
import { registerSignalSystem, registerStoreSystem } from '@fluixi/dom';

registerSignalSystem({
  createEffect: myCreateEffect,
  batch: myBatch,
});

registerStoreSystem({
  isStore: myIsStore,
  unwrap: myUnwrap,
});
```

## Lit-HTML Integration

Seamlessly use lit-html templates with reactive updates.

### Basic Usage

```typescript
import { signal } from '@fluixi/dom/reactive';
import { html } from 'lit';
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

const template = html`
  <div>
    <p>Count: ${signal(count)}</p>
    <button @click=${() => setCount(count() + 1)}>Increment</button>
  </div>
`;
```

### Reactive Directives

```typescript
import { signal, $if, $each } from '@fluixi/dom/reactive';
import { html } from 'lit';

const [items, setItems] = createSignal(['a', 'b', 'c']);
const [show, setShow] = createSignal(true);

const template = html`
  <div>
    ${$if(show, 
      html`<p>Visible content</p>`,
      html`<p>Hidden</p>`
    )}
    
    ${$each(items, 
      (item) => item,
      (item) => html`<li>${item}</li>`
    )}
  </div>
`;
```

### Auto-wrapping with `rx`

```typescript
import { rx } from '@fluixi/dom/reactive';

const [name, setName] = createSignal('World');

// Automatically wraps signal accessors
const template = rx`
  <div>Hello, ${name}!</div>
`;
```

## Advanced Usage

### Custom Effect System

```typescript
import { registerEffectCreator } from '@fluixi/dom';

registerEffectCreator((fn) => {
  // Your custom effect implementation
  const dispose = myCustomEffect(fn);
  return dispose;
});
```

### Custom Batch Function

```typescript
import { registerBatch } from '@fluixi/dom';

registerBatch((fn) => {
  // Your custom batching logic
  myCustomBatch(fn);
});
```

### Reactive Bindings

```typescript
import { createReactiveBinding } from '@fluixi/dom';

const cleanup = createReactiveBinding(
  () => mySignal(), // getter
  (value) => {
    // Update handler
    console.log('Value changed:', value);
  }
);

// Cleanup when done
cleanup();
```

### Memory Management

```typescript
import { createRoot, onCleanup } from '@fluixi/dom';

createRoot((dispose) => {
  // Set up reactive scope
  const effect = createEffect(() => {
    // Effect logic
  });
  
  // Register cleanup
  onCleanup(() => {
    effect();
    console.log('Cleaned up!');
  });
  
  // Dispose when done
  dispose();
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

### Check Integration Status

```typescript
import { getIntegrationStatus, logIntegrationStatus } from '@fluixi/dom';

// Get status object
const status = getIntegrationStatus();
console.log(status);

// Pretty print to console
logIntegrationStatus();
```

### Development Mode

Set the `development` flag when initializing:

```typescript
initializeIntegration({
  signalSystem: mySignalSystem,
  development: true, // Enables additional checks and warnings
});
```

## Comparison with Other Libraries

### vs SolidJS

This package is heavily inspired by SolidJS's dom-expressions but:
- Works as a standalone library
- Doesn't require a specific compiler
- Can integrate with any reactive system
- Supports both lit-html and native JSX

### vs React

- Fine-grained reactivity (no virtual DOM)
- No reconciliation needed
- Direct DOM manipulation
- Smaller runtime size
- Better performance for many use cases

### vs Lit

- Works with lit-html templates
- Adds fine-grained reactivity on top
- Can be used standalone without Lit components
- More flexible control flow

## Contributing

Contributions are welcome! Please see the main repository for guidelines.

## License

MIT

## Related Packages

- `@fluixi/jsx` - JSX runtime using this DOM package
- `@fluixi/reactive` - Signal and store implementations
- `lit` - Template literals for HTML

## Resources

- [SolidJS Documentation](https://www.solidjs.com/)
- [dom-expressions](https://github.com/ryansolid/dom-expressions)
- [Lit Documentation](https://lit.dev/)