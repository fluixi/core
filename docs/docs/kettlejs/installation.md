---
sidebar_position: 2
---

# Installation

This guide will help you install and set up KettleJS in your project.

## Prerequisites

Before installing KettleJS, ensure you have:

- **Node.js** 16.0 or higher
- **npm** 7.0 or higher (or **yarn** 1.22+, **pnpm** 7.0+)
- A code editor (VS Code recommended)

## Quick Install

### Using the CLI (Recommended)

The fastest way to start with KettleJS is using the official CLI:

```bash
# Install CLI globally
npm install -g @awc/kettlejs

# Create new project
kettlejs new my-app

# Navigate to project
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The CLI will prompt you to configure:
- Project template (minimal, standard, full)
- Component mode (lit-html, jsx, react-bridge)
- Advanced settings (optional)

### Manual Installation

Add KettleJS to an existing project:

```bash
npm install @awc/kettlejs @awc/reactive lit
```

#### Additional Dependencies

For specific features, install optional packages:

**TypeScript:**
```bash
npm install -D typescript @types/node
```

**JSX Support:**
```bash
# JSX mode uses built-in runtime (no additional packages needed)
```

**React Bridge:**
```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

**SSR Support:**
```bash
npm install @lit-labs/ssr @lit-labs/ssr-client
```

**Build Tools:**
```bash
npm install -D vite
```

## Project Setup

### 1. Create Project Structure

```
my-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   │   └── main.css
│   ├── App.ts
│   └── main.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 2. Configure TypeScript

Create or update `tsconfig.json`:

#### For Lit-HTML Mode

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

#### For JSX Mode

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@awc/kettlejs/jsx-runtime",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

#### For React Bridge Mode

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### 3. Configure Vite

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'lit': ['lit'],
          'kettlejs': ['@awc/kettlejs'],
          'reactive': ['@awc/reactive']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['lit', '@awc/kettlejs', '@awc/reactive']
  }
});
```

### 4. Create Entry HTML

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KettleJS App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 5. Create Main Entry Point

#### Lit-HTML Mode

Create `src/main.ts`:

```typescript
import { render } from '@awc/kettlejs';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  render(App, root);
}
```

Create `src/App.ts`:

```typescript
import { html, Component } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive/signal';

export const App: Component = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div class="app">
      <h1>Welcome to KettleJS</h1>
      <button @click=${() => setCount(c => c + 1)}>
        Count: ${count()}
      </button>
    </div>
  `;
};
```

#### JSX Mode

Create `src/main.ts`:

```typescript
import { render } from '@awc/kettlejs';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  render(App, root);
}
```

Create `src/App.tsx`:

```tsx
/** @jsx h */
import { h } from '@awc/kettlejs/jsx-runtime';
import { createSignal } from '@awc/reactive/signal';

export function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="app">
      <h1>Welcome to KettleJS</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count()}
      </button>
    </div>
  );
}
```

#### React Bridge Mode

Create `src/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/main.css';

const root = document.getElementById('app');

if (root) {
  createRoot(root).render(<App />);
}
```

Create `src/App.tsx`:

```tsx
import React from 'react';
import { useSignal } from '@awc/kettlejs/react-bridge';

export function App() {
  const [count, setCount] = useSignal(0);

  return (
    <div className="app">
      <h1>Welcome to KettleJS</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count()}
      </button>
    </div>
  );
}
```

### 6. Add Basic Styles

Create `src/styles/main.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.app {
  text-align: center;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background 0.2s;
}

button:hover {
  background: #0056b3;
}
```

### 7. Update Package.json

Add scripts to `package.json`:

```json
{
  "name": "my-kettlejs-app",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@awc/kettlejs": "latest",
    "@awc/reactive": "latest",
    "lit": "^3.3.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

## Verify Installation

Run the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173` (or the URL shown in terminal).

You should see your KettleJS app running with a working counter button.

## IDE Setup

### VS Code

Install recommended extensions:

```bash
# Lit plugin for syntax highlighting
ext install runem.lit-plugin

# ESLint
ext install dbaeumer.vscode-eslint

# Prettier
ext install esbenp.prettier-vscode
```

Add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "lit-plugin.strict": true
}
```

### WebStorm/IntelliJ

Enable:
- TypeScript support
- Lit HTML/JS support
- ESLint integration

## Common Issues

### Module Not Found

If you get module resolution errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors with Decorators

Ensure `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

### JSX Not Working

Verify `tsconfig.json` has correct JSX configuration:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@awc/kettlejs/jsx-runtime"
  }
}
```

### Vite Not Starting

Check that:
1. Port 5173 is not in use
2. Node version is 16+
3. All dependencies are installed

## Next Steps

Now that KettleJS is installed:

- [Quick Start Guide](./quick-start.md) - Build your first component
- [Core Concepts](./core-concepts.md) - Learn about signals and reactivity
- [Tutorial](./tutorial/intro.md) - Build a complete app
- [API Reference](./api/core.md) - Explore the API

## Package Versions

Current stable versions:

- `@awc/kettlejs`: 0.0.4
- `@awc/reactive`: Latest
- `lit`: 3.3.1+

Check npm for latest versions:

```bash
npm info @awc/kettlejs version
```

---

**Next:** [Quick Start →](./quick-start.md)