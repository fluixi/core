---
sidebar_position: 1
title: Components Overview
---

# Components Overview

Fluixi provides multiple ways to create components, giving you flexibility to choose the pattern that best fits your needs.

## Component Patterns

Fluixi supports four main component patterns:

### 1. Functional Components

Simple functions that return templates. Perfect for most use cases.

```typescript
import { html, createSignal, Component } from '@fluixi/core';

const Counter: Component = () => {
  const [count, setCount] = createSignal(0);
  
  return html`
    <div>
      <p>Count: ${count()}</p>
      <button @click=${() => setCount(count() + 1)}>Increment</button>
    </div>
  `;
};
```

**Best for:**
- Simple, stateless components
- Rapid prototyping
- Components that don't need custom element features

### 2. FluixiElement Base Class

Custom elements that extend FluixiElement for full reactive capabilities.

```typescript
import { html, createSignal } from '@fluixi/core';
import { FluixiElement } from '@fluixi/core/core';
import { customElement } from 'lit/decorators.js';

@customElement('my-counter')
class MyCounter extends FluixiElement {
  private [count, setCount] = createSignal(0);
  
  view() {
    return html`
      <div>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(this.count() + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

**Best for:**
- Reusable custom elements
- Components needing lifecycle hooks
- Integration with web component ecosystems

### 3. WithSignals Mixin

Add reactive capabilities to any LitElement.

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
class MyCounter extends WithSignals(LitElement) {
  private count = createSignal(0);
  
  render() {
    return html`
      <div>
        <p>Count: ${this.count[0]()}</p>
        <button @click=${() => this.count[1](this.count[0]() + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

**Best for:**
- Migrating existing Lit components
- Gradual adoption in Lit projects
- Components that need Lit-specific features

### 4. Reactive Controllers

Fine-grained control for advanced use cases.

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ReactiveController } from '@fluixi/core/core';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
class MyCounter extends LitElement {
  private reactive = new ReactiveController(this);
  private count = createSignal(0);
  
  render() {
    return html`
      <div>
        <p>Count: ${this.count[0]()}</p>
        <button @click=${() => this.count[1](this.count[0]() + 1)}>
          Increment
        </button>
      </div>
    `;
  }
}
```

**Best for:**
- Fine-grained control over reactivity
- Complex state management
- Advanced lifecycle management

## Comparison

| Feature | Functional | FluixiElement | WithSignals | Controllers |
|---------|-----------|---------------|-------------|-------------|
| Simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Custom Elements | ❌ | ✅ | ✅ | ✅ |
| Lifecycle Hooks | Limited | Full | Full | Full |
| Lit Integration | N/A | Native | Native | Native |
| Boilerplate | Minimal | Low | Low | Medium |
| TypeScript | Excellent | Excellent | Excellent | Excellent |

## Choosing a Pattern

### Use Functional Components When:

- Building simple, composable UI components
- You don't need custom element features
- You want minimal boilerplate
- Rapid prototyping

```typescript
// Perfect for simple components
const Button: Component<{ label: string; onClick: () => void }> = (props) => {
  return html`
    <button @click=${props.onClick}>${props.label}</button>
  `;
};
```

### Use FluixiElement When:

- You need a custom element
- You want full Fluixi features
- Component lifecycle management is important
- Building a component library

```typescript
// Perfect for reusable custom elements
@customElement('app-button')
class AppButton extends FluixiElement {
  @property() label = 'Click me';
  
  view() {
    return html`<button>${this.label}</button>`;
  }
}
```

### Use WithSignals When:

- Migrating from plain Lit
- You need Lit-specific features
- Gradual adoption in existing projects
- You want both Lit and reactive features

```typescript
// Perfect for migration
@customElement('legacy-component')
class LegacyComponent extends WithSignals(LitElement) {
  // Existing Lit properties
  @property() title = '';
  
  // New reactive state
  private count = createSignal(0);
  
  render() {
    return html`
      <h1>${this.title}</h1>
      <p>Count: ${this.count[0]()}</p>
    `;
  }
}
```

### Use Reactive Controllers When:

- You need fine-grained control
- Complex state management scenarios
- Building framework abstractions
- Advanced reactive patterns

```typescript
// Perfect for advanced control
class MyController {
  private reactive = new ReactiveController(this.host);
  private state = createSignal(initialState);
  
  constructor(private host: ReactiveControllerHost) {
    this.reactive.effect(() => {
      // Advanced reactive logic
    });
  }
}
```

## Component Communication

### Props

Pass data down to child components:

```typescript
interface UserCardProps extends ComponentProps {
  user: User;
  onEdit: (user: User) => void;
}

const UserCard: Component<UserCardProps> = (props) => {
  return html`
    <div class="user-card">
      <h3>${props.user.name}</h3>
      <button @click=${() => props.onEdit(props.user)}>Edit</button>
    </div>
  `;
};

// Usage
const App = () => {
  const [user] = createSignal({ id: 1, name: 'Alice' });
  
  return html`
    ${UserCard({ 
      user: user(), 
      onEdit: (u) => console.log('Edit', u) 
    })}
  `;
};
```

### Context

Share state across component trees:

```typescript
import { createContext, useContext, Provider } from '@fluixi/core/context';

const ThemeContext = createContext<Theme>({ mode: 'light' });

const Button: Component = () => {
  const theme = useContext(ThemeContext);
  
  return html`
    <button style="background: ${theme.mode === 'dark' ? '#333' : '#fff'}">
      Click me
    </button>
  `;
};

const App: Component = () => {
  const [theme] = createSignal({ mode: 'dark' });
  
  return Provider({
    context: ThemeContext,
    value: theme(),
    children: html`${Button()}`
  });
};
```

### Events

Emit custom events from components:

```typescript
const ChildComponent: Component = () => {
  const handleClick = () => {
    const event = new CustomEvent('itemSelected', {
      detail: { id: 123 },
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  };
  
  return html`<button @click=${handleClick}>Select</button>`;
};

const ParentComponent: Component = () => {
  createEffect(() => {
    const handler = (e: CustomEvent) => {
      console.log('Item selected:', e.detail.id);
    };
    
    document.addEventListener('itemSelected', handler as EventListener);
    
    return () => {
      document.removeEventListener('itemSelected', handler as EventListener);
    };
  });
  
  return html`${ChildComponent()}`;
};
```

## Lifecycle

### Functional Components

```typescript
import { onMount, onUnmount } from '@fluixi/core';

const MyComponent: Component = () => {
  onMount(() => {
    console.log('Component mounted');
    
    return () => {
      console.log('Component unmounting');
    };
  });
  
  return html`<div>Content</div>`;
};
```

### FluixiElement

```typescript
@customElement('my-element')
class MyElement extends FluixiElement {
  connectedCallback() {
    super.connectedCallback();
    console.log('Element connected');
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Element disconnected');
  }
  
  view() {
    return html`<div>Content</div>`;
  }
}
```

## Styling Components

### Inline Styles

```typescript
const StyledComponent: Component = () => {
  return html`
    <div style="padding: 20px; background: #f0f0f0;">
      Content
    </div>
  `;
};
```

### CSS in JS

```typescript
import { css } from 'lit';

@customElement('styled-element')
class StyledElement extends FluixiElement {
  static styles = css`
    :host {
      display: block;
      padding: 20px;
      background: #f0f0f0;
    }
    
    .title {
      font-size: 24px;
      font-weight: bold;
    }
  `;
  
  view() {
    return html`
      <div class="title">Title</div>
      <p>Content</p>
    `;
  }
}
```

### External Stylesheets

```typescript
const App: Component = () => {
  return html`
    <link rel="stylesheet" href="/styles.css">
    <div class="app">Content</div>
  `;
};
```

### Dynamic Styles

```typescript
import { styleMap } from '@fluixi/core';

const DynamicComponent: Component = () => {
  const [color, setColor] = createSignal('#ff0000');
  
  return html`
    <div style=${styleMap({ 
      color: color(),
      padding: '20px'
    })}>
      Styled content
    </div>
  `;
};
```

## Best Practices

### 1. Keep Components Small

Break down complex UIs into smaller, focused components:

```typescript
// ❌ Too large
const Dashboard: Component = () => {
  // 500 lines of code...
};

// ✅ Better - split into smaller components
const DashboardHeader: Component = () => { /* ... */ };
const DashboardSidebar: Component = () => { /* ... */ };
const DashboardContent: Component = () => { /* ... */ };

const Dashboard: Component = () => {
  return html`
    <div class="dashboard">
      ${DashboardHeader()}
      ${DashboardSidebar()}
      ${DashboardContent()}
    </div>
  `;
};
```

### 2. Use TypeScript

Always type your component props:

```typescript
interface UserCardProps extends ComponentProps {
  user: User;
  showEmail?: boolean;
  onEdit?: (user: User) => void;
}

const UserCard: Component<UserCardProps> = (props) => {
  // TypeScript ensures type safety
  return html`<div>${props.user.name}</div>`;
};
```

### 3. Memoize Expensive Computations

```typescript
const DataTable: Component<{ items: Item[] }> = (props) => {
  // Memoize expensive filtering/sorting
  const processedItems = createMemo(() => {
    return props.items
      .filter(item => item.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return html`
    ${For({ each: processedItems, children: (item) => html`...` })}
  `;
};
```

### 4. Avoid Prop Drilling

Use Context for deeply nested state:

```typescript
// ❌ Prop drilling
const GrandChild: Component<{ theme: Theme }> = (props) => { /* ... */ };
const Child: Component<{ theme: Theme }> = (props) => {
  return html`${GrandChild({ theme: props.theme })}`;
};
const Parent: Component = () => {
  const [theme] = createSignal({ mode: 'dark' });
  return html`${Child({ theme: theme() })}`;
};

// ✅ Context
const ThemeContext = createContext<Theme>({ mode: 'light' });

const GrandChild: Component = () => {
  const theme = useContext(ThemeContext);
  return html`<div>Theme: ${theme.mode}</div>`;
};
```

## Next Steps

- Learn about [Functional Components](./functional-components.md) in detail
- Explore [FluixiElement](./fluixi-element.md) features
- Understand [Component Lifecycle](./lifecycle.md)
- See [Component Patterns](../guides/component-patterns.md) examples

## Related Resources

- [API Reference: Components](../api-reference/components.md)
- [Examples: Component Patterns](../guides/examples.md#components)
- [Lit Documentation](https://lit.dev)