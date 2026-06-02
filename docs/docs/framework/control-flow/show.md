---
sidebar_position: 1
title: Show Component
---

# Show Component

The `Show` component provides conditional rendering in KettleJS. It renders children when a condition is truthy, otherwise renders a fallback.

## Import

```typescript
import { Show } from '@fluixi/kettlejs';
```

## Signature

```typescript
function Show<T>(props: ShowProps<T>): TemplateResult | typeof nothing

interface ShowProps<T> {
  when: T | Accessor<T> | undefined | null | false;
  fallback?: ComponentChild | (() => ComponentChild);
  children: ComponentChild | ((value: NonNullable<T>) => ComponentChild);
}
```

## Props

### `when`

The condition to evaluate. Can be:
- A direct value
- An accessor function (signal)
- `undefined`, `null`, or `false` (all treated as falsy)

**Type**: `T | Accessor<T> | undefined | null | false`

### `fallback` (optional)

Content to render when the condition is falsy.

**Type**: `ComponentChild | (() => ComponentChild)`

**Default**: `nothing` (renders nothing)

### `children`

Content to render when the condition is truthy. Can be:
- Static content
- A function that receives the truthy value

**Type**: `ComponentChild | ((value: NonNullable<T>) => ComponentChild)`

## Basic Usage

### Simple Boolean Condition

```typescript
import { html, createSignal, Show } from '@fluixi/kettlejs';

const MyComponent = () => {
  const [isVisible, setIsVisible] = createSignal(false);

  return html`
    <div>
      ${Show({
        when: isVisible,
        children: html`<p>This is visible!</p>`
      })}
      
      <button @click=${() => setIsVisible(!isVisible())}>
        Toggle
      </button>
    </div>
  `;
};
```

### With Fallback

```typescript
const LoadingExample = () => {
  const [isLoading, setIsLoading] = createSignal(true);

  return html`
    ${Show({
      when: () => !isLoading(),
      fallback: html`<p>Loading...</p>`,
      children: html`<p>Content loaded!</p>`
    })}
  `;
};
```

## Advanced Usage

### Type-Safe Value Access

When the condition resolves to a non-null value, you can access it in the children function:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile = () => {
  const [user, setUser] = createSignal<User | null>(null);

  return html`
    ${Show({
      when: user,
      fallback: html`<p>No user found</p>`,
      children: (u) => html`
        <div class="user-profile">
          <h2>${u.name}</h2>
          <p>${u.email}</p>
        </div>
      `
    })}
  `;
};
```

### Nested Show Components

```typescript
const StatusDisplay = () => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);
  const [data, setData] = createSignal<Data | null>(null);

  return html`
    ${Show({
      when: loading,
      fallback: Show({
        when: error,
        fallback: Show({
          when: data,
          fallback: html`<p>No data</p>`,
          children: (d) => html`<div>${d.title}</div>`
        }),
        children: (err) => html`<div class="error">${err.message}</div>`
      }),
      children: html`<div class="spinner">Loading...</div>`
    })}
  `;
};
```

### With Computed Conditions

```typescript
const PermissionCheck = () => {
  const [user, setUser] = createSignal<User | null>(null);
  
  const canEdit = createMemo(() => {
    const u = user();
    return u && u.role === 'admin';
  });

  return html`
    ${Show({
      when: canEdit,
      fallback: html`<p>You don't have permission to edit</p>`,
      children: html`<button>Edit</button>`
    })}
  `;
};
```

## Patterns

### Loading States

```typescript
const AsyncComponent = () => {
  const [status, setStatus] = createSignal<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [data, setData] = createSignal(null);

  const loadData = async () => {
    setStatus('loading');
    try {
      const result = await fetchData();
      setData(result);
      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  };

  return html`
    ${Show({
      when: () => status() === 'loading',
      fallback: Show({
        when: () => status() === 'success',
        fallback: html`<p>Error loading data</p>`,
        children: html`<div>${data()}</div>`
      }),
      children: html`<div>Loading...</div>`
    })}
  `;
};
```

### Authentication Guard

```typescript
const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);

  return html`
    ${Show({
      when: isAuthenticated,
      fallback: html`
        <div class="login-required">
          <p>Please log in to continue</p>
          <button @click=${() => setIsAuthenticated(true)}>Login</button>
        </div>
      `,
      children: html`
        <div class="protected-content">
          <h1>Welcome to the Dashboard</h1>
        </div>
      `
    })}
  `;
};
```

### Empty State

```typescript
const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([]);

  return html`
    ${Show({
      when: () => todos().length > 0,
      fallback: html`
        <div class="empty-state">
          <p>No todos yet. Create one to get started!</p>
        </div>
      `,
      children: html`
        <ul>
          ${For({
            each: todos,
            children: (todo) => html`<li>${todo.text}</li>`
          })}
        </ul>
      `
    })}
  `;
};
```

## Performance Considerations

### Lazy Evaluation

The `Show` component only evaluates the active branch:

```typescript
// The expensiveComputation only runs when visible is true
${Show({
  when: visible,
  children: () => {
    const result = expensiveComputation();
    return html`<div>${result}</div>`;
  }
})}
```

### Reactive Updates

`Show` automatically tracks signal dependencies and updates efficiently:

```typescript
const [user, setUser] = createSignal<User | null>(null);

// Only re-renders when user signal changes
${Show({
  when: user,
  children: (u) => html`<div>${u.name}</div>`
})}
```

## Comparison with Alternatives

### Show vs JavaScript Ternary

```typescript
// ❌ Less optimal - both branches evaluated
html`${condition ? html`<div>True</div>` : html`<div>False</div>`}`

// ✅ Better - Show component provides:
// - Lazy evaluation
// - Type-safe value access
// - Cleaner syntax for complex conditions
${Show({
  when: condition,
  fallback: html`<div>False</div>`,
  children: html`<div>True</div>`
})}
```

### Show vs Manual Conditional

```typescript
// ❌ Verbose and harder to read
const renderContent = () => {
  if (loading()) return html`<div>Loading</div>`;
  if (error()) return html`<div>Error</div>`;
  if (data()) return html`<div>${data()}</div>`;
  return html`<div>No data</div>`;
};

// ✅ Cleaner with Show
${Show({
  when: loading,
  fallback: Show({
    when: error,
    fallback: Show({
      when: data,
      fallback: html`<div>No data</div>`,
      children: (d) => html`<div>${d}</div>`
    }),
    children: (e) => html`<div>Error: ${e}</div>`
  }),
  children: html`<div>Loading</div>`
})}
```

## TypeScript Tips

### Type Narrowing

The children function receives the narrowed type:

```typescript
const [value, setValue] = createSignal<string | null>(null);

${Show({
  when: value,
  children: (v) => {
    // v is typed as string (not string | null)
    return html`<div>${v.toUpperCase()}</div>`;
  }
})}
```

### Generic Props

Create reusable Show wrappers with proper types:

```typescript
interface AsyncData<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}

function AsyncShow<T>(props: {
  async: AsyncData<T>;
  children: (data: T) => TemplateResult;
}) {
  return Show({
    when: () => !props.async.loading && !props.async.error,
    fallback: Show({
      when: () => props.async.loading,
      fallback: Show({
        when: () => props.async.error,
        children: (err) => html`<div>Error: ${err.message}</div>`
      }),
      children: html`<div>Loading...</div>`
    }),
    children: () => props.children(props.async.data!)
  });
}
```

## Common Pitfalls

### Forgetting to Call Signal

```typescript
// ❌ Wrong - passes the function, not the value
${Show({
  when: isVisible,  // Should be isVisible()
  children: html`<div>Content</div>`
})}

// ✅ Correct
${Show({
  when: isVisible,  // Accessor function (OK)
  children: html`<div>Content</div>`
})}

// ✅ Also correct
${Show({
  when: () => isVisible(),  // Call inside function
  children: html`<div>Content</div>`
})}
```

### Not Handling Null/Undefined

```typescript
// ❌ Potential runtime error
${Show({
  when: user,
  children: html`<div>${user().name}</div>`  // user might be null
})}

// ✅ Use the value parameter
${Show({
  when: user,
  children: (u) => html`<div>${u.name}</div>`  // u is guaranteed non-null
})}
```

## See Also

- [For Component](./for.md) - List rendering
- [Switch Component](./switch.md) - Multiple conditions
- [Index Component](./index.md) - Non-keyed lists
- [Control Flow Guide](../guides/control-flow.md) - Comprehensive guide