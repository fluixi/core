# Fluixi Component Patterns Guide

A comprehensive guide to choosing and using component patterns in Fluixi.

## Overview

Fluixi CLI supports 5 different component patterns, each suited for different use cases and developer preferences. This guide helps you choose the right pattern for your needs.

---

## Pattern Quick Reference

| Pattern | Syntax Style | State Management | Learning Curve | Best For |
|---------|-------------|------------------|----------------|----------|
| **FluixiElement** | Class-based | Fluixi Signals | Low | New Fluixi projects |
| **LitElement** | Class-based | Lit @state | Low | Lit developers |
| **WithSignals** | Class + Mixin | Fluixi Signals | Medium | Hybrid Lit/Fluixi |
| **Controller** | Class + Controller | Manual Signals | High | Advanced use cases |
| **Functional** | Functional | Fluixi Signals | Low | Functional programming |

---

## Pattern Details

### 1. FluixiElement Pattern (Recommended)

**Best for:** New Fluixi projects, developers wanting the best Fluixi experience.

**Syntax:**
```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from '@fluixi/core';
import { createSignal } from '@fluixi/reactive/signal';

@customElement('my-counter')
export class MyCounter extends FluixiElement {
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

**Advantages:**
- ✅ Built-in reactive signal support
- ✅ Automatic cleanup and lifecycle management
- ✅ Best Fluixi integration
- ✅ Type-safe signal handling
- ✅ Scoped effects and computations

**Disadvantages:**
- ❌ Fluixi-specific (not standard Lit)
- ❌ Additional layer of abstraction

**When to use:**
- Starting a new Fluixi project
- Want reactive signals out of the box
- Need automatic signal lifecycle management
- Building Fluixi-first applications

---

### 2. LitElement Pattern

**Best for:** Lit ecosystem compatibility, migrating from Lit, standard web components.

**Syntax:**
```typescript
import { html, css, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

@customElement('my-counter')
export class MyCounter extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @state()
  private count = 0;

  @property({ type: String })
  label = 'Count';

  render() {
    return html`
      <button @click=${() => this.count++}>
        ${this.label}: ${this.count}
      </button>
    `;
  }
}
```

**Advantages:**
- ✅ Standard Lit web component
- ✅ Works with all Lit ecosystem tools
- ✅ Familiar to Lit developers
- ✅ Built-in CSS encapsulation
- ✅ Property reactivity out of the box
- ✅ No Fluixi-specific features needed

**Disadvantages:**
- ❌ No Fluixi reactive signals
- ❌ Less efficient reactivity model
- ❌ Manual state management

**When to use:**
- Migrating from Lit to Fluixi
- Using Lit ecosystem libraries
- Building standard web components
- Don't need fine-grained reactivity
- Want maximum compatibility

---

### 3. WithSignals Pattern

**Best for:** Adding Fluixi signals to existing Lit components.

**Syntax:**
```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core';
import { createSignal } from '@fluixi/reactive/signal';

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

**Advantages:**
- ✅ Adds signals to standard LitElement
- ✅ Works with existing Lit components
- ✅ Gradual migration path
- ✅ Combines Lit and Fluixi features

**Disadvantages:**
- ❌ Mixin complexity
- ❌ Two state management systems
- ❌ Potential confusion about which to use

**When to use:**
- Have existing LitElement components
- Want to add signals gradually
- Need both Lit properties and signals
- Migrating Lit project to Fluixi

---

### 4. Controller Pattern

**Best for:** Advanced use cases, fine-grained control over signal lifecycle.

**Syntax:**
```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@fluixi/core';
import { createSignal } from '@fluixi/reactive/signal';

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

**Advantages:**
- ✅ Full control over signal lifecycle
- ✅ Manual cleanup when needed
- ✅ Works with any LitElement
- ✅ Explicit signal management

**Disadvantages:**
- ❌ More boilerplate
- ❌ Manual lifecycle management
- ❌ Higher learning curve
- ❌ Easy to make mistakes

**When to use:**
- Need fine-grained control
- Complex lifecycle requirements
- Advanced signal patterns
- Custom controller logic

---

### 5. Functional Pattern

**Best for:** Functional programming style, simple components, composition.

**Syntax:**
```typescript
import { html, Component } from '@fluixi/core';
import { createSignal } from '@fluixi/reactive/signal';

export const MyCounter: Component = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <button @click=${() => setCount(c => c + 1)}>
      Count: ${count()}
    </button>
  `;
};
```

**Advantages:**
- ✅ Simple, clean syntax
- ✅ Easy to compose
- ✅ Functional programming style
- ✅ No class boilerplate
- ✅ Lightweight

**Disadvantages:**
- ❌ No web component registration
- ❌ Not a custom element
- ❌ Limited lifecycle hooks
- ❌ Can't use in HTML directly

**When to use:**
- Prefer functional programming
- Building UI fragments
- Composing complex UIs
- Don't need custom elements

---

## Migration Paths

### From React

**Recommended:** Start with **Functional** pattern (familiar), then move to **FluixiElement** for web components.

```typescript
// React (Before)
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Fluixi Functional (Similar)
export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);
  return html`<button @click=${() => setCount(c => c + 1)}>${count()}</button>`;
};

// Fluixi FluixiElement (Web Component)
@customElement('my-counter')
export class Counter extends FluixiElement {
  private count = createSignal(0);
  view() {
    return html`<button @click=${() => this.count[1](c => c + 1)}>${this.count[0]()}</button>`;
  }
}
```

### From Lit

**Recommended:** Start with **LitElement** pattern (no changes), gradually adopt **WithSignals**, then **FluixiElement**.

```typescript
// Step 1: Standard LitElement (your current code)
@customElement('my-counter')
export class Counter extends LitElement {
  @state() count = 0;
  render() {
    return html`<button @click=${() => this.count++}>${this.count}</button>`;
  }
}

// Step 2: Add signals with WithSignals
@customElement('my-counter')
export class Counter extends WithSignals(LitElement) {
  private count = createSignal(0);
  render() {
    return html`<button @click=${() => this.count[1](c => c + 1)}>${this.count[0]()}</button>`;
  }
}

// Step 3: Full FluixiElement
@customElement('my-counter')
export class Counter extends FluixiElement {
  private count = createSignal(0);
  view() {
    return html`<button @click=${() => this.count[1](c => c + 1)}>${this.count[0]()}</button>`;
  }
}
```

### From Vue

**Recommended:** **Functional** pattern is most similar to Vue composition API.

```typescript
// Vue (Before)
<script setup>
const count = ref(0);
</script>

// Fluixi Functional (Similar)
export const Counter: Component = () => {
  const [count, setCount] = createSignal(0);
  return html`<button @click=${() => setCount(c => c + 1)}>${count()}</button>`;
};
```

---

## Performance Comparison

| Pattern | Reactivity | Memory | Bundle Size | Re-render Scope |
|---------|-----------|---------|-------------|-----------------|
| FluixiElement | Fine-grained (signals) | Low | Small | Precise |
| LitElement | Coarse (properties) | Medium | Smallest | Full component |
| WithSignals | Fine-grained (signals) | Medium | Small | Precise |
| Controller | Fine-grained (signals) | Low | Small | Precise |
| Functional | Fine-grained (signals) | Lowest | Smallest | Precise |

**Key:**
- **Fine-grained reactivity:** Only affected DOM nodes update
- **Coarse reactivity:** Entire component re-renders
- **Precise re-render:** Only changed values trigger updates

---

## Real-World Examples

### Simple Button (All Patterns)

**FluixiElement:**
```typescript
@customElement('simple-button')
export class SimpleButton extends FluixiElement {
  private clicks = createSignal(0);
  
  view() {
    return html`
      <button @click=${() => this.clicks[1](c => c + 1)}>
        Clicked ${this.clicks[0]()} times
      </button>
    `;
  }
}
```

**LitElement:**
```typescript
@customElement('simple-button')
export class SimpleButton extends LitElement {
  @state() private clicks = 0;
  
  render() {
    return html`
      <button @click=${() => this.clicks++}>
        Clicked ${this.clicks} times
      </button>
    `;
  }
}
```

**Functional:**
```typescript
export const SimpleButton: Component = () => {
  const [clicks, setClicks] = createSignal(0);
  
  return html`
    <button @click=${() => setClicks(c => c + 1)}>
      Clicked ${clicks()} times
    </button>
  `;
};
```

### Data Fetching Component

**FluixiElement (Recommended for async):**
```typescript
@customElement('user-profile')
export class UserProfile extends FluixiElement {
  private userId = createSignal('1');
  private user = createSignal<User | null>(null);
  private loading = createSignal(false);

  connectedCallback() {
    super.connectedCallback();
    this.runInScope(() => {
      createEffect(async () => {
        const id = this.userId[0]();
        this.loading[1](true);
        const data = await fetchUser(id);
        this.user[1](data);
        this.loading[1](false);
      });
    });
  }

  view() {
    return html`
      ${this.loading[0]() 
        ? html`<div>Loading...</div>`
        : html`<div>${this.user[0]()?.name}</div>`
      }
    `;
  }
}
```

**LitElement:**
```typescript
@customElement('user-profile')
export class UserProfile extends LitElement {
  @property() userId = '1';
  @state() private user: User | null = null;
  @state() private loading = false;

  async updated(changed: PropertyValues) {
    if (changed.has('userId')) {
      this.loading = true;
      this.user = await fetchUser(this.userId);
      this.loading = false;
    }
  }

  render() {
    return html`
      ${this.loading 
        ? html`<div>Loading...</div>`
        : html`<div>${this.user?.name}</div>`
      }
    `;
  }
}
```

---

## Decision Tree

```
Start here: What's your background?

├─ Coming from Lit?
│  ├─ Just want web components? → LitElement
│  ├─ Want to try signals? → WithSignals
│  └─ Going all-in on Fluixi? → FluixiElement
│
├─ Coming from React?
│  ├─ Like hooks/functions? → Functional
│  ├─ Need web components? → FluixiElement
│  └─ Want both? → Start Functional, migrate to FluixiElement
│
├─ Coming from Vue?
│  ├─ Love composition API? → Functional
│  └─ Need web components? → FluixiElement
│
├─ New to all of this?
│  └─ → FluixiElement (best balance)
│
└─ Advanced user?
   ├─ Need fine control? → Controller
   └─ Building library? → Functional
```

---

## CLI Commands by Pattern

```bash
# FluixiElement (recommended)
fluixi g c MyComponent --pattern fluixilement

# LitElement
fluixi g c MyComponent --pattern litelement

# WithSignals
fluixi g c MyComponent --pattern withsignals

# Controller
fluixi g c MyComponent --pattern controller

# Functional
fluixi g c MyComponent --pattern functional
```

---

## Best Practices

### FluixiElement
- Use `view()` instead of `render()`
- Always use `runInScope()` for effects in lifecycle methods
- Leverage automatic cleanup

### LitElement
- Use `@state()` for internal state
- Use `@property()` for external props
- Implement `updated()` for side effects

### WithSignals
- Keep Lit properties for external API
- Use signals for internal reactive state
- Document which pattern you're using

### Controller
- Always create controller in constructor
- Manual cleanup in `disconnectedCallback`
- Use for advanced patterns only

### Functional
- Keep functions pure when possible
- Use for composition
- Combine with custom elements for full features

---

## Common Pitfalls

### FluixiElement
❌ **Don't:** Call `createEffect` outside `runInScope`
```typescript
connectedCallback() {
  createEffect(() => { }); // Memory leak!
}
```

✅ **Do:**
```typescript
connectedCallback() {
  super.connectedCallback();
  this.runInScope(() => {
    createEffect(() => { }); // Cleaned up automatically
  });
}
```

### LitElement
❌ **Don't:** Mutate state directly
```typescript
this.items.push(newItem); // Won't trigger re-render
```

✅ **Do:**
```typescript
this.items = [...this.items, newItem]; // Triggers re-render
```

### Functional
❌ **Don't:** Create signals conditionally
```typescript
if (condition) {
  const [signal] = createSignal(0); // Different signals each render!
}
```

✅ **Do:**
```typescript
const [signal] = createSignal(0);
// Use conditionally
```

---

## Summary

**Quick Recommendations:**

- 🚀 **Starting fresh?** → **FluixiElement**
- 🔄 **Migrating from Lit?** → **LitElement** → **WithSignals** → **FluixiElement**
- ⚛️ **Coming from React?** → **Functional** → **FluixiElement**
- 🎯 **Building library?** → **Functional**
- 🔧 **Need fine control?** → **Controller**
- 🌐 **Maximum compatibility?** → **LitElement**

**Remember:** All patterns can coexist in the same project. Choose what fits each component best!

---

## Further Reading

- [FluixiElement API Reference](../framework/api-fluixielement.md)
- [LitElement Documentation](https://lit.dev)
- [Signals Guide](../framework/signals-guide.md)
- [Migration Guide](../framework/migration-guide.md)