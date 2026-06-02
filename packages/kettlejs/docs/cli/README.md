# KettleJS CLI Documentation

The KettleJS CLI provides powerful scaffolding tools to create projects and components with support for multiple rendering modes including lit-html, native JSX, and React Bridge.

## Installation

```bash
npm install -g @fluixi/kettlejs
```

Or use with npx:

```bash
npx @fluixi/kettlejs <command>
```

## Commands

### `new [project-name]`

Create a new KettleJS project with interactive prompts.

```bash
kettlejs new my-app
```

**Interactive Prompts:**
- **Project name**: Name of your project (lowercase with hyphens)
- **Project template**: Choose from minimal, standard, or full
- **Default component mode**: Choose default rendering mode (lit-html, jsx, or react-bridge)
- **Advanced configuration**: Optional deep configuration for:
  - Router setup
  - Server-Side Rendering (SSR)
  - State management utilities
  - Testing framework (Vitest)
  - ESLint & Prettier
  - CSS preprocessor (SCSS, Less, PostCSS)
  - Example components & pages
  - Project metadata (author, description, license)

**Example:**
```bash
kettlejs new my-kettle-app
# Follow the prompts to configure your project
# Choose "Yes" for advanced configuration to customize everything
```

### `generate <type> [name]`

Generate components with various patterns and modes.

**Aliases:** `generate`, `g`

```bash
kettlejs generate component MyComponent
kettlejs g c MyComponent
```

**Options:**
- `-t, --type <type>`: Component type (basic, with-state, with-resource, with-router, full)
- `-p, --path <path>`: Component path relative to src/
- `-m, --mode <mode>`: Component mode (lit-html, jsx, react-bridge)

**Interactive Mode:**

Run without arguments for interactive prompts:

```bash
kettlejs generate component
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
kettlejs info
```

## Component Modes

### 1. Lit-HTML Mode (Default)

Native KettleJS with lit-html templates.

**Generate:**
```bash
kettlejs g c Counter --mode lit-html --type with-state
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
- Full KettleJS features

### 2. JSX Mode

Native JSX runtime for KettleJS (no React dependency).

**Generate:**
```bash
kettlejs g c Counter --mode jsx --type with-state
```

**Output:**
```tsx
/** @jsx h */
import { h, Fragment } from '@fluixi/kettlejs/jsx-runtime';
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
- KettleJS reactive signals
- Compiles to lit-html templates
- Type-safe with TypeScript

**Configuration:**

Your `tsconfig.json` will be configured automatically:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
  }
}
```

### 3. React Bridge Mode

React-compatible components with KettleJS signals.

**Generate:**
```bash
kettlejs g c Counter --mode react-bridge --type with-state
```

**Output:**
```tsx
import React from 'react';
import { useSignal, useKettleEffect } from '@fluixi/kettlejs/react-bridge';
import './counter.css';

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useSignal(initialCount);

  useKettleEffect(() => {
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
- KettleJS reactive signals
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
kettlejs g c MyComponent -t basic
```

### With State

Component with reactive state using signals.

```bash
kettlejs g c Counter -t with-state
```

### With Resource

Component with async data fetching.

```bash
kettlejs g c UserList -t with-resource
```

### With Router

Component with router integration.

```bash
kettlejs g c HomePage -t with-router
```

### Full

Component with all features (state, resources, router).

```bash
kettlejs g c Dashboard -t full
```

## Component Patterns (Lit-HTML Mode Only)

### KettleElement (Recommended)

Extends the KettleElement base class with built-in reactive signals.

```bash
kettlejs g c MyComponent --pattern kettlelement
```

### LitElement

Plain LitElement class component using standard Lit decorators and @state.

```bash
kettlejs g c MyComponent --pattern litelement
```

**Example output:**
```typescript
import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('my-component')
export class MyComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
  `;

  @state()
  private count = 0;

  render() {
    return html`
      <div>
        <button @click=${() => this.count++}>
          Count: ${this.count}
        </button>
      </div>
    `;
  }
}
```

### WithSignals

Mixin that adds KettleJS signals to LitElement.

```bash
kettlejs g c MyComponent --pattern withsignals
```

### Controller

Manual approach using SignalController.

```bash
kettlejs g c MyComponent --pattern controller
```

### Functional

Function-based component for functional programming style.

```bash
kettlejs g c MyComponent --pattern functional
```

## Project Templates

### Minimal

Basic setup with essential configuration.

- Package.json with scripts
- TypeScript configuration
- Vite setup
- Basic App component
- Clean project structure

### Standard

Includes routing and examples.

- Everything from Minimal
- Router configuration
- Example pages
- Navigation setup
- Example components (optional)

### Full

Complete setup with all features.

- Everything from Standard
- Resource examples
- Context providers
- State management utilities
- Complete folder structure
- Multiple example components
- Example pages with routing

## Advanced Configuration

When creating a new project, you can opt for advanced configuration to customize every aspect:

### Available Options

**Router Setup**
- Automatically configure KettleJS router
- Generate example routes
- Navigation component

**Server-Side Rendering**
- Include @lit-labs/ssr dependencies
- SSR utilities and examples
- Hydration setup

**State Management**
- Context providers
- Global stores
- State utilities

**Code Quality**
- ESLint configuration
- Prettier formatting
- TypeScript strict mode

**CSS Preprocessors**
- SCSS/SASS support
- Less support
- PostCSS with Autoprefixer
- Plain CSS (default)

**Example Components**
- Counter (state management)
- TodoList (CRUD operations)
- UserCard (props & styling)
- DataFetcher (async resources)

**Example Pages**
- Home page
- About page
- Dashboard
- 404 Not Found page

**Project Metadata**
- Author information
- Description
- License type
- Custom package.json fields

## Examples

### Create a New JSX Project

```bash
kettlejs new my-jsx-app
# Select: jsx as default mode
# Select: standard template
```

### Create a React Bridge Project

```bash
kettlejs new my-react-app
# Select: react-bridge as default mode
# Select: full template
```

### Create Project with Advanced Configuration

```bash
kettlejs new my-advanced-app
# Select your preferred mode
# Choose "Yes" for advanced configuration
# Customize:
#   - Enable SSR support
#   - Include ESLint & Prettier
#   - Choose SCSS as CSS preprocessor
#   - Generate Counter and TodoList components
#   - Generate Home and About pages
#   - Set author and description
```

### Generate a Lit-HTML Component

```bash
kettlejs g c UserCard -t with-state -p components/UserCard/UserCard.ts
```

### Generate a JSX Component

```bash
kettlejs g c UserCard -t with-state -m jsx -p components/UserCard/UserCard.tsx
```

### Generate a React Bridge Component

```bash
kettlejs g c UserCard -t with-resource -m react-bridge -p components/UserCard/UserCard.tsx
```

### Interactive Component Generation

```bash
kettlejs generate component
# Follow the interactive prompts
```

## File Structure

### Generated Project Structure

**Basic Structure:**
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

**With Advanced Configuration:**
```
my-app/
├── src/
│   ├── components/
│   │   ├── counter/
│   │   │   ├── Counter.tsx
│   │   │   ├── Counter.css
│   │   │   └── Counter.spec.ts
│   │   ├── todolist/
│   │   ├── usercard/
│   │   └── datafetcher/
│   ├── pages/
│   │   ├── home/
│   │   │   ├── Home.tsx
│   │   │   └── Home.css
│   │   ├── about/
│   │   ├── dashboard/
│   │   └── notfound/
│   ├── styles/
│   │   └── main.css
│   ├── utils/
│   ├── App.tsx
│   └── main.ts
├── public/
├── .eslintrc.json (if enabled)
├── .prettierrc.json (if enabled)
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
- You prefer native KettleJS experience
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

## Component Patterns Comparison

| Pattern | Syntax | State Management | Best For |
|---------|--------|------------------|----------|
| **KettleElement** | Class + decorators | KettleJS signals | New KettleJS projects |
| **LitElement** | Class + decorators | Lit @state | Lit ecosystem compatibility |
| **WithSignals** | Class + mixin | KettleJS signals | Existing Lit projects |
| **Controller** | Class + controller | Manual signals | Advanced customization |
| **Functional** | Function | KettleJS signals | Functional programming |

### When to Use Each Pattern

**KettleElement (Recommended)**
- Starting new KettleJS projects
- Want built-in reactive signals
- Need best KettleJS integration

**LitElement**
- Migrating from Lit
- Using Lit ecosystem libraries
- Prefer standard Lit patterns
- Don't need KettleJS-specific features

**WithSignals**
- Have existing LitElement components
- Want to add signals gradually
- Need both Lit and KettleJS features

**Controller**
- Need fine-grained control
- Complex lifecycle management
- Advanced signal patterns

**Functional**
- Prefer functional programming
- Simple, stateless components
- Composable component patterns
```

## Configuration Files

### ESLint Configuration

When enabled, generates `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  }
}
```

### Prettier Configuration

When enabled, generates `.prettierrc.json`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### PostCSS Configuration

When PostCSS is selected, automatically configured in `vite.config.ts`:

```typescript
export default defineConfig({
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
});
```

## Troubleshooting

### JSX Not Working

Ensure your `tsconfig.json` is correctly configured:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
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
    jsxInject: `import { h, Fragment } from '@fluixi/kettlejs/jsx-runtime'`,
  },
});
```

## Migration

### From Lit-HTML to JSX

```bash
# Generate new JSX version
kettlejs g c MyComponent -m jsx

# Convert template literals to JSX
# html`<div>${value}</div>` → <div>{value}</div>
```

### From React to React Bridge

```bash
# Generate React Bridge component
kettlejs g c MyComponent -m react-bridge

# Replace hooks:
# useState → useSignal
# useEffect → useKettleEffect
# useMemo → useKettleMemo
```

## Advanced Usage

### Custom Templates

You can extend the CLI by creating custom templates in your project:

```
.kettlejs/
└── templates/
    ├── component.template.ts
    └── page.template.ts
```

### Environment-Specific Generation

Use different modes for different environments:

```bash
# Development with React DevTools
kettlejs g c MyComponent -m react-bridge

# Production with smaller bundle
kettlejs g c MyComponent -m jsx
```

## Best Practices for Project Setup

### Start Simple, Scale Up
1. Begin with minimal template for learning
2. Use standard template for production apps
3. Use full template for complex applications

### Configuration Strategy
- Enable ESLint & Prettier early
- Add SSR only when needed (impacts bundle size)
- Use CSS preprocessors if team prefers them
- Generate example components for learning

### Component Organization
- Keep related files together (component + styles + tests)
- Use pages/ for route components
- Use components/ for reusable UI elements
- Create feature folders as needed

### Choosing Component Pattern
- **New to KettleJS?** Start with `kettlelement` pattern
- **Coming from Lit?** Use `litelement` pattern for familiarity
- **Need signals in Lit?** Use `withsignals` mixin
- **Functional style?** Use `functional` pattern

### Example Component Selection
- **Counter**: Learn state management basics
- **TodoList**: Understand CRUD operations
- **UserCard**: Practice props and styling
- **DataFetcher**: Master async data loading

## Related Documentation

- [Core Concepts](../docs/framework/core-concepts.md)
- [JSX Runtime Guide](../docs/framework/jsx-tsx-guide.md)
- [React Bridge Guide](../docs/framework/react-bridge-guide.md)
- [Migration Guide](../docs/framework/migration-guide.md)
- [SSR Guide](../docs/framework/ssr-guide.md)

## Support

- GitHub Issues: [github.com/your-org/kettlejs/issues](https://github.com/your-org/kettlejs/issues)
- Documentation: [kettlejs.dev](https://kettlejs.dev)
- Discord: [discord.gg/kettlejs](https://discord.gg/kettlejs)