---
sidebar_position: 10
title: JSX/TSX Guide
---

# Using JSX/TSX with KettleJS

KettleJS supports JSX/TSX syntax, allowing you to use React-like component syntax while benefiting from KettleJS's fine-grained reactivity and lit-html performance.

## Setup

### 1. Install Dependencies

```bash
npm install @fluixi/kettlejs @fluixi/reactive lit
```

### 2. Configure TypeScript

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### 3. Configure Build Tool

#### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxImportSource: '@fluixi/kettlejs',
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment'
  }
});
```

#### Webpack

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            jsx: 'react-jsx',
            jsxImportSource: '@fluixi/kettlejs'
          }
        }
      }
    ]
  }
};
```

## Basic Usage

### Your First JSX Component

```tsx
import { createSignal } from '@fluixi/reactive';

const Counter = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  );
};
```

### Props and TypeScript

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

const Button = (props: ButtonProps) => {
  const variant = props.variant || 'primary';
  
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
};

// Usage
const App = () => {
  return (
    <Button 
      label="Click me" 
      variant="primary"
      onClick={() => console.log('Clicked!')} 
    />
  );
};
```

## JSX vs lit-html

### Syntax Comparison

#### lit-html
```typescript
const MyComponent = () => {
  const [count, setCount] = createSignal(0);
  
  return html`
    <div>
      <p>Count: ${count()}</p>
      <button @click=${() => setCount(count() + 1)}>+</button>
    </div>
  `;
};
```

#### JSX
```tsx
const MyComponent = () => {
  const [count, setCount] = createSignal(0);
  
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
};
```

### Feature Comparison

| Feature | lit-html | JSX | Notes |
|---------|----------|-----|-------|
| Event Handling | `@click` | `onClick` | JSX uses camelCase |
| Properties | `.value` | `value` or `.value` | Both work in JSX |
| Classes | `class` | `className` or `class` | Both work in JSX |
| Conditionals | `${condition ? a : b}` | `{condition ? a : b}` | Same logic |
| Lists | `${map()}` | `{items.map()}` | Similar patterns |
| Fragments | `html\`...\`` | `<>...</>` | JSX has cleaner syntax |

## Event Handling

### Click Events

```tsx
const ClickExample = () => {
  const handleClick = (e: MouseEvent) => {
    console.log('Clicked!', e);
  };

  return (
    <div>
      <button onClick={handleClick}>Click Me</button>
      <button onClick={() => console.log('Inline')}>Inline</button>
    </div>
  );
};
```

### Input Events

```tsx
const InputExample = () => {
  const [value, setValue] = createSignal('');

  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    setValue(input.value);
  };

  return (
    <div>
      <input 
        type="text"
        value={value()}
        onInput={handleInput}
      />
      <p>You typed: {value()}</p>
    </div>
  );
};
```

### Form Events

```tsx
const FormExample = () => {
  const [formData, setFormData] = createSignal({
    name: '',
    email: ''
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log('Form data:', formData());
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData(), [field]: value });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData().name}
        onInput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData().email}
        onInput={(e) => updateField('email', (e.target as HTMLInputElement).value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

## Conditional Rendering

### Using Show Component

```tsx
import { Show } from '@fluixi/kettlejs';

const UserProfile = () => {
  const [user, setUser] = createSignal<User | null>(null);

  return (
    <div>
      <Show
        when={user()}
        fallback={<p>Loading...</p>}
      >
        {(u) => (
          <div>
            <h2>{u.name}</h2>
            <p>{u.email}</p>
          </div>
        )}
      </Show>
    </div>
  );
};
```

### Ternary Operator

```tsx
const ConditionalExample = () => {
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);

  return (
    <div>
      {isLoggedIn() ? (
        <p>Welcome back!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
};
```

### Logical AND

```tsx
const NotificationExample = () => {
  const [hasNotifications, setHasNotifications] = createSignal(true);
  const [count, setCount] = createSignal(5);

  return (
    <div>
      {hasNotifications() && (
        <span className="badge">{count()}</span>
      )}
    </div>
  );
};
```

## List Rendering

### Using For Component

```tsx
import { For } from '@fluixi/kettlejs';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([
    { id: 1, text: 'Learn KettleJS', done: false },
    { id: 2, text: 'Build an app', done: false }
  ]);

  return (
    <ul>
      <For each={todos()}>
        {(todo) => (
          <li className={todo.done ? 'done' : ''}>
            {todo.text}
          </li>
        )}
      </For>
    </ul>
  );
};
```

### Using map

```tsx
const SimpleList = () => {
  const [items, setItems] = createSignal(['Apple', 'Banana', 'Cherry']);

  return (
    <ul>
      {items().map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};
```

## Styling

### Inline Styles

```tsx
const StyledComponent = () => {
  const [color, setColor] = createSignal('#ff0000');

  return (
    <div style={{ 
      color: color(),
      padding: '20px',
      backgroundColor: '#f0f0f0'
    }}>
      Styled content
    </div>
  );
};
```

### Class Names

```tsx
const ClassExample = () => {
  const [isActive, setIsActive] = createSignal(false);

  return (
    <div>
      {/* String */}
      <button className="btn btn-primary">Button</button>

      {/* Dynamic */}
      <button className={isActive() ? 'active' : 'inactive'}>
        Toggle
      </button>

      {/* Template literal */}
      <button className={`btn ${isActive() ? 'btn-active' : 'btn-inactive'}`}>
        Dynamic Button
      </button>
    </div>
  );
};
```

### Using classMap

```tsx
import { classMap } from 'lit/directives/class-map.js';

const ClassMapExample = () => {
  const [isActive, setIsActive] = createSignal(true);
  const [isDisabled, setIsDisabled] = createSignal(false);

  return (
    <button className={classMap({
      btn: true,
      active: isActive(),
      disabled: isDisabled()
    })}>
      Button
    </button>
  );
};
```

## Fragments

### Using Fragment

```tsx
import { Fragment } from '@fluixi/kettlejs/jsx-runtime';

const MultiElement = () => {
  return (
    <Fragment>
      <h1>Title</h1>
      <p>Paragraph 1</p>
      <p>Paragraph 2</p>
    </Fragment>
  );
};
```

### Short Syntax

```tsx
const MultiElement = () => {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph 1</p>
      <p>Paragraph 2</p>
    </>
  );
};
```

## Refs

### Using ref Directive

```tsx
import { ref } from '@fluixi/kettlejs';

const RefExample = () => {
  let inputRef: HTMLInputElement | null = null;

  const focusInput = () => {
    inputRef?.focus();
  };

  return (
    <div>
      <input ref={(el) => inputRef = el} type="text" />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
};
```

### With createRef

```tsx
import { createRef } from '@fluixi/kettlejs';

const RefObjectExample = () => {
  const inputRef = createRef<HTMLInputElement>();

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
};
```

## Component Composition

### Parent-Child Communication

```tsx
interface ChildProps {
  message: string;
  onAction: (data: string) => void;
}

const Child = (props: ChildProps) => {
  return (
    <div>
      <p>{props.message}</p>
      <button onClick={() => props.onAction('Hello from child')}>
        Send Message
      </button>
    </div>
  );
};

const Parent = () => {
  const [message, setMessage] = createSignal('Hello from parent');

  const handleAction = (data: string) => {
    console.log('Received:', data);
  };

  return (
    <div>
      <Child message={message()} onAction={handleAction} />
    </div>
  );
};
```

### Children Prop

```tsx
interface CardProps {
  title: string;
  children?: JSX.Element;
}

const Card = (props: CardProps) => {
  return (
    <div className="card">
      <h3>{props.title}</h3>
      <div className="card-body">
        {props.children}
      </div>
    </div>
  );
};

// Usage
const App = () => {
  return (
    <Card title="My Card">
      <p>This is the card content</p>
      <button>Action</button>
    </Card>
  );
};
```

## Advanced Patterns

### Render Props

```tsx
interface RenderPropProps {
  data: any[];
  render: (item: any, index: number) => JSX.Element;
}

const DataList = (props: RenderPropProps) => {
  return (
    <ul>
      {props.data.map((item, index) => (
        <li key={index}>{props.render(item, index)}</li>
      ))}
    </ul>
  );
};

// Usage
const App = () => {
  const [items] = createSignal([1, 2, 3, 4, 5]);

  return (
    <DataList
      data={items()}
      render={(item, index) => (
        <span>Item {index}: {item}</span>
      )}
    />
  );
};
```

### Higher-Order Components

```tsx
function withLoading<P extends object>(
  Component: (props: P) => JSX.Element
) {
  return (props: P & { loading?: boolean }) => {
    const { loading, ...rest } = props;

    if (loading) {
      return <div>Loading...</div>;
    }

    return <Component {...rest as P} />;
  };
}

// Usage
const UserProfile = (props: { user: User }) => {
  return <div>{props.user.name}</div>;
};

const UserProfileWithLoading = withLoading(UserProfile);

// Use it
<UserProfileWithLoading user={user()} loading={isLoading()} />
```

### Custom Hooks Pattern

```tsx
function useCounter(initial: number = 0) {
  const [count, setCount] = createSignal(initial);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(initial);

  return { count, increment, decrement, reset };
}

const Counter = () => {
  const { count, increment, decrement, reset } = useCounter(0);

  return (
    <div>
      <h1>Count: {count()}</h1>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};
```

## Migrating from React

### Key Differences

1. **Signals vs State**: Use `createSignal` instead of `useState`
2. **Call Signals**: Must call `count()` to read, not just `count`
3. **No Re-renders**: Components don't re-render, signals update directly
4. **Effects**: Use `createEffect` instead of `useEffect`, no dependency array
5. **No useMemo/useCallback**: Not needed due to fine-grained reactivity

### Migration Example

#### React
```tsx
import { useState, useEffect } from 'react';

const ReactCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count:', count);
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
};
```

#### KettleJS
```tsx
import { createSignal, createEffect } from '@fluixi/reactive';

const KettleCounter = () => {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    console.log('Count:', count()); // Note: count()
  }); // No dependency array needed!

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
};
```

## Best Practices

### 1. Always Call Signals

```tsx
// ❌ Wrong
<p>Count: {count}</p>

// ✅ Correct
<p>Count: {count()}</p>
```

### 2. Use TypeScript

```tsx
// ✅ Good - fully typed
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

const UserCard = (props: UserCardProps) => {
  return <div>{props.user.name}</div>;
};
```

### 3. Extract Complex JSX

```tsx
// ✅ Good - extracted for readability
const UserInfo = (props: { user: User }) => (
  <div className="user-info">
    <h3>{props.user.name}</h3>
    <p>{props.user.email}</p>
  </div>
);

const UserCard = (props: { user: User }) => {
  return (
    <div className="card">
      <UserInfo user={props.user} />
      <button>Edit</button>
    </div>
  );
};
```

### 4. Memoize Expensive Computations

```tsx
import { createMemo } from '@fluixi/reactive';

const DataTable = (props: { items: Item[] }) => {
  const sortedItems = createMemo(() => {
    return [...props.items].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  });

  return (
    <table>
      {sortedItems().map(item => (
        <tr key={item.id}>
          <td>{item.name}</td>
        </tr>
      ))}
    </table>
  );
};
```

## Troubleshooting

### JSX Not Working

1. Check `tsconfig.json` has correct `jsx` and `jsxImportSource` settings
2. Ensure file extension is `.tsx` not `.ts`
3. Verify build tool is configured correctly

### Type Errors

```tsx
// If you get type errors, you might need to import JSX namespace
import type { JSX } from '@fluixi/kettlejs/jsx-runtime';

// Or add to tsconfig.json:
// "types": ["@fluixi/kettlejs/jsx-runtime"]
```

### Event Handler Types

```tsx
// Use correct event types
const handleClick = (e: MouseEvent) => { /* ... */ };
const handleInput = (e: Event) => { /* ... */ };
const handleSubmit = (e: Event) => { /* ... */ };
```

## See Also

- [Core Concepts](../core-concepts/signals.md)
- [Components Guide](../components/overview.md)
- [Migration from React](./migration.md#from-react)
- [TypeScript Guide](./typescript.md)

---

**Note**: JSX/TSX support in KettleJS is experimental but fully functional. Report any issues on [GitHub](https://github.com/adafri/kettlejs/issues).