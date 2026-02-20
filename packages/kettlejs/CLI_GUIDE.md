# KettleJS CLI Guide

Complete guide for using the KettleJS Command Line Interface to scaffold projects and components.

## Table of Contents

- [Installation](#installation)
- [Commands Overview](#commands-overview)
- [Component Generation](#component-generation)
  - [Component Patterns](#component-patterns)
  - [Component Features](#component-features)
  - [Interactive Mode](#interactive-mode)
  - [Command Line Mode](#command-line-mode)
- [Project Generation](#project-generation)
- [Examples](#examples)

---

## Installation

The KettleJS CLI is included with the `@awc/kettlejs` package:

```bash
npm install @awc/kettlejs
```

The CLI is available as the `kettlejs` command:

```bash
npx kettlejs --help
```

---

## Commands Overview

```bash
kettlejs <command> [options]

Commands:
  kettlejs create [name]      Create a new KettleJS project
  kettlejs generate [type]    Generate a component
  kettlejs g [type]           Alias for generate
  kettlejs dev                Start development server
  kettlejs build              Build for production
  kettlejs --version          Show version number
  kettlejs --help             Show help
```

---

## Component Generation

Generate components with the `generate` or `g` command:

```bash
kettlejs generate component
kettlejs g component
```

### Component Patterns

KettleJS supports four different component patterns. Choose the one that best fits your needs:

#### 1. KettleElement Pattern (⭐ Recommended)

**Best for:** New projects, maximum simplicity, automatic reactivity

Extends the `KettleElement` base class with a `view()` method pattern. Provides automatic signal tracking and the cleanest API.

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KettleElement } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive';

@customElement('my-counter')
export class MyCounter extends KettleElement {
  private count = createSignal(0);

  view() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

**Pros:**
- ✅ Simplest API
- ✅ Automatic signal tracking
- ✅ Clean separation of concerns
- ✅ Built-in reactive scope management

**When to use:** Default choice for new components

---

#### 2. WithSignals Pattern

**Best for:** Existing LitElement components, gradual migration, maximum compatibility

Uses a mixin to add signal support to any LitElement. Great for migrating existing Lit components to use signals.

```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive';

@customElement('my-counter')
export class MyCounter extends WithSignals(LitElement) {
  private count = createSignal(0);

  render() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

**Pros:**
- ✅ Works with existing LitElement components
- ✅ No need to change base class
- ✅ Compatible with other mixins
- ✅ Automatic signal tracking

**When to use:** Migrating existing Lit components, need compatibility with other mixins

---

#### 3. Controller Pattern

**Best for:** Fine-grained control, advanced use cases, manual management

Uses `SignalController` for manual reactive management. Provides the most control but requires more boilerplate.

```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@awc/kettlejs';
import { createSignal } from '@awc/reactive';

@customElement('my-counter')
export class MyCounter extends LitElement {
  private signals = new SignalController(this);
  private count = createSignal(0);

  render() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

**Pros:**
- ✅ Maximum control over reactivity
- ✅ No base class changes needed
- ✅ Explicit reactive scope management
- ✅ Good for advanced use cases

**When to use:** Need fine-grained control, advanced patterns, performance optimization

---

#### 4. Functional Pattern (Legacy)

**Best for:** Simple components, no state, backwards compatibility

Traditional function-based components. Good for simple presentational components but doesn't support signals natively.

```typescript
import { html, Component, ComponentProps } from '@awc/kettlejs';

export interface MyCounterProps extends ComponentProps {
  count: number;
}

export const MyCounter: Component<MyCounterProps> = (props) => {
  return html`
    <div>Count: ${props.count}</div>
  `;
};
```

**Pros:**
- ✅ Simple and lightweight
- ✅ No classes needed
- ✅ Good for presentational components

**Cons:**
- ❌ No built-in state management
- ❌ Requires external signal management

**When to use:** Simple presentational components, no local state needed

---

### Component Features

After selecting a pattern, choose which features to include:

#### 1. Basic Component

Simple component without any additional features.

```bash
? Component features: Basic (Simple component)
```

Includes:
- Component structure
- Basic template
- No state or effects

---

#### 2. With State

Includes reactive state management with signals.

```bash
? Component features: With State (Reactive state management)
```

Includes:
- Signal-based state
- Effects for derived state
- Event handlers
- Example counter implementation

Generated code example (KettleElement pattern):
```typescript
@customElement('my-counter')
export class MyCounter extends KettleElement {
  private count = createSignal(0);
  private message = createSignal('');

  connectedCallback() {
    super.connectedCallback();
    
    this.runInScope(() => {
      createEffect(() => {
        const current = this.count[0]();
        this.message[1](`Count is ${current}`);
      });
    });
  }

  private increment = () => this.count[1](c => c + 1);
  private decrement = () => this.count[1](c => c - 1);

  view() {
    return html`
      <div>
        <p>${this.count[0]()}</p>
        <p>${this.message[0]()}</p>
        <button @click=${this.decrement}>-</button>
        <button @click=${this.increment}>+</button>
      </div>
    `;
  }
}
```

---

#### 3. With Resource

Includes async resource fetching with loading states.

```bash
? Component features: With Resource (Async data fetching)
```

Includes:
- Resource fetching
- Loading states
- Error handling
- Refetch functionality

---

#### 4. With Router

Includes router integration.

```bash
? Component features: With Router (Router integration)
```

Includes:
- Router hooks
- Navigation
- Route parameters
- Link handling

---

#### 5. Full

All features combined (state, resources, router).

```bash
? Component features: Full (All features)
```

Includes everything from above in a comprehensive example.

---

### Interactive Mode

Run without arguments for interactive prompts:

```bash
kettlejs generate component
```

You'll be prompted for:

1. **Component name** (must start with uppercase)
   ```
   ? Component name: MyCounter
   ```

2. **Component pattern** (choose your preferred approach)
   ```
   ? Component pattern:
     ❯ KettleElement (Recommended - extends KettleElement base class)
       WithSignals (Mixin - adds signals to LitElement)
       Controller (Manual - uses SignalController)
       Functional (Legacy - function-based component)
   ```

3. **Component features** (choose complexity level)
   ```
   ? Component features:
     ❯ Basic (Simple component)
       With State (Reactive state management)
       With Resource (Async data fetching)
       With Router (Router integration)
       Full (All features)
   ```

4. **Component path** (relative to src directory)
   ```
   ? Component path: components/MyCounter/MyCounter.ts
   ```

---

### Command Line Mode

Provide all options via flags:

```bash
kettlejs generate component \
  --name MyCounter \
  --pattern kettlelement \
  --type with-state \
  --path components/MyCounter/MyCounter.ts
```

**Available Flags:**

- `--name <name>` - Component name (PascalCase)
- `--pattern <pattern>` - Component pattern
  - `kettlelement` (recommended)
  - `withsignals`
  - `controller`
  - `functional`
- `--type <type>` - Component features
  - `basic`
  - `with-state`
  - `with-resource`
  - `with-router`
  - `full`
- `--path <path>` - Output path relative to src/

---

## Project Generation

Create a new KettleJS project:

```bash
kettlejs create my-app
```

**Interactive prompts:**

1. **Project name**
   ```
   ? Project name: my-kettlejs-app
   ```

2. **Template**
   ```
   ? Template:
     ❯ Basic (Minimal setup)
       Full (Complete with router and examples)
       SSR (Server-side rendering setup)
   ```

**Generated structure:**

```
my-kettlejs-app/
├── src/
│   ├── components/
│   │   └── App.ts
│   ├── main.ts
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Examples

### Example 1: Create a Basic Counter (KettleElement)

```bash
kettlejs g component

? Component name: Counter
? Component pattern: KettleElement (Recommended)
? Component features: With State
? Component path: components/Counter/Counter.ts

✓ Component created at src/components/Counter/Counter.ts
✓ Test file created at src/components/Counter/Counter.spec.ts
✓ Style file created at src/components/Counter/Counter.css
```

### Example 2: Migrate Existing Lit Component

```bash
kettlejs g component

? Component name: ExistingComponent
? Component pattern: WithSignals (Mixin)
? Component features: Basic
? Component path: components/ExistingComponent.ts

✓ Component created
```

### Example 3: Create Advanced Component with Resources

```bash
kettlejs g component \
  --name UserProfile \
  --pattern kettlelement \
  --type with-resource \
  --path components/UserProfile/UserProfile.ts
```

### Example 4: Create Full-Featured Component

```bash
kettlejs g component

? Component name: Dashboard
? Component pattern: KettleElement (Recommended)
? Component features: Full (All features)
? Component path: components/Dashboard/Dashboard.ts

✓ Component created with:
  - Reactive state management
  - Resource fetching
  - Router integration
  - All examples included
```

### Example 5: Create Simple Presentational Component

```bash
kettlejs g component

? Component name: Button
? Component pattern: Functional (Legacy)
? Component features: Basic
? Component path: components/Button.ts

✓ Simple functional component created
```

---

## Pattern Decision Guide

### Quick Decision Tree

```
Do you need reactive state?
├─ No → Functional Pattern
└─ Yes
   │
   Are you migrating an existing LitElement component?
   ├─ Yes → WithSignals Pattern
   └─ No
      │
      Do you need fine-grained control over reactivity?
      ├─ Yes → Controller Pattern
      └─ No → KettleElement Pattern ⭐ (Recommended)
```

### Pattern Comparison Table

| Feature | KettleElement | WithSignals | Controller | Functional |
|---------|--------------|-------------|------------|------------|
| Automatic Updates | ✅ | ✅ | ✅ | ❌ |
| Signal Support | ✅ | ✅ | ✅ | ❌ |
| LitElement Compatible | ✅ | ✅ | ✅ | ❌ |
| Mixin Compatible | ❌ | ✅ | ✅ | N/A |
| Boilerplate | Low | Medium | Medium | Very Low |
| Learning Curve | Low | Low | Medium | Very Low |
| Best For | New projects | Migrations | Advanced | Simple UI |

---

## Best Practices

### 1. Naming Conventions

- **Components:** PascalCase (e.g., `MyCounter`, `UserProfile`)
- **Files:** Match component name (e.g., `MyCounter.ts`)
- **Custom elements:** kebab-case (auto-generated as `my-counter`, `user-profile`)

### 2. File Organization

```
src/
├── components/
│   ├── shared/           # Shared/reusable components
│   │   ├── Button/
│   │   │   ├── Button.ts
│   │   │   ├── Button.css
│   │   │   └── Button.spec.ts
│   │   └── Card/
│   │       └── Card.ts
│   ├── features/         # Feature-specific components
│   │   ├── user/
│   │   │   └── UserProfile/
│   │   └── dashboard/
│   │       └── Dashboard/
│   └── layouts/          # Layout components
│       └── MainLayout/
├── pages/                # Page-level components
│   ├── Home.ts
│   └── About.ts
└── main.ts
```

### 3. Pattern Selection

- **Default:** Start with KettleElement pattern
- **Migration:** Use WithSignals for existing Lit components
- **Advanced:** Use Controller when you need custom reactive logic
- **Simple:** Use Functional for presentational components without state

### 4. Component Size

- Keep components focused and small
- Extract reusable logic into separate functions
- Use composition over inheritance
- Split large components into smaller ones

### 5. State Management

- Use signals for local component state
- Use stores for shared state
- Use resources for async data
- Keep state as close to where it's used as possible

---

## Troubleshooting

### Component Not Rendering

**Issue:** Component created but not showing

**Solution:**
1. Ensure the component is imported
2. Check if custom element is registered
3. Verify the tag name matches `@customElement` decorator

```typescript
// Import and use
import './components/MyCounter/MyCounter';

// In template
html`<my-counter></my-counter>`;
```

### Signals Not Updating

**Issue:** Changes to signals don't update the UI

**Solution:**
1. Ensure you're using a reactive pattern (not Functional)
2. Check that SignalController is initialized
3. Verify signals are accessed in the render/view method

```typescript
// ✅ Correct
view() {
  return html`<div>${this.count[0]()}</div>`;
}

// ❌ Wrong - not calling the accessor
view() {
  return html`<div>${this.count[0]}</div>`;
}
```

### TypeScript Errors

**Issue:** Type errors in generated component

**Solution:**
1. Ensure `@awc/kettlejs` is installed
2. Check tsconfig.json includes experimental decorators
3. Install missing dependencies

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

---

## CLI Configuration

Create a `.kettlejsrc.json` file in your project root for custom defaults:

```json
{
  "componentPattern": "kettlelement",
  "componentPath": "src/components",
  "generateTests": true,
  "generateStyles": true,
  "styleExtension": "css"
}
```

---

## Advanced Usage

### Custom Templates

Override default templates by creating a `.kettlejs/templates` directory:

```
.kettlejs/
└── templates/
    ├── component.ts.template
    ├── test.ts.template
    └── style.css.template
```

### Hooks

Add custom logic with lifecycle hooks in `.kettlejsrc.json`:

```json
{
  "hooks": {
    "preGenerate": "node scripts/pre-generate.js",
    "postGenerate": "npm run format"
  }
}
```

---

## Version History

- **v0.0.1** - Initial release with component patterns
- Added KettleElement, WithSignals, and Controller patterns
- Full state management support
- Interactive CLI with pattern selection

---

## Additional Resources

- [Quick Reference](./QUICK_REFERENCE.md)
- [Component Patterns Guide](./COMPONENT_PATTERNS.md)
- [API Documentation](./docs/API.md)
- [Framework Summary](./FRAMEWORK_SUMMARY.md)

---

**License:** MIT  
**Maintained by:** Adafri Team