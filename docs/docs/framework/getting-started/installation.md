---
sidebar_position: 2
title: Installation
---

# Installation

This guide will help you install KettleJS and set up your development environment.

## Prerequisites

Before installing KettleJS, ensure you have the following:

- **Node.js** version 16.x or higher
- **npm**, **yarn**, or **pnpm** package manager
- A modern code editor (VS Code recommended)

## Quick Install

### Using npm

```bash
npm install @fluixi/kettlejs @fluixi/reactive lit
```

### Using yarn

```bash
yarn add @fluixi/kettlejs @fluixi/reactive lit
```

### Using pnpm

```bash
pnpm add @fluixi/kettlejs @fluixi/reactive lit
```

## Create a New Project

The easiest way to get started is using the KettleJS CLI:

### Install CLI Globally

```bash
npm install -g @fluixi/kettlejs
```

### Create Project

```bash
# Interactive mode - will prompt for options
kettlejs new my-app

# Or with specific template
kettlejs new my-app --template full

# Navigate to project
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Templates

The CLI provides several project templates:

### `minimal`
- Basic KettleJS setup
- No router or additional features
- Perfect for learning or simple apps

### `standard` (default)
- Includes router
- Basic component structure
- Development server configured

### `full`
- Complete setup with all features
- Router with examples
- Resource management examples
- Context API examples
- SSR/Hydration scaffolding
- Testing setup

## Manual Setup

If you prefer to set up manually:

### 1. Create Project Directory

```bash
mkdir my-kettlejs-app
cd my-kettlejs-app
npm init -y
```

### 2. Install Dependencies

```bash
npm install @fluixi/kettlejs @fluixi/reactive lit
npm install -D typescript vite @types/node
```

### 3. Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: 'src/index.ts',
      formats: ['es']
    }
  },
  optimizeDeps: {
    include: ['lit', '@fluixi/reactive', '@fluixi/kettlejs']
  }
});
```

### 5. Create `package.json` Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 6. Create Project Structure

```bash
mkdir -p src/components
touch src/index.ts
touch src/App.ts
touch index.html
```

### 7. Create `index.html`

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
  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

### 8. Create `src/App.ts`

```typescript
import { html, createSignal, Component } from '@fluixi/kettlejs';

export const App: Component = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div>
      <h1>Welcome to KettleJS!</h1>
      <p>Count: ${count()}</p>
      <button @click=${() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  `;
};
```

### 9. Create `src/index.ts`

```typescript
import { render } from '@fluixi/kettlejs';
import { App } from './App';

const root = document.getElementById('app');
if (root) {
  render(App, root);
}
```

### 10. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

## IDE Setup

### Visual Studio Code

#### Recommended Extensions

1. **Lit Plugin** - Syntax highlighting and IntelliSense for lit-html
   ```
   ext install runem.lit-plugin
   ```

2. **TypeScript and JavaScript Language Features** (built-in)

3. **ESLint** - Code linting
   ```
   ext install dbaeumer.vscode-eslint
   ```

4. **Prettier** - Code formatting
   ```
   ext install esbenp.prettier-vscode
   ```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "lit-plugin.strict": true
}
```

### WebStorm / IntelliJ IDEA

1. Enable TypeScript support (built-in)
2. Install Lit plugin from marketplace
3. Configure TypeScript language version in settings

## Verify Installation

Create a simple test to verify everything is working:

```typescript
// test.ts
import { createSignal, createEffect } from '@fluixi/reactive';

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log('Count:', count());
});

setCount(1); // Should log: "Count: 1"
setCount(2); // Should log: "Count: 2"

console.log('✅ KettleJS is working!');
```

Run it:

```bash
npx tsx test.ts
# or
node --loader tsx test.ts
```

## TypeScript Configuration

For optimal TypeScript experience with KettleJS:

### Enable Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true
  }
}
```

### Import Helpers

```json
{
  "compilerOptions": {
    "importHelpers": true
  }
}
```

Add `tslib` dependency:

```bash
npm install tslib
```

### Path Aliases

For cleaner imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components')
    }
  }
});
```

## Next Steps

Now that you have KettleJS installed, you can:

- Follow the [Quick Start Guide](./quick-start.md) to build your first app
- Learn about [Core Concepts](../core-concepts/signals.md)
- Explore [Component Patterns](../components/functional-components.md)
- Check out [Examples](../guides/examples.md)

## Troubleshooting

### Module Not Found Errors

If you see module resolution errors:

1. Check that all dependencies are installed
2. Verify `tsconfig.json` module resolution settings
3. Try clearing node_modules and reinstalling:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### TypeScript Errors

If TypeScript isn't recognizing types:

1. Ensure `@types/node` is installed if using Node APIs
2. Check that your editor is using the workspace TypeScript version
3. Restart the TypeScript server in your editor

### Build Errors

If the build fails:

1. Check that your `tsconfig.json` target is ES2020 or higher
2. Verify all imports are correct
3. Ensure `experimentalDecorators` is enabled if using decorators

### Getting Help

- Check the [FAQ](../guides/faq.md)
- Search [GitHub Issues](https://github.com/adafri/kettlejs/issues)
- Ask on [Discord](https://discord.gg/kettlejs)
- Post on [Stack Overflow](https://stackoverflow.com/questions/tagged/kettlejs) with tag `kettlejs`
