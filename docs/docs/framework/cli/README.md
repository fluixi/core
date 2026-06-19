---
sidebar_position: 1
title: Cli Guide
---

# Fluixi CLI Documentation

The Fluixi CLI provides powerful scaffolding tools to create projects and components with support for multiple rendering modes including lit-html, native JSX, and React Bridge.

## Installation

```bash
npm install -g @fluixi/core
```

Or use with npx:

```bash
npx @fluixi/core <command>
```

## Commands

### `new [project-name]`

Create a new Fluixi project with interactive prompts.

```bash
fluixi new my-app
```

**Interactive Prompts:**
- **Project name**: Name of your project (lowercase with hyphens)
- **Project template**: Choose from minimal, standard, or full
- **Default component mode**: Choose default rendering mode (lit-html, jsx, or react-bridge)

**Example:**
```bash
fluixi new my-fluixi-app
# Follow the prompts to configure your project
```

### `generate <type> [name]`

Generate components with various patterns and modes.

**Aliases:** `generate`, `g`

```bash
fluixi generate component MyComponent
fluixi g c MyComponent
```

**Options:**
- `-t, --type <type>`: Component type (basic, with-state, with-resource, with-router, full)
- `-p, --path <path>`: Component path relative to src/
- `-m, --mode <mode>`: Component mode (lit-html, jsx, react-bridge)

**Interactive Mode:**

Run without arguments for interactive prompts:

```bash
fluixi generate component
```

You'll be prompted for:
1. **Component name**: PascalCase name (e.g., `MyComponent`)
2. **Component mode**: Rendering mode to use
3. **Component pattern**: Architecture pattern (for lit-html mode)
4. **Component features**: Type of component to generate
5. **Component path**: Where to save the component

### `info`

Display CLI information and help.

```bash
fluixi info
```

## Component Modes

### 1. Lit-HTML Mode (Default)

Native Fluixi with lit-html templates.

**Generate:**
```bash
fluixi g c Counter --mode lit-html --type with-state
```

**Output:**
```typescript
import { html } from 'lit';
import { createSignal } from '@fluixi/reactive/signal';
import './counter.css';

export const Counter = (props: { initialCount?: number }) => {
  const [count, setCount] = createSignal(props.initialCount || 0);

  return html`
    <div class="counter">
      <button @click=${() => setCount(count() - 1)}>-</button>
      <span>${count()}</span>
      <button @click=${() => setCount(count() + 1)}>+</button>
    </div>
  `;
};
```

**Features:**
- Native lit-html templates
- Reactive signals
- Small bundle size
- Full Fluixi features

### 2. JSX Mode

Native JSX runtime for Fluixi (no React dependency).

**Generate:**
```bash
fluixi g c Counter --mode jsx --type with-state
```

**Output:**
```tsx
/** @jsx h */
import { h, Fragment } from '@fluixi/core/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';
import './counter.css';

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = createSignal(initialCount);

  return (
    <div class="counter">
      <button onClick={() => setCount(count() - 1)}>-</button>
      <span>{count()}</span>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
}
```

**Features:**
- JSX syntax without React
- Fluixi reactive signals
- Compiles to lit-html templates
- Type-safe with TypeScript

**Configuration:**

Your `tsconfig.json` will be configured automatically:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/core/jsx-runtime"
  }
}
```

### 3. React Bridge Mode

React-compatible components with Fluixi signals.

**Generate:**
```bash
fluixi g c Counter --mode react-bridge --type with-state
```

**Output:**
```tsx
import React from 'react';
import { useSignal, useFluixiEffect } from '@fluixi/core/react-bridge';
import './counter.css';

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useSignal(initialCount);

  useFluixiEffect(() => {
    console.log('Count changed:', count());
  });

  return (
    <div className="counter">
      <button onClick={() => setCount(count() - 1)}>-</button>
      <span>{count()}</span>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
}
```

**Features:**
- Full React compatibility
- Use React ecosystem libraries
- Fluixi reactive signals
- Works with React DevTools

**Dependencies:**

React dependencies will be added automatically:
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

## Component Types

### Basic

Simple component with no state management.

```bash
fluixi g c MyComponent -t basic
```

### With State

Component with reactive state using signals.

```bash
fluixi g c Counter -t with-state
```

### With Resource

Component with async data fetching.

```bash
fluixi g c UserList -t with-resource
```

### With Router

Component with router integration.

```bash
fluixi g c HomePage -t with-router
```

### Full

Component with all features (state, resources, router).

```bash
fluixi g c Dashboard -t full
```

## Component Patterns (Lit-HTML Mode Only)

### FluixiElement (Recommended)

Extends the FluixiElement base class.

```bash
fluixi g c MyComponent --pattern fluixilement
```

### WithSignals

Mixin that adds signals to LitElement.

```bash
fluixi g c MyComponent --pattern withsignals
```

### Controller

Manual approach using SignalController.

```bash
fluixi g c MyComponent --pattern controller
```

### Functional

Function-based component (legacy).

```bash
fluixi g c MyComponent --pattern functional
```

## Project Templates

### Minimal

Basic setup with essential configuration.

- Package.json with scripts
- TypeScript configuration
- Vite setup
- Basic App component

### Standard

Includes routing and examples.

- Everything from Minimal
- Router configuration
- Example pages
- Navigation setup

### Full

Complete setup with all features.

- Everything from Standard
- Resource examples
- Context providers
- Complete folder structure

## Examples

### Create a New JSX Project

```bash
fluixi new my-jsx-app
# Select: jsx as default mode
# Select: standard template
```

### Create a React Bridge Project

```bash
fluixi new my-react-app
# Select: react-bridge as default mode
# Select: full template
```

### Generate a Lit-HTML Component

```bash
fluixi g c UserCard -t with-state -p components/UserCard/UserCard.ts
```

### Generate a JSX Component

```bash
fluixi g c UserCard -t with-state -m jsx -p components/UserCard/UserCard.tsx
```

### Generate a React Bridge Component

```bash
fluixi g c UserCard -t with-resource -m react-bridge -p components/UserCard/UserCard.tsx
```

### Interactive Component Generation

```bash
fluixi generate component
# Follow the interactive prompts
```

## File Structure

### Generated Project Structure

```
my-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   │   └── main.css
│   ├── App.ts (or App.tsx)
│   └── main.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Generated Component Files

For each component, the CLI generates:

1. **Component file** (`MyComponent.ts` or `MyComponent.tsx`)
2. **Test file** (`MyComponent.spec.ts`)
3. **Style file** (`MyComponent.css`)

## Tips and Best Practices

### Choosing a Mode

**Use Lit-HTML when:**
- You want the smallest bundle size
- You prefer native Fluixi experience
- You don't need React ecosystem libraries

**Use JSX when:**
- You prefer JSX syntax
- You want type-safe JSX
- You want to avoid React dependency
- You're familiar with React/JSX patterns

**Use React Bridge when:**
- You need React ecosystem compatibility
- You want to use React libraries (React Query, Redux, etc.)
- You're migrating from React
- You need React DevTools integration

### Component Naming

- Use PascalCase for component names
- Be descriptive and specific
- Avoid generic names like `Component` or `Widget`

### Path Organization

Recommended structure:
```
src/
├── components/
│   ├── common/        # Shared components
│   ├── layout/        # Layout components
│   └── features/      # Feature-specific components
├── pages/             # Page/route components
├── hooks/             # Custom hooks (React bridge)
└── utils/             # Utility functions
```

## Troubleshooting

### JSX Not Working

Ensure your `tsconfig.json` is correctly configured:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/core/jsx-runtime"
  }
}
```

### React Bridge Import Errors

Install React dependencies:

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

### Module Resolution Issues

Check your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from '@fluixi/core/jsx-runtime'`,
  },
});
```

## Migration

### From Lit-HTML to JSX

```bash
# Generate new JSX version
fluixi g c MyComponent -m jsx

# Convert template literals to JSX
# html`<div>${value}</div>` → <div>{value}</div>
```

### From React to React Bridge

```bash
# Generate React Bridge component
fluixi g c MyComponent -m react-bridge

# Replace hooks:
# useState → useSignal
# useEffect → useFluixiEffect
# useMemo → useFluixiMemo
```

## Advanced Usage

### Custom Templates

You can extend the CLI by creating custom templates in your project:

```
.fluixi/
└── templates/
    ├── component.template.ts
    └── page.template.ts
```

### Environment-Specific Generation

Use different modes for different environments:

```bash
# Development with React DevTools
fluixi g c MyComponent -m react-bridge

# Production with smaller bundle
fluixi g c MyComponent -m jsx
```

## Related Documentation

- [Core Concepts](../docs/framework/core-concepts.md)
- [JSX Runtime Guide](../docs/framework/jsx-tsx-guide.md)
- [React Bridge Guide](../docs/framework/react-bridge-guide.md)
- [Migration Guide](../docs/framework/migration-guide.md)

## Support

- GitHub Issues: [github.com/your-org/fluixi/issues](https://github.com/your-org/fluixi/issues)
- Documentation: [fluixi.dev](https://fluixi.dev)
- Discord: [discord.gg/fluixi](https://discord.gg/fluixi)
