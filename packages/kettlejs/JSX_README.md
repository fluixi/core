# JSX/TSX Support in KettleJS

KettleJS now supports JSX/TSX syntax, allowing you to use React-like component syntax while benefiting from KettleJS's fine-grained reactivity!

## Quick Start

### 1. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs",
    "target": "ES2020",
    "module": "ESNext"
  }
}
```

### 2. Write JSX Components

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

export default Counter;
```

### 3. Build Configuration

#### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxImportSource: '@fluixi/kettlejs'
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

## Features

### ✅ Full JSX Support
- All HTML and SVG elements
- Event handlers (onClick, onInput, etc.)
- Props and children
- Fragments (`<>...</>`)
- Refs
- TypeScript types

### 🎨 Styling
```tsx
// Inline styles
<div style={{ color: 'red', padding: '20px' }}>Styled</div>

// Class names
<div className="my-class">Content</div>

// Dynamic classes
<div className={isActive() ? 'active' : 'inactive'}>Toggle</div>
```

### 📦 Components
```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button = (props: ButtonProps) => {
  return (
    <button onClick={props.onClick}>
      {props.label}
    </button>
  );
};
```

### 🔄 Control Flow
```tsx
import { Show, For } from '@fluixi/kettlejs';

// Conditional rendering
<Show when={user()} fallback={<div>Loading...</div>}>
  {(u) => <div>Hello, {u.name}!</div>}
</Show>

// List rendering
<For each={items()}>
  {(item) => <li>{item.name}</li>}
</For>
```

## JSX vs lit-html

You can use both syntaxes in the same project!

### lit-html
```typescript
import { html } from 'lit';

const MyComponent = () => {
  return html`
    <div>
      <p>Count: ${count()}</p>
      <button @click=${() => setCount(count() + 1)}>+</button>
    </div>
  `;
};
```

### JSX
```tsx
const MyComponent = () => {
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
};
```

## Event Handling

```tsx
// Click events
<button onClick={(e) => console.log('Clicked!', e)}>Click</button>

// Input events
<input 
  value={value()}
  onInput={(e) => setValue((e.target as HTMLInputElement).value)}
/>

// Form submission
<form onSubmit={(e) => {
  e.preventDefault();
  handleSubmit();
}}>
  <button type="submit">Submit</button>
</form>
```

## TypeScript Support

Full type safety with IntelliSense:

```tsx
import type { JSX } from '@fluixi/kettlejs/jsx-runtime';

interface UserCardProps {
  user: {
    id: number;
    name: string;
    email: string;
  };
  onEdit?: (user: User) => void;
}

const UserCard = (props: UserCardProps) => {
  return (
    <div className="user-card">
      <h3>{props.user.name}</h3>
      <p>{props.user.email}</p>
      {props.onEdit && (
        <button onClick={() => props.onEdit?.(props.user)}>
          Edit
        </button>
      )}
    </div>
  );
};
```

## Migration from React

KettleJS JSX is very similar to React, with a few key differences:

1. **Signals instead of useState**
   ```tsx
   // React
   const [count, setCount] = useState(0);
   
   // KettleJS
   const [count, setCount] = createSignal(0);
   ```

2. **Call signals to read**
   ```tsx
   // React
   <p>Count: {count}</p>
   
   // KettleJS
   <p>Count: {count()}</p>  // Note the ()
   ```

3. **No useEffect dependency arrays**
   ```tsx
   // React
   useEffect(() => {
     console.log(count);
   }, [count]);
   
   // KettleJS
   createEffect(() => {
     console.log(count());  // Auto-tracked!
   });
   ```

## Examples

Check out the complete examples:
- [Todo App with JSX](../../docs/docs/framework/guides/jsx-examples.md#complete-todo-app-with-jsx)
- [User Dashboard](../../docs/docs/framework/guides/jsx-examples.md#user-dashboard-with-jsx)
- [Form with Validation](../../docs/docs/framework/guides/jsx-examples.md#form-with-validation)
- [Data Table](../../docs/docs/framework/guides/jsx-examples.md#data-table-with-sorting-and-filtering)

## Documentation

- [JSX/TSX Guide](../../docs/docs/framework/guides/jsx-tsx-guide.md)
- [JSX Examples](../../docs/docs/framework/guides/jsx-examples.md)
- [Migration from React](../../docs/docs/framework/guides/migration.md#from-react)

## Performance

JSX in KettleJS has the same performance as lit-html:
- No virtual DOM
- Fine-grained reactivity
- Direct DOM updates
- Minimal overhead

The JSX syntax is just syntactic sugar that compiles to efficient lit-html templates!

## Community

- **GitHub**: [github.com/adafri/kettlejs](https://github.com/adafri/kettlejs)
- **Discord**: Join our community server
- **Twitter**: [@KettleJS](https://twitter.com/kettlejs)

---

Happy coding with JSX! 🫖✨
