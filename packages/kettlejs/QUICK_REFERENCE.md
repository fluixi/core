# KettleJS Quick Reference

## 📁 Project Structure

```
kettlejs/
├── src/lib/
│   ├── core/              # Core framework modules
│   │   ├── component.ts   # Component system & lifecycle
│   │   ├── element.ts     # KettleElement base class
│   │   ├── reactive.ts    # Reactive controllers for Lit
│   │   ├── hydration.ts   # Client-side hydration
│   │   ├── ssr.ts         # Server-side rendering
│   │   └── index.ts       # Core exports
│   │
│   ├── control-flow/      # Control flow components
│   │   ├── Show.ts        # Conditional rendering
│   │   ├── For.ts         # List rendering
│   │   ├── Dynamic.ts     # Dynamic components
│   │   ├── Portal.ts      # Portal rendering
│   │   └── index.ts
│   │
│   ├── router/            # Routing system
│   │   ├── router.ts      # Main router
│   │   └── index.ts
│   │
│   ├── resources/         # Resource management
│   │   ├── resource.ts    # Resource utilities
│   │   └── index.ts
│   │
│   ├── context/           # Context API
│   │   ├── context.ts     # Context management
│   │   └── index.ts
│   │
│   ├── dev-server/        # Development server
│   │   └── index.ts       # Vite-based dev server
│   │
│   ├── builder/           # Production builder
│   │   └── index.ts       # Build utilities
│   │
│   └── index.ts           # Main framework entry
│
├── cli/                   # CLI tools
│   └── index.ts           # Project & component generators
│
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Installation

```bash
npm install @fluixi/kettlejs @fluixi/reactive lit
```

### Basic Component

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@fluixi/kettlejs';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
class MyCounter extends KettleElement {
  private count = createSignal(0);

  view() {
    return html`
      <div>
        <p>Count: ${this.count[0]()}</p>
        <button @click=${() => this.count[1](c => c + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

## 📚 Core APIs

### Component System (`core/component.ts`)

```typescript
import {
  createComponent,
  render,
  onMount,
  onUnmount,
  mergeProps,
  splitProps,
} from '@fluixi/kettlejs/core';

// Create component with lifecycle
const MyComponent = createComponent((props) => {
  onMount(() => {
    console.log('Mounted!');
    return () => console.log('Unmounted!');
  });

  return html`<div>${props.message}</div>`;
});

// Render to DOM
const dispose = render(MyComponent, document.getElementById('app'));
```

### KettleElement (`core/element.ts`)

```typescript
import { KettleElement, getCurrentElement } from '@fluixi/kettlejs/core';

// Base class approach
class MyElement extends KettleElement {
  abstract view(): unknown;
  
  connectedCallback() {
    super.connectedCallback();
    this.runInScope(() => {
      // Run code in reactive scope
    });
  }
}
```

### Reactive Controllers (`core/reactive.ts`)

```typescript
import {
  SignalController,
  ReactiveController,
  WithSignals,
  useEffect,
} from '@fluixi/kettlejs/core';

// Pattern 1: SignalController (auto-update)
class MyElement extends LitElement {
  private signals = new SignalController(this);
  private count = createSignal(0);
  
  render() {
    return html`<p>${this.count[0]()}</p>`;
  }
}

// Pattern 2: WithSignals mixin
class MyElement extends WithSignals(LitElement) {
  private count = createSignal(0);
  
  render() {
    return html`<p>${this.count[0]()}</p>`;
  }
}

// Pattern 3: ReactiveController (explicit)
class MyElement extends LitElement {
  private reactive = new ReactiveController(this);
  
  connectedCallback() {
    super.connectedCallback();
    this.reactive.effect(() => {
      console.log('Effect running');
    });
  }
}
```

## 🎮 Control Flow

### Show - Conditional Rendering

```typescript
import { Show } from '@fluixi/kettlejs';

const MyComponent = () => {
  const [user, setUser] = createSignal(null);

  return html`
    ${Show({
      when: user,
      fallback: html`<p>Loading...</p>`,
      children: (u) => html`<p>Hello, ${u.name}!</p>`
    })}
  `;
};
```

### For - List Rendering

```typescript
import { For } from '@fluixi/kettlejs';

const MyList = () => {
  const [items, setItems] = createSignal([1, 2, 3]);

  return html`
    <ul>
      ${For({
        each: items,
        children: (item, index) => html`<li>Item ${item}</li>`
      })}
    </ul>
  `;
};
```

### Dynamic - Dynamic Components

```typescript
import { Dynamic } from '@fluixi/kettlejs';

const MyComponent = () => {
  const [component, setComponent] = createSignal(ComponentA);

  return html`
    ${Dynamic({
      component: component,
      props: { message: 'Hello' }
    })}
  `;
};
```

### Portal - Portal Rendering

```typescript
import { Portal } from '@fluixi/kettlejs';

const Modal = () => {
  return html`
    ${Portal({
      mount: document.body,
      children: html`
        <div class="modal">
          <h2>Modal Content</h2>
        </div>
      `
    })}
  `;
};
```

## 🗺️ Router

```typescript
import { createRouter, Router, Link } from '@fluixi/kettlejs';

// Create router
const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/user/:id', component: User },
  ]
});

// Use in component
class App extends KettleElement {
  view() {
    return html`
      <nav>
        ${Link({ href: '/', children: 'Home' })}
        ${Link({ href: '/about', children: 'About' })}
      </nav>
      ${Router({ router })}
    `;
  }
}

// Use hooks
const MyComponent = () => {
  const router = useRouter();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  return html`
    <p>Current: ${location().pathname}</p>
    <button @click=${() => navigate('/about')}>Go to About</button>
  `;
};
```

## 🔄 Resources

```typescript
import { createKettleResource, createLazyResource } from '@fluixi/kettlejs';

// Basic resource
const [user, { refetch, mutate }] = createKettleResource(async () => {
  const response = await fetch('/api/user');
  return response.json();
});

// Access resource
html`
  ${Show({
    when: () => !user.loading,
    children: html`<p>${user().name}</p>`
  })}
`;

// Lazy resource (load on demand)
const [data, load] = createLazyResource(async () => {
  return await fetchData();
});

// Load when needed
load();
```

## 💧 Hydration & SSR

### Client-side Hydration

```typescript
import { hydrateApp } from '@fluixi/kettlejs/core';

// Hydrate server-rendered app
const app = html`<my-app></my-app>`;
hydrateApp(app, document.getElementById('app'));
```

### Server-side Rendering

```typescript
import {
  renderToString,
  renderToPage,
  createHtmlDocument,
} from '@fluixi/kettlejs/core';

// Render to string
const html = await renderToString(app);

// Render complete page
const page = await renderToPage(app, {
  title: 'My App',
  stylesheets: ['/styles.css'],
  scripts: ['/app.js']
});

// Custom document
const doc = createHtmlDocument(content, {
  title: 'My App',
  lang: 'en'
});
```

### Hydration Data

```typescript
import {
  useHydrationData,
  createHydratableResource,
} from '@fluixi/kettlejs/core';

// Use hydration data
const data = useHydrationData('my-data', { initial: true });

// Create hydratable resource
const loadUser = createHydratableResource('user', async () => {
  return await fetchUser();
});
```

## 🛠️ Development Tools

### Dev Server

```typescript
import { createDevServer, startDevServer } from '@fluixi/kettlejs/dev-server';

// Simple start
await startDevServer(3000, true);

// Advanced config
const server = await createDevServer({
  port: 3000,
  host: 'localhost',
  open: true,
  https: false,
  base: '/',
  ssr: false,
  vite: {
    // Custom Vite config
  }
});

// Stop server
await stopDevServer(server);
```

### Builder

```typescript
import {
  build,
  buildClient,
  buildFullStack,
  analyzeBundle,
} from '@fluixi/kettlejs/builder';

// Build client
await buildClient({
  outDir: 'dist',
  minify: true,
  sourcemap: true
});

// Build with SSR
await buildFullStack({
  outDir: 'dist',
  ssrEntry: 'src/entry-server.ts',
  splitting: true
});

// Analyze
const stats = await analyzeBundle({ outDir: 'dist' });
console.log('Bundle size:', stats.totalSize);
```

### Watch Mode

```typescript
import { watch } from '@fluixi/kettlejs/builder';

// Watch and rebuild
await watch({
  outDir: 'dist'
});
```

## 🎨 Component Patterns

### Pattern 1: KettleElement (Recommended)

```typescript
@customElement('my-component')
class MyComponent extends KettleElement {
  private count = createSignal(0);

  view() {
    return html`<p>${this.count[0]()}</p>`;
  }
}
```

### Pattern 2: WithSignals Mixin

```typescript
@customElement('my-component')
class MyComponent extends WithSignals(LitElement) {
  private count = createSignal(0);

  render() {
    return html`<p>${this.count[0]()}</p>`;
  }
}
```

### Pattern 3: Manual Controller

```typescript
@customElement('my-component')
class MyComponent extends LitElement {
  private signals = new SignalController(this);
  private count = createSignal(0);

  render() {
    return html`<p>${this.count[0]()}</p>`;
  }
}
```

## 📦 Package Exports

```typescript
// Main entry
import * as KettleJS from '@fluixi/kettlejs';

// Core modules
import * as Core from '@fluixi/kettlejs/core';

// Control flow
import * as ControlFlow from '@fluixi/kettlejs/control-flow';

// Router
import * as Router from '@fluixi/kettlejs/router';

// Resources
import * as Resources from '@fluixi/kettlejs/resources';

// Context
import * as Context from '@fluixi/kettlejs/context';

// Dev tools
import * as DevServer from '@fluixi/kettlejs/dev-server';
import * as Builder from '@fluixi/kettlejs/builder';
```

## 🔧 Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "strict": true
  }
}
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "node -e \"import('@fluixi/kettlejs/dev-server').then(m => m.startDevServer(3000))\"",
    "build": "node -e \"import('@fluixi/kettlejs/builder').then(m => m.build({ outDir: 'dist' }))\"",
    "preview": "node -e \"import('@fluixi/kettlejs/dev-server').then(m => m.createPreviewServer())\""
  }
}
```

## 🎯 Best Practices

1. **Use KettleElement** for new components (simplest API)
2. **Prefer signals** from @fluixi/reactive for state management
3. **Use control flow components** instead of manual conditionals
4. **Leverage SSR** for better performance and SEO
5. **Use the dev server** for development (HMR, fast refresh)
6. **Build with code splitting** for production
7. **Test with preview server** before deployment

## 📖 Further Reading

- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration guide
- [COMPONENT_PATTERNS.md](./COMPONENT_PATTERNS.md) - Component patterns
- [FRAMEWORK_SUMMARY.md](./FRAMEWORK_SUMMARY.md) - Framework overview
- [RESTRUCTURE_SUMMARY.md](./RESTRUCTURE_SUMMARY.md) - Recent changes

## 🆘 Common Issues

### TypeScript Errors with .js Extensions
Change imports to omit `.js`:
```typescript
// Before
import { Component } from './component.js';

// After
import { Component } from './component';
```

### SSR Dependencies Missing
Install if using SSR:
```bash
npm install @lit-labs/ssr @lit-labs/ssr-client
```

### Signals Not Updating Component
Ensure you're using reactive controllers:
```typescript
// Add this to your component
private signals = new SignalController(this);
```

## 📝 License

MIT © Adafri Team