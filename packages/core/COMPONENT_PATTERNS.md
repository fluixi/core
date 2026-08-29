# Fluixi Component Patterns Guide

## Overview

Fluixi supports multiple component patterns for integrating reactive signals with Lit elements. This guide covers all patterns with complete examples.

---

## Pattern 1: FluixiElement (Recommended)

The `FluixiElement` base class provides the cleanest API with automatic signal tracking.

### Basic Example

```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from '@fluixi/core/core/component';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
export class MyCounter extends FluixiElement {
  private [count, setCount] = createSignal(0);

  view() {
    return html`
      <div>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(c => c + 1)}>+</button>
        <button @click=${() => this.setCount(c => c - 1)}>-</button>
      </div>
    `;
  }
}
```

### With Effects

```typescript
import { createSignal, createEffect } from '@fluixi/reactive';

@customElement('my-component')
export class MyComponent extends FluixiElement {
  private [data, setData] = createSignal<string | null>(null);

  connectedCallback() {
    super.connectedCallback();
    
    // Run effects in reactive scope
    this.runInScope(() => {
      createEffect(() => {
        console.log('Data changed:', this.data());
      });
    });
  }

  view() {
    return html`<div>${this.data()}</div>`;
  }
}
```

### With Computed Values

```typescript
import { createSignal, createMemo } from '@fluixi/reactive';

@customElement('user-profile')
export class UserProfile extends FluixiElement {
  private [firstName, setFirstName] = createSignal('John');
  private [lastName, setLastName] = createSignal('Doe');
  
  // Computed value
  private fullName = createMemo(() => 
    `${this.firstName()} ${this.lastName()}`
  );

  view() {
    return html`
      <div>
        <p>Full Name: ${this.fullName()}</p>
        <input 
          .value=${this.firstName()} 
          @input=${(e: Event) => 
            this.setFirstName((e.target as HTMLInputElement).value)
          }
        />
        <input 
          .value=${this.lastName()} 
          @input=${(e: Event) => 
            this.setLastName((e.target as HTMLInputElement).value)
          }
        />
      </div>
    `;
  }
}
```

### With Context

```typescript
import { createContext, useContext } from '@fluixi/core/context';
import { createSignal } from '@fluixi/reactive';

interface Theme {
  primaryColor: string;
  secondaryColor: string;
}

const ThemeContext = createContext<Theme>({
  primaryColor: '#007bff',
  secondaryColor: '#6c757d'
});

@customElement('themed-button')
export class ThemedButton extends FluixiElement {
  view() {
    const theme = useContext(ThemeContext);
    
    return html`
      <button style="background: ${theme.primaryColor}">
        Themed Button
      </button>
    `;
  }
}

@customElement('theme-provider')
export class ThemeProvider extends FluixiElement {
  private [theme, setTheme] = createSignal<Theme>({
    primaryColor: '#28a745',
    secondaryColor: '#dc3545'
  });

  view() {
    return html`
      ${Provider({
        context: ThemeContext,
        value: this.theme(),
        children: html`<slot></slot>`
      })}
    `;
  }
}
```

### Pros & Cons

✅ **Pros:**
- Clean, minimal API
- Automatic signal tracking
- `view()` method is clear and explicit
- Built-in reactive scope management
- Easy to understand and maintain

❌ **Cons:**
- Requires extending `FluixiElement`
- Different from standard `LitElement.render()`
- Might confuse developers familiar with Lit

---

## Pattern 2: WithSignals Mixin

The `WithSignals` mixin adds automatic signal tracking to any Lit element.

### Basic Example

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core/reactive';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
export class MyCounter extends WithSignals(LitElement) {
  private [count, setCount] = createSignal(0);

  render() {
    return html`
      <div>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(c => c + 1)}>+</button>
      </div>
    `;
  }
}
```

### With Lit Features

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core/reactive';
import { createSignal, createEffect } from '@fluixi/reactive';

@customElement('my-element')
export class MyElement extends WithSignals(LitElement) {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
    }
    .active {
      color: blue;
    }
  `;

  // Standard Lit property
  @property({ type: String })
  title = 'Hello';

  // Reactive signal
  private [count, setCount] = createSignal(0);
  private [active, setActive] = createSignal(false);

  connectedCallback() {
    super.connectedCallback();
    
    // Run effects in reactive scope
    this.runInReactiveScope(() => {
      createEffect(() => {
        console.log('Count:', this.count());
      });
    });
  }

  render() {
    return html`
      <div class=${this.active() ? 'active' : ''}>
        <h2>${this.title}</h2>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(c => c + 1)}>+</button>
        <button @click=${() => this.setActive(!this.active())}>
          Toggle Active
        </button>
      </div>
    `;
  }
}
```

### With Multiple Mixins

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core/reactive';
import { SomeOtherMixin } from './other-mixin';
import { createSignal } from '@fluixi/reactive';

@customElement('my-element')
export class MyElement extends WithSignals(SomeOtherMixin(LitElement)) {
  private [count, setCount] = createSignal(0);

  render() {
    return html`<p>${this.count()}</p>`;
  }
}
```

### Pros & Cons

✅ **Pros:**
- Uses standard `LitElement` and `render()`
- Compatible with all Lit features (styles, properties, etc.)
- Easy to add to existing components
- Can combine with other mixins
- Familiar API for Lit developers

❌ **Cons:**
- Slightly more verbose than `FluixiElement`
- Mixin pattern can be confusing
- Need to call `runInReactiveScope()` for effects

---

## Pattern 3: Manual SignalController

Explicit control with `SignalController` for maximum flexibility.

### Basic Example

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@fluixi/core/core/reactive';
import { createSignal } from '@fluixi/reactive';

@customElement('my-counter')
export class MyCounter extends LitElement {
  private _signals = new SignalController(this);
  private [count, setCount] = createSignal(0);

  render() {
    return html`
      <div>
        <p>Count: ${this.count()}</p>
        <button @click=${() => this.setCount(c => c + 1)}>+</button>
      </div>
    `;
  }
}
```

### With Custom Controller

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ReactiveController } from '@fluixi/core/core/reactive';
import { createSignal, createEffect } from '@fluixi/reactive';

@customElement('my-element')
export class MyElement extends LitElement {
  // Don't auto-watch signals
  private reactive = new ReactiveController(this, false);
  private [count, setCount] = createSignal(0);

  connectedCallback() {
    super.connectedCallback();
    
    // Manual effect setup
    this.reactive.effect(() => {
      console.log('Count:', this.count());
      
      // When count reaches 10, trigger update
      if (this.count() >= 10) {
        this.requestUpdate();
      }
    });
  }

  render() {
    return html`<p>${this.count()}</p>`;
  }
}
```

### With Batched Updates

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ReactiveController } from '@fluixi/core/core/reactive';
import { createSignal } from '@fluixi/reactive';

@customElement('my-form')
export class MyForm extends LitElement {
  private reactive = new ReactiveController(this);
  private [firstName, setFirstName] = createSignal('');
  private [lastName, setLastName] = createSignal('');
  private [email, setEmail] = createSignal('');

  private updateAll(data: { firstName: string; lastName: string; email: string }) {
    // Batch updates for efficiency
    this.reactive.batch(() => {
      this.setFirstName(data.firstName);
      this.setLastName(data.lastName);
      this.setEmail(data.email);
    });
  }

  render() {
    return html`
      <form>
        <input .value=${this.firstName()} />
        <input .value=${this.lastName()} />
        <input .value=${this.email()} />
      </form>
    `;
  }
}
```

### Pros & Cons

✅ **Pros:**
- Maximum control and flexibility
- Can disable auto-watching
- Explicit reactive boundaries
- Good for complex scenarios
- Easy to understand what's happening

❌ **Cons:**
- Most verbose pattern
- More boilerplate
- Need to manage controller manually

---

## Pattern Comparison

| Feature | FluixiElement | WithSignals | Manual Controller |
|---------|--------------|-------------|-------------------|
| Auto Signal Tracking | ✅ | ✅ | ✅ (optional) |
| Standard Lit API | ❌ | ✅ | ✅ |
| Verbosity | Low | Medium | High |
| Flexibility | Medium | High | Highest |
| Learning Curve | Low | Medium | Medium |
| Best For | New components | Existing components | Complex scenarios |

---

## Pattern Selection Guide

### Use FluixiElement When:
- ✅ Starting a new project
- ✅ Building from scratch
- ✅ Want minimal boilerplate
- ✅ Team is new to Lit
- ✅ Prefer explicit patterns

### Use WithSignals When:
- ✅ Adding reactivity to existing Lit components
- ✅ Need all Lit features (styles, properties, etc.)
- ✅ Using other Lit mixins
- ✅ Team familiar with Lit
- ✅ Want standard Lit API

### Use Manual Controller When:
- ✅ Need fine-grained control
- ✅ Complex reactivity requirements
- ✅ Want to disable auto-watching
- ✅ Performance critical scenarios
- ✅ Need explicit reactive boundaries

---

## Advanced Patterns

### Pattern: Shared State

```typescript
// shared-state.ts
import { createSignal } from '@fluixi/reactive';

export const [globalCount, setGlobalCount] = createSignal(0);

// component-a.ts
import { FluixiElement } from '@fluixi/core/core/component';
import { globalCount, setGlobalCount } from './shared-state';

@customElement('component-a')
export class ComponentA extends FluixiElement {
  view() {
    return html`
      <button @click=${() => setGlobalCount(globalCount() + 1)}>
        Increment Global: ${globalCount()}
      </button>
    `;
  }
}

// component-b.ts
@customElement('component-b')
export class ComponentB extends FluixiElement {
  view() {
    return html`<p>Global Count: ${globalCount()}</p>`;
  }
}
```

### Pattern: Store Pattern

```typescript
// store.ts
import { createSignal, createMemo } from '@fluixi/reactive';

export function createStore<T extends object>(initialState: T) {
  const [state, setState] = createSignal(initialState);
  
  const actions = {
    update: (partial: Partial<T>) => {
      setState({ ...state(), ...partial });
    },
    reset: () => {
      setState(initialState);
    }
  };
  
  return [state, actions] as const;
}

// usage
const [userState, userActions] = createStore({
  name: 'John',
  email: 'john@example.com',
  age: 30
});

@customElement('user-display')
export class UserDisplay extends FluixiElement {
  view() {
    const user = userState();
    return html`
      <div>
        <p>Name: ${user.name}</p>
        <p>Email: ${user.email}</p>
        <button @click=${() => userActions.update({ age: user.age + 1 })}>
          Birthday
        </button>
      </div>
    `;
  }
}
```

### Pattern: HOC (Higher-Order Component)

```typescript
import { LitElement, html } from 'lit';
import { WithSignals } from '@fluixi/core/core/reactive';
import { createSignal } from '@fluixi/reactive';

function withLoading<T extends new (...args: any[]) => LitElement>(Base: T) {
  return class extends WithSignals(Base) {
    private [loading, setLoading] = createSignal(false);
    
    protected startLoading() {
      this.setLoading(true);
    }
    
    protected stopLoading() {
      this.setLoading(false);
    }
    
    render() {
      if (this.loading()) {
        return html`<p>Loading...</p>`;
      }
      return super.render();
    }
  };
}

@customElement('my-component')
export class MyComponent extends withLoading(LitElement) {
  async fetchData() {
    this.startLoading();
    await fetch('/api/data');
    this.stopLoading();
  }
  
  render() {
    return html`<button @click=${this.fetchData}>Load</button>`;
  }
}
```

---

## Best Practices

### 1. Choose One Pattern Per Component

```typescript
// ❌ Don't mix patterns
class Bad extends WithSignals(FluixiElement) { } // Redundant!

// ✅ Pick one
class Good extends FluixiElement { }
// OR
class AlsoGood extends WithSignals(LitElement) { }
```

### 2. Use Memos for Expensive Computations

```typescript
// ❌ Avoid
class Bad extends FluixiElement {
  view() {
    // Recomputed every render!
    const filtered = this.items().filter(x => x.active);
    return html`<p>${filtered.length}</p>`;
  }
}

// ✅ Better
class Good extends FluixiElement {
  private filtered = createMemo(() => 
    this.items().filter(x => x.active)
  );
  
  view() {
    return html`<p>${this.filtered().length}</p>`;
  }
}
```

### 3. Batch Related Updates

```typescript
// ❌ Avoid
this.setFirstName('John');
this.setLastName('Doe');
this.setEmail('john@example.com');
// ^ Three separate updates = three renders!

// ✅ Better
batch(() => {
  this.setFirstName('John');
  this.setLastName('Doe');
  this.setEmail('john@example.com');
}); // ^ One render!
```

### 4. Clean Up Effects

```typescript
class MyComponent extends FluixiElement {
  connectedCallback() {
    super.connectedCallback();
    
    this.runInScope(() => {
      createEffect(() => {
        const timer = setInterval(() => {
          console.log('tick');
        }, 1000);
        
        // ✅ Always clean up!
        onCleanup(() => clearInterval(timer));
      });
    });
  }
}
```

---

## Migration Guide

### From Standard Lit to FluixiElement

```typescript
// Before
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('my-element')
export class MyElement extends LitElement {
  @state()
  private count = 0;
  
  render() {
    return html`<p>${this.count}</p>`;
  }
}

// After
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from '@fluixi/core/core/component';
import { createSignal } from '@fluixi/reactive';

@customElement('my-element')
export class MyElement extends FluixiElement {
  private [count, setCount] = createSignal(0);
  
  view() {
    return html`<p>${this.count()}</p>`;
  }
}
```

### From React to Fluixi

```typescript
// React
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count:', count);
  }, [count]);
  
  return <div>{count}</div>;
}

// Fluixi
@customElement('my-counter')
export class Counter extends FluixiElement {
  private [count, setCount] = createSignal(0);
  
  connectedCallback() {
    super.connectedCallback();
    
    this.runInScope(() => {
      createEffect(() => {
        console.log('Count:', this.count());
      });
    });
  }
  
  view() {
    return html`<div>${this.count()}</div>`;
  }
}
```

---

## Resources

- [Fluixi Documentation](./README.md)
- [API Reference](./docs/API.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Lit Documentation](https://lit.dev)
- [@fluixi/reactive Documentation](../reactive/README.md)