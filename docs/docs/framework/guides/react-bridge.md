# React Bridge - Using Fluixi with React

Complete integration between Fluixi and React using `@lit/react`.

## Overview

The React Bridge provides two approaches:

1. **Native JSX Runtime** - Pure Fluixi with JSX syntax
2. **React Bridge (@lit/react)** - Full React ecosystem compatibility

## Installation

```bash
npm install @fluixi/core @lit/react react react-dom
```

## Quick Comparison

| Feature | Native JSX | React Bridge |
|---------|-----------|--------------|
| Syntax | JSX | JSX/React |
| Reactivity | Fluixi Signals | React State + Signals |
| Components | Fluixi | React Components |
| Ecosystem | Limited | Full React |
| Performance | Excellent | Good |
| Learning Curve | Low | Medium |
| Best For | Pure Fluixi | React Integration |

## Native JSX Runtime

```tsx
// Pure Fluixi with JSX
import { createSignal } from '@fluixi/reactive';

export function Counter() {
  const [count, setCount] = createSignal(0);
  
  return (
    <button onClick={() => setCount(count() + 1)}>
      Count: {count()}
    </button>
  );
}
```

## React Bridge (@lit/react)

### Basic Usage

```tsx
// Fluixi Element
import { FluixiElement } from '@fluixi/core';
import { customElement } from 'lit/decorators.js';
import { createSignal } from '@fluixi/reactive';
import { html } from 'lit';

@customElement('counter-element')
class CounterElement extends FluixiElement {
  private [count, setCount] = createSignal(0);
  
  view() {
    return html`
      <button @click=${() => this.setCount(this.count() + 1)}>
        Count: ${this.count()}
      </button>
    `;
  }
}

// React Wrapper
import { createReactComponent } from '@fluixi/core/react-bridge';

export const Counter = createReactComponent(
  'counter-element',
  CounterElement,
  {
    events: {
      onCountChange: 'count-change'
    }
  }
);

// Use in React
import React from 'react';

function App() {
  return (
    <div>
      <h1>React App with Fluixi</h1>
      <Counter />
    </div>
  );
}
```

### Using Hooks

```tsx
import { 
  useSignal, 
  useFluixiEffect, 
  useFluixiMemo 
} from '@fluixi/core/react-bridge';

function Counter() {
  const [count, setCount] = useSignal(0);
  
  useFluixiEffect(() => {
    console.log('Count:', count());
  });
  
  const doubled = useFluixiMemo(() => count() * 2);
  
  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
}
```

### Wrapping Fluixi Components

```tsx
import { wrapFluixiElement } from '@fluixi/core/react-bridge';
import { MyFluixiElement } from './my-element';

export const MyComponent = wrapFluixiElement(
  MyFluixiElement,
  'my-element',
  {
    onUpdate: 'update',
    onChange: 'change'
  }
);
```

### Using Resources

```tsx
import { useFluixiResource } from '@fluixi/core/react-bridge';

function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error, refetch } = useFluixiResource(
    () => userId,
    (id) => fetch(`/api/users/${id}`).then(r => r.json())
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>{data?.name}</h2>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Control Flow

```tsx
import { ReactControlFlow } from '@fluixi/core/react-bridge';

const { Show, For } = ReactControlFlow;

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div>
      <Show when={todos.length > 0} fallback={<p>No todos</p>}>
        <For each={todos}>
          {(todo, index) => (
            <div key={todo.id}>
              {index}: {todo.text}
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
```

### Context Integration

```tsx
import { 
  createReactProvider,
  useFluixiContext 
} from '@fluixi/core/react-bridge';
import { createContext } from '@fluixi/core/context';

// Create Fluixi context
const ThemeContext = createContext({ mode: 'light' });

// Create React provider
const ThemeProvider = createReactProvider(ThemeContext);

// Use in React
function App() {
  return (
    <ThemeProvider value={{ mode: 'dark' }}>
      <ThemedButton />
    </ThemeProvider>
  );
}

function ThemedButton() {
  const theme = useFluixiContext(ThemeContext);
  return <button style={{ background: theme.mode === 'dark' ? '#333' : '#fff' }}>
    Themed Button
  </button>;
}
```

### Adapter Pattern

```tsx
import { fluixiReactAdapter } from '@fluixi/core/react-bridge';

// Register all components
const { Button, Input, Card } = fluixiReactAdapter.registerAll({
  'my-button': { class: ButtonElement, events: { onClick: 'click' } },
  'my-input': { class: InputElement, events: { onInput: 'input' } },
  'my-card': { class: CardElement }
});

// Use in React
function Form() {
  return (
    <Card>
      <Input onChange={handleChange} />
      <Button onClick={handleSubmit}>Submit</Button>
    </Card>
  );
}
```

## Advanced Patterns

### HOC Pattern

```tsx
import { withReact } from '@fluixi/core/react-bridge';
import { html } from 'lit';
import { createSignal } from '@fluixi/reactive';

const FluixiCounter = () => {
  const [count, setCount] = createSignal(0);
  return html`
    <button @click=${() => setCount(count() + 1)}>
      ${count()}
    </button>
  `;
};

export const Counter = withReact(FluixiCounter);
```

### Error Boundary

```tsx
import { FluixiErrorBoundary } from '@fluixi/core/react-bridge';

function App() {
  return (
    <FluixiErrorBoundary fallback={<div>Error occurred</div>}>
      <MyFluixiComponents />
    </FluixiErrorBoundary>
  );
}
```

### Performance Utilities

```tsx
import { PerformanceUtils } from '@fluixi/core/react-bridge';

function SearchInput() {
  const [value, setValue] = useState('');
  const debouncedValue = PerformanceUtils.useDebounce(value, 300);
  
  useEffect(() => {
    search(debouncedValue);
  }, [debouncedValue]);
  
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

## When to Use Each Approach

### Use Native JSX When:
- Building pure Fluixi applications
- Maximum performance is critical
- No React dependencies needed
- Simple component structure

### Use React Bridge When:
- Integrating with existing React apps
- Need React ecosystem tools
- Using React libraries
- Team familiar with React
- Need React DevTools

## Migration Guide

### From React to Fluixi

```tsx
// React
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count:', count);
  }, [count]);
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Fluixi with React Bridge
function Counter() {
  const [count, setCount] = useSignal(0);
  
  useFluixiEffect(() => {
    console.log('Count:', count());
  });
  
  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}
```

## Best Practices

1. **Choose One Approach** - Don't mix native JSX and React Bridge in same component
2. **Use Adapter** - Register all components upfront
3. **Error Boundaries** - Wrap Fluixi components
4. **Performance** - Use debounce/throttle utilities
5. **Testing** - Test both Fluixi and React integration

## See Also

- [Native JSX Guide](./jsx-tsx-guide.md)
- [JSX Examples](./jsx-examples.md)
- [Migration Guide](./migration.md)
