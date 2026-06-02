# KettleJS CLI Quick Reference

## Installation

```bash
npm install -g @fluixi/kettlejs
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `kettlejs new [name]` | - | Create new project |
| `kettlejs generate <type> [name]` | `g` | Generate component |
| `kettlejs info` | - | Show CLI info |
| `kettlejs --help` | `-h` | Show help |
| `kettlejs --version` | `-v` | Show version |

## Generate Component

### Basic Syntax

```bash
kettlejs generate component <name> [options]
kettlejs g c <name> [options]
```

### Options

| Option | Alias | Values | Default |
|--------|-------|--------|---------|
| `--type` | `-t` | `basic`, `with-state`, `with-resource`, `with-router`, `full` | `basic` |
| `--mode` | `-m` | `lit-html`, `jsx`, `react-bridge` | `lit-html` |
| `--path` | `-p` | File path | `components/<Name>/<Name>.ts` |
| `--pattern` | - | `kettlelement`, `withsignals`, `controller`, `functional` | `functional` |

## Component Modes

### Lit-HTML (Default)

```bash
kettlejs g c Counter --mode lit-html
```

**Output:** `Counter.ts`
```typescript
import { html } from 'lit';
import { createSignal } from '@fluixi/reactive/signal';

export const Counter = () => {
  const [count, setCount] = createSignal(0);
  return html`<div>${count()}</div>`;
};
```

### JSX

```bash
kettlejs g c Counter --mode jsx
```

**Output:** `Counter.tsx`
```tsx
/** @jsx h */
import { h } from '@fluixi/kettlejs/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';

export function Counter() {
  const [count, setCount] = createSignal(0);
  return <div>{count()}</div>;
}
```

### React Bridge

```bash
kettlejs g c Counter --mode react-bridge
```

**Output:** `Counter.tsx`
```tsx
import React from 'react';
import { useSignal } from '@fluixi/kettlejs/react-bridge';

export function Counter() {
  const [count, setCount] = useSignal(0);
  return <div>{count()}</div>;
}
```

## Component Types

| Type | Description | Example |
|------|-------------|---------|
| `basic` | Simple component | `kettlejs g c Card -t basic` |
| `with-state` | With reactive state | `kettlejs g c Counter -t with-state` |
| `with-resource` | With async data | `kettlejs g c UserList -t with-resource` |
| `with-router` | With routing | `kettlejs g c HomePage -t with-router` |
| `full` | All features | `kettlejs g c Dashboard -t full` |

## Quick Examples

### Create JSX Project

```bash
kettlejs new my-jsx-app
# Select: jsx mode
```

### Create React Bridge Project

```bash
kettlejs new my-react-app
# Select: react-bridge mode
```

### Generate Basic Component

```bash
kettlejs g c MyComponent
```

### Generate Component with State (JSX)

```bash
kettlejs g c Counter -t with-state -m jsx
```

### Generate Component with Resource (React Bridge)

```bash
kettlejs g c UserList -t with-resource -m react-bridge
```

### Generate Full-Featured Component

```bash
kettlejs g c Dashboard -t full -p pages/Dashboard/Dashboard.tsx -m jsx
```

### Interactive Mode

```bash
kettlejs g c
# Follow prompts
```

## Generated Files

For each component, generates:
- `Component.ts` or `Component.tsx` - Main component file
- `Component.spec.ts` - Test file
- `Component.css` - Styles

## Mode Comparison

| Feature | Lit-HTML | JSX | React Bridge |
|---------|----------|-----|--------------|
| Bundle Size | Smallest | Small | Medium |
| Syntax | Template literals | JSX | JSX + React |
| React Compat | No | No | Yes |
| Learning Curve | Low | Low | Medium |
| Type Safety | Good | Excellent | Excellent |
| DevTools | Lit | Lit | React |

## Project Templates

| Template | Features |
|----------|----------|
| `minimal` | Basic setup, minimal dependencies |
| `standard` | Router, examples, organized structure |
| `full` | All features, complete setup |

## TypeScript Config (Auto-generated)

### Lit-HTML

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

### JSX

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
  }
}
```

### React Bridge

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

## Common Workflows

### Start New Project

```bash
kettlejs new my-app
cd my-app
npm install
npm run dev
```

### Add Component

```bash
kettlejs g c MyComponent -t with-state
```

### Add Page Component

```bash
kettlejs g c HomePage -t with-router -p pages/Home/HomePage.tsx
```

### Add Feature Module

```bash
kettlejs g c UserProfile -t full -p features/user/UserProfile.tsx
```

## Troubleshooting

### JSX Not Working

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
  }
}
```

### React Not Found

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

### Component Not Rendering

Check that you're using the correct render function:

**Lit-HTML:**
```typescript
import { render } from '@fluixi/kettlejs';
render(MyComponent, document.getElementById('app'));
```

**JSX:**
```typescript
import { render } from '@fluixi/kettlejs';
render(MyComponent, document.getElementById('app'));
```

**React Bridge:**
```typescript
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('app')).render(<MyComponent />);
```

## Tips

1. **Start with Lit-HTML** - Best performance and smallest bundle
2. **Use JSX** - If you prefer JSX syntax but don't need React
3. **Use React Bridge** - Only when you need React ecosystem libraries
4. **Component Naming** - Always use PascalCase
5. **File Organization** - Keep related files together
6. **Interactive Mode** - Use for exploring options
7. **Type Safety** - Always use TypeScript for better DX

## Next Steps

- [Full CLI Documentation](./README.md)
- [JSX/TSX Guide](../docs/framework/jsx-tsx-guide.md)
- [React Bridge Guide](../docs/framework/react-bridge-guide.md)
- [Core Concepts](../docs/framework/core-concepts.md)

## Support

- Issues: [GitHub Issues](https://github.com/your-org/kettlejs/issues)
- Docs: [kettlejs.dev](https://kettlejs.dev)
- Discord: [Join Community](https://discord.gg/kettlejs)