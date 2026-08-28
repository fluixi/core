# Fluixi Integration Guide

## Overview

Fluixi has been updated to properly integrate with the existing `@fluixi/reactive` signal system and provide seamless Lit-HTML component integration. This guide explains the new architecture and how to use it.

## Architecture Changes

### 1. Using Existing @fluixi/reactive Primitives

Fluixi now **re-exports** the reactive primitives from `@fluixi/reactive` instead of reimplementing them:

```typescript
// ✅ Correct - Use from @fluixi/reactive
import { 
  createSignal, 
  createEffect, 
  createMemo,
  createRoot,
  batch,
  untrack,
  createContext,
  useContext
} from '@fluixi/reactive';

// ❌ Incorrect - Don't reimplement
// createSignal is already implemented in @fluixi/reactive
```

### 2. Reactive Controller Pattern

The framework provides a `SignalController` that implements Lit's `ReactiveController` interface:

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { createEffect, createRoot, getOwner, runWithOwner } from '@fluixi/reactive';

export class SignalController implements ReactiveController {
  private dispose?: () => void;
  private owner?: RootOwner;

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    this.dispose = createRoot((disposeRoot) => {
      this.owner = getOwner() as RootOwner;
      createEffect(() => {
        this.host.requestUpdate();
      });
      return disposeRoot;
    });
  }

  hostDisconnected(): void {
    if (this.dispose) {
      this.dispose();
      this.dispose = undefined;
      this.owner = undefined;
    }
  }
}
```

### 3. FluixiElement Base Class

Components extend `FluixiElement` which automatically integrates reactive signals:

```typescript
import { LitElement } from 'lit';
import { SignalController } from './reactive.js';

export abstract class FluixiElement extends LitElement {
  private _signals = new SignalController(this);
  
  abstract view(): unknown;

  render() {
    current = this;
    const result = this.view();
    current = null;
    return result;
  }
}
```

## Usage Patterns

### Pattern 1: Using FluixiElement

The simplest way to create reactive components:

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from 'fluixi/core/component';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
class MyCounter extends FluixiElement {
  private [count, setCount] = createSignal(0);

  view() {
    return html`
      <div>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(c => c + 1)}>+</button>
      </div>
    `;
  }
}
```

### Pattern 2: Using WithSignals Mixin

For existing LitElement classes:

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from 'fluixi/core/reactive';
import { createSignal } from '@fluixi/reactive';

@customElement('my-element')
class MyElement extends WithSignals(LitElement) {
  private [count, setCount] = createSignal(0);

  render() {
    return html`
      <button @click=${() => this.setCount(c => c + 1)}>
        Count: ${this.count()}
      </button>
    `;
  }
}
```

### Pattern 3: Using SignalController Directly

For manual control:

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from 'fluixi/core/reactive';
import { createSignal } from '@fluixi/reactive';

@customElement('my-element')
class MyElement extends LitElement {
  private _signals = new SignalController(this);
  private [count, setCount] = createSignal(0);

  render() {
    return html`<p>Count: ${this.count()}</p>`;
  }
}
```

## Integration with Existing Features

### 1. Context API

Uses `@fluixi/reactive`'s built-in context system:

```typescript
import { createContext, useContext } from '@fluixi/reactive';

// Create context
const ThemeContext = createContext({ dark: false });

// Use in component
class MyComponent extends FluixiElement {
  view() {
    const theme = useContext(ThemeContext);
    return html`<div class=${theme.dark ? 'dark' : 'light'}>...</div>`;
  }
}
```

### 2. Effects

Use effects within the component's reactive scope:

```typescript
import { createEffect } from '@fluixi/reactive';

class MyComponent extends FluixiElement {
  private [data, setData] = createSignal(null);

  connectedCallback() {
    super.connectedCallback();
    
    this.runInScope(() => {
      createEffect(() => {
        console.log('Data changed:', this.data());
      });
    });
  }

  view() {
    return html`<div>${this.data()}</div>`;
  }
}
```

### 3. Memos

Use memos for computed values:

```typescript
import { createSignal, createMemo } from '@fluixi/reactive';

class MyComponent extends FluixiElement {
  private [firstName, setFirstName] = createSignal('John');
  private [lastName, setLastName] = createSignal('Doe');
  private fullName = createMemo(() => `${this.firstName()} ${this.lastName()}`);

  view() {
    return html`<p>Full Name: ${this.fullName()}</p>`;
  }
}
```

### 4. Batching

Use batch for multiple updates:

```typescript
import { batch } from '@fluixi/reactive';

class MyComponent extends FluixiElement {
  private [a, setA] = createSignal(0);
  private [b, setB] = createSignal(0);

  updateBoth() {
    batch(() => {
      this.setA(1);
      this.setB(2);
    }); // Only one render update
  }
}
```

## Working with Non-Fluixi Lit Components

Fluixi components can work alongside regular Lit components:

```typescript
// Regular Lit component
@customElement('regular-element')
class RegularElement extends LitElement {
  render() {
    return html`<div>Regular Lit Element</div>`;
  }
}

// Fluixi reactive component
@customElement('reactive-element')
class ReactiveElement extends FluixiElement {
  private [count, setCount] = createSignal(0);

  view() {
    return html`
      <div>
        <regular-element></regular-element>
        <p>Reactive Count: ${this.count()}</p>
      </div>
    `;
  }
}
```

## SSR and Hydration

Fluixi now includes SSR and hydration support:

```typescript
import { hydrate, isServer } from 'fluixi/ssr/hydration';

// Server-side
if (isServer()) {
  // Render to string (requires @lit-labs/ssr)
  const html = await renderToString(template, { includeState: true });
}

// Client-side
if (!isServer()) {
  // Hydrate existing markup
  await hydrate({
    root: document.getElementById('app')!,
    template: html`<my-app></my-app>`,
    initialState: { count: 0 },
    onHydrated: () => console.log('Hydrated!')
  });
}
```

## Best Practices

### 1. Use Signals for Reactive State

```typescript
// ✅ Good
private [count, setCount] = createSignal(0);

// ❌ Avoid - not reactive
private count = 0;
```

### 2. Use Memos for Derived State

```typescript
// ✅ Good - computed once
private doubled = createMemo(() => this.count() * 2);

// ❌ Avoid - recomputed every render
get doubled() { return this.count() * 2; }
```

### 3. Batch Related Updates

```typescript
// ✅ Good - single render
batch(() => {
  setA(1);
  setB(2);
  setC(3);
});

// ❌ Avoid - three renders
setA(1);
setB(2);
setC(3);
```

### 4. Clean Up Effects

```typescript
// ✅ Good
connectedCallback() {
  super.connectedCallback();
  this.runInScope(() => {
    createEffect(() => {
      const timer = setInterval(() => {}, 1000);
      onCleanup(() => clearInterval(timer));
    });
  });
}
```

### 5. Use FluixiElement for New Components

```typescript
// ✅ Good - automatic reactivity
class MyComponent extends FluixiElement {
  view() { return html`...`; }
}

// ⚠️ OK but manual - use WithSignals or SignalController
class MyComponent extends LitElement {
  private _signals = new SignalController(this);
  render() { return html`...`; }
}
```

## Migration from Old Architecture

If you were using the old Fluixi implementation:

### Old Way:
```typescript
import { createSignal, render } from 'fluixi'; // Don't do this
```

### New Way:
```typescript
// Use reactive primitives from @fluixi/reactive
import { createSignal, createEffect } from '@fluixi/reactive';

// Use Lit for rendering
import { html, render } from 'lit';

// Use FluixiElement for components
import { FluixiElement } from 'fluixi/core/component';
```

## File Structure

```
fluixi/
├── core/
│   ├── src/
│   │   ├── component.ts       # FluixiElement base class
│   │   ├── reactive.ts        # SignalController
│   │   ├── hydration.ts       # Hydration support
│   │   └── ssr.ts             # SSR utilities
│   └── index.ts               # Core exports
├── control-flow/
│   ├── Show.ts                # Conditional rendering
│   ├── For.ts                 # List rendering
│   ├── Portal.ts              # Portal rendering
│   └── Dynamic.ts             # Dynamic components
├── router/
│   └── router.ts              # Client-side routing
├── resources/
│   └── resource.ts            # Async data fetching
└── ssr/
    └── hydration.ts           # SSR and hydration
```

## Complete Example

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from 'fluixi/core/component';
import { createSignal, createEffect, createMemo, batch } from '@fluixi/reactive';

@customElement('todo-app')
class TodoApp extends FluixiElement {
  private [todos, setTodos] = createSignal<Todo[]>([]);
  private [filter, setFilter] = createSignal<'all' | 'active' | 'completed'>('all');

  // Computed value
  private filteredTodos = createMemo(() => {
    const all = this.todos();
    const f = this.filter();
    
    if (f === 'active') return all.filter(t => !t.done);
    if (f === 'completed') return all.filter(t => t.done);
    return all;
  });

  connectedCallback() {
    super.connectedCallback();
    
    // Load todos from localStorage
    this.runInScope(() => {
      createEffect(() => {
        const todos = this.todos();
        localStorage.setItem('todos', JSON.stringify(todos));
      });
    });
  }

  addTodo(text: string) {
    this.setTodos([...this.todos(), { id: Date.now(), text, done: false }]);
  }

  toggleTodo(id: number) {
    this.setTodos(
      this.todos().map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }

  view() {
    return html`
      <div class="todo-app">
        <input 
          @keypress=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              this.addTodo((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
          placeholder="What needs to be done?"
        />
        
        <div class="filters">
          <button @click=${() => this.setFilter('all')}>All</button>
          <button @click=${() => this.setFilter('active')}>Active</button>
          <button @click=${() => this.setFilter('completed')}>Completed</button>
        </div>

        <ul>
          ${this.filteredTodos().map(todo => html`
            <li>
              <input
                type="checkbox"
                .checked=${todo.done}
                @change=${() => this.toggleTodo(todo.id)}
              />
              <span class=${todo.done ? 'done' : ''}>${todo.text}</span>
            </li>
          `)}
        </ul>
      </div>
    `;
  }
}
```

## Next Steps

1. ✅ **Use existing @fluixi/reactive primitives** - Don't reimplement signals
2. ✅ **Use SignalController** - For Lit integration
3. ✅ **Extend FluixiElement** - For automatic reactivity
4. ⏳ **Add dev server** - Create Vite plugin for development
5. ⏳ **Add builder** - Integration with mix-builder
6. ⏳ **Complete SSR** - Full server-side rendering support
7. ⏳ **Add DevTools** - Browser extension for debugging

## Resources

- [@fluixi/reactive Documentation](../reactive/README.md)
- [Lit Documentation](https://lit.dev)
- [Reactive Controller Pattern](https://lit.dev/docs/composition/controllers/)