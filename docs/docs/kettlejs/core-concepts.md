---
sidebar_position: 4
---

# Core Concepts

Understanding KettleJS core concepts will help you build reactive applications effectively. This guide covers the fundamental building blocks of the framework.

## Reactivity

KettleJS uses **fine-grained reactivity** powered by signals. Unlike virtual DOM frameworks that re-render entire components, KettleJS surgically updates only the exact DOM nodes that depend on changed data.

### How It Works

```typescript
import { createSignal } from '@awc/reactive/signal';

// Create a signal
const [count, setCount] = createSignal(0);

// Read the value
console.log(count()); // 0

// Update the value
setCount(1);
setCount(c => c + 1); // functional update
```

When you call `count()` inside a reactive context (like a template or effect), KettleJS automatically tracks that dependency. When `count` changes, only the parts of your UI that use `count()` will update.

## Signals

Signals are the core primitive for reactive state in KettleJS.

### Creating Signals

```typescript
import { createSignal } from '@awc/reactive/signal';

// Basic signal
const [value, setValue] = createSignal(0);

// With initial value
const [name, setName] = createSignal('John');

// Objects and arrays
const [user, setUser] = createSignal({ name: 'John', age: 30 });
const [items, setItems] = createSignal([1, 2, 3]);
```

### Reading Signals

Always call signals as functions:

```typescript
const [count, setCount] = createSignal(0);

// ✅ Correct - call as function
console.log(count());

// ❌ Wrong - missing parentheses
console.log(count);
```

### Updating Signals

```typescript
// Direct value
setCount(5);

// Functional update (recommended)
setCount(current => current + 1);

// Objects - create new reference
setUser(current => ({ ...current, age: 31 }));

// Arrays - create new array
setItems(current => [...current, 4]);
```

### Why Functional Updates?

Functional updates are safer and more composable:

```typescript
// Direct update - might use stale value
setCount(count() + 1);

// Functional update - always uses latest value
setCount(c => c + 1);
```

## Effects

Effects are side effects that run when their dependencies change.

### Basic Effects

```typescript
import { createSignal, createEffect } from '@awc/reactive/signal';

const [count, setCount] = createSignal(0);

// Effect runs immediately and whenever count changes
createEffect(() => {
  console.log('Count is now:', count());
});

setCount(1); // Logs: "Count is now: 1"
```

### Cleanup

Effects can return a cleanup function:

```typescript
createEffect(() => {
  const timer = setInterval(() => {
    console.log('Tick', count());
  }, 1000);

  // Cleanup runs before next effect or on disposal
  return () => clearInterval(timer);
});
```

### Manual Disposal

```typescript
const dispose = createEffect(() => {
  console.log('Running effect');
});

// Stop the effect manually
dispose();
```

## Memos

Memos are computed values that update automatically when dependencies change.

### Creating Memos

```typescript
import { createSignal, createMemo } from '@awc/reactive/signal';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

// Computed value
const fullName = createMemo(() => {
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // "John Doe"
setFirstName('Jane');
console.log(fullName()); // "Jane Doe"
```

### Why Use Memos?

Memos cache the result and only recompute when dependencies change:

```typescript
// Without memo - recalculates every time
const expensive = () => {
  console.log('Computing...');
  return heavyCalculation(count());
};

// With memo - only recalculates when count changes
const expensive = createMemo(() => {
  console.log('Computing...');
  return heavyCalculation(count());
});
```

## Components

KettleJS supports multiple component patterns.

### Functional Components

Simple functions that return templates:

```typescript
import { html, Component } from '@awc/kettlejs';

export const MyComponent: Component = () => {
  return html`<div>Hello World</div>`;
};
```

### With Props

```typescript
interface MyComponentProps {
  title: string;
  count: number;
}

export const MyComponent: Component<MyComponentProps> = (props) => {
  return html`
    <div>
      <h1>${props.title}</h1>
      <p>Count: ${props.count}</p>
    </div>
  `;
};

// Usage
MyComponent({ title: 'Hello', count: 5 });
```

### KettleElement (Class-Based)

Web components with built-in reactivity:

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

@customElement('my-component')
export class MyComponent extends KettleElement {
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

### LitElement (Standard)

Plain Lit web components:

```typescript
import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('my-component')
export class MyComponent extends LitElement {
  @state() count = 0;

  render() {
    return html`
      <button @click=${() => this.count++}>
        Count: ${this.count}
      </button>
    `;
  }
}
```

## Templates

KettleJS uses lit-html for templating.

### Basic Syntax

```typescript
import { html } from 'lit';

const template = html`
  <div>
    <h1>Title</h1>
    <p>Content</p>
  </div>
`;
```

### Dynamic Values

```typescript
const name = 'John';
const age = 30;

html`
  <div>
    <p>Name: ${name}</p>
    <p>Age: ${age}</p>
  </div>
`;
```

### Reactive Bindings

```typescript
const [count, setCount] = createSignal(0);

html`
  <div>
    <!-- Updates automatically when count changes -->
    <p>Count: ${count()}</p>
  </div>
`;
```

### Attributes

```typescript
const [disabled, setDisabled] = createSignal(false);
const [className, setClassName] = createSignal('active');

html`
  <!-- Boolean attribute -->
  <button ?disabled=${disabled()}>Click</button>
  
  <!-- String attribute -->
  <div class=${className()}></div>
  
  <!-- Property binding (with .) -->
  <input .value=${inputValue()} />
`;
```

### Event Handlers

```typescript
const handleClick = () => console.log('Clicked!');
const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  console.log('Input:', value);
};

html`
  <button @click=${handleClick}>Click Me</button>
  <input @input=${handleInput} />
`;
```

## Reactive Ownership

KettleJS uses ownership trees to manage reactive computations and cleanup.

### Automatic Cleanup in KettleElement

```typescript
@customElement('my-component')
export class MyComponent extends KettleElement {
  connectedCallback() {
    super.connectedCallback();

    // Effects created in runInScope are automatically cleaned up
    this.runInScope(() => {
      createEffect(() => {
        console.log('This will be cleaned up when component disconnects');
      });
    });
  }

  view() {
    return html`<div>Component</div>`;
  }
}
```

### Manual Ownership

```typescript
import { getOwner, runWithOwner } from '@awc/reactive/signal';

// Capture current owner
const owner = getOwner();

// Run computation under owner
setTimeout(() => {
  runWithOwner(owner, () => {
    createEffect(() => {
      // This effect is owned by the captured owner
    });
  });
}, 1000);
```

## Batching

Multiple signal updates are automatically batched for efficiency.

### Automatic Batching

```typescript
const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('John');

createEffect(() => {
  console.log('Effect runs once, not twice');
  console.log(count(), name());
});

// Both updates batched into single effect run
setCount(1);
setName('Jane');
```

### Manual Batching

```typescript
import { batch } from '@awc/reactive/signal';

batch(() => {
  setCount(1);
  setName('Jane');
  setAge(30);
  // Effect runs once after all updates
});
```

## Untracked Reads

Sometimes you need to read a signal without creating a dependency.

```typescript
import { untrack } from '@awc/reactive/signal';

const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

const computed = createMemo(() => {
  const valueA = a(); // Tracked
  const valueB = untrack(() => b()); // Not tracked
  return valueA + valueB;
});

// Updates computed
setA(10);

// Does NOT update computed
setB(20);
```

## Best Practices

### 1. Use Functional Updates

```typescript
// ✅ Good
setCount(c => c + 1);

// ❌ Avoid
setCount(count() + 1);
```

### 2. Memoize Expensive Computations

```typescript
// ✅ Good - computed once per change
const filtered = createMemo(() => {
  return items().filter(item => item.active);
});

// ❌ Avoid - recalculated on every read
const filtered = () => items().filter(item => item.active);
```

### 3. Cleanup Effects

```typescript
// ✅ Good
createEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
});

// ❌ Avoid - memory leak
createEffect(() => {
  setInterval(() => {}, 1000);
});
```

### 4. Immutable Updates

```typescript
// ✅ Good - new reference
setUser(user => ({ ...user, age: 31 }));
setItems(items => [...items, newItem]);

// ❌ Avoid - mutates original
setUser(user => {
  user.age = 31;
  return user;
});
```

### 5. Use KettleElement for Web Components

```typescript
// ✅ Good - automatic cleanup
@customElement('my-component')
export class MyComponent extends KettleElement {
  private count = createSignal(0);
  view() { /* ... */ }
}

// ❌ Avoid - manual cleanup needed
@customElement('my-component')
export class MyComponent extends LitElement {
  private count = createSignal(0);
  // Need manual cleanup!
}
```

## Performance Tips

### 1. Fine-Grained Updates

Signals update only what changes:

```typescript
// Only the specific <span> updates, not entire div
html`
  <div>
    <h1>Static Title</h1>
    <span>${count()}</span>
    <p>Static content</p>
  </div>
`;
```

### 2. Use Memos for Derived State

```typescript
// Expensive operation runs once per source change
const filtered = createMemo(() => {
  return largeArray().filter(expensiveFilter);
});
```

### 3. Batch Multiple Updates

```typescript
batch(() => {
  setA(1);
  setB(2);
  setC(3);
});
```

### 4. Use For for Lists

```typescript
// ✅ Efficient - keyed updates
For({
  each: items,
  children: (item) => html`<div>${item.name}</div>`
});

// ❌ Slower - recreates all items
html`${items().map(item => html`<div>${item.name}</div>`)}`;
```

## Common Patterns

### Loading State

```typescript
const [data, setData] = createSignal(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal(null);

async function loadData() {
  setLoading(true);
  setError(null);
  try {
    const result = await fetchData();
    setData(result);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
}
```

### Form Handling

```typescript
const [formData, setFormData] = createSignal({
  name: '',
  email: ''
});

const updateField = (field: string) => (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  setFormData(data => ({ ...data, [field]: value }));
};

html`
  <input @input=${updateField('name')} />
  <input @input=${updateField('email')} />
`;
```

### Toggle State

```typescript
const [isOpen, setIsOpen] = createSignal(false);
const toggle = () => setIsOpen(o => !o);

html`<button @click=${toggle}>${isOpen() ? 'Close' : 'Open'}</button>`;
```

## Next Steps

- [Control Flow](./features/control-flow.md) - Show, For, Switch components
- [Resources](./features/resources.md) - Async data management
- [Router](./features/routing.md) - Client-side routing
- [Context](./features/context.md) - Dependency injection

---

**Next:** [Features →](./features/control-flow.md)