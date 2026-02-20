---
sidebar_position: 9
title: Migration Guide
---

# Migration Guide

This guide helps you migrate to KettleJS from other popular frameworks.

## Table of Contents

- [From React](#from-react)
- [From Vue](#from-vue)
- [From SolidJS](#from-solidjs)
- [From Svelte](#from-svelte)
- [From Lit](#from-lit)
- [From Angular](#from-angular)

## From React

### Concepts Mapping

| React | KettleJS | Notes |
|-------|----------|-------|
| `useState` | `createSignal` | Similar API but signals are functions |
| `useEffect` | `createEffect` | Auto-tracks dependencies |
| `useMemo` | `createMemo` | Similar but auto-tracks |
| `useContext` | `useContext` | Same name, similar API |
| `useCallback` | Not needed | Functions are stable |
| `useRef` | `ref` directive | Different implementation |
| JSX | lit-html | Template literals instead |

### State Management

**React:**
```typescript
const [count, setCount] = useState(0);
const [user, setUser] = useState(null);

// Update
setCount(count + 1);
setUser({ name: 'Alice' });
```

**KettleJS:**
```typescript
const [count, setCount] = createSignal(0);
const [user, setUser] = createSignal(null);

// Update
setCount(count() + 1); // Note: call count()
setUser({ name: 'Alice' });
```

### Effects

**React:**
```typescript
useEffect(() => {
  console.log('Count:', count);
  
  return () => {
    console.log('Cleanup');
  };
}, [count]); // Manual dependency array
```

**KettleJS:**
```typescript
createEffect(() => {
  console.log('Count:', count()); // Auto-tracked
  
  return () => {
    console.log('Cleanup');
  };
}); // No dependency array needed!
```

### Computed Values

**React:**
```typescript
const fullName = useMemo(() => {
  return `${firstName} ${lastName}`;
}, [firstName, lastName]);
```

**KettleJS:**
```typescript
const fullName = createMemo(() => {
  return `${firstName()} ${lastName()}`;
}); // Auto-tracks dependencies
```

### Components

**React:**
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button onClick={onClick}>
      {label}
    </button>
  );
};
```

**KettleJS:**
```typescript
interface ButtonProps extends ComponentProps {
  label: string;
  onClick: () => void;
}

const Button: Component<ButtonProps> = (props) => {
  return html`
    <button @click=${props.onClick}>
      ${props.label}
    </button>
  `;
};
```

### Conditional Rendering

**React:**
```typescript
{isLoggedIn ? (
  <Dashboard user={user} />
) : (
  <LoginForm />
)}

{user && <UserProfile user={user} />}
```

**KettleJS:**
```typescript
${Show({
  when: () => isLoggedIn(),
  fallback: html`${LoginForm()}`,
  children: html`${Dashboard({ user: user() })}`
})}

${Show({
  when: user,
  children: (u) => html`${UserProfile({ user: u })}`
})}
```

### List Rendering

**React:**
```typescript
{items.map((item) => (
  <li key={item.id}>{item.name}</li>
))}
```

**KettleJS:**
```typescript
${For({
  each: items,
  children: (item) => html`<li>${item.name}</li>`
})}
```

### Context

**React:**
```typescript
const ThemeContext = React.createContext('light');

const Provider = () => (
  <ThemeContext.Provider value={theme}>
    <App />
  </ThemeContext.Provider>
);

const Consumer = () => {
  const theme = useContext(ThemeContext);
  return <div>{theme}</div>;
};
```

**KettleJS:**
```typescript
const ThemeContext = createContext('light');

const ProviderComponent = () => {
  return Provider({
    context: ThemeContext,
    value: theme(),
    children: html`${App()}`
  });
};

const Consumer = () => {
  const theme = useContext(ThemeContext);
  return html`<div>${theme}</div>`;
};
```

### Key Differences

1. **No Virtual DOM**: KettleJS updates DOM directly
2. **No Re-renders**: Fine-grained reactivity means no component re-renders
3. **Signals are Functions**: Must call `count()` to read value
4. **Auto-tracking**: No manual dependency arrays
5. **Template Literals**: Use lit-html instead of JSX

## From Vue

### Concepts Mapping

| Vue 3 | KettleJS | Notes |
|-------|----------|-------|
| `ref` | `createSignal` | Similar concept |
| `computed` | `createMemo` | Same purpose |
| `watch`/`watchEffect` | `createEffect` | Auto-tracking |
| `provide`/`inject` | `Provider`/`useContext` | Similar API |
| Template syntax | lit-html | Different but familiar |
| `onMounted` | `onMount` | Same concept |
| `onUnmounted` | `onUnmount` | Same concept |

### Reactive State

**Vue 3:**
```typescript
const count = ref(0);
const user = ref(null);

// Access
console.log(count.value);

// Update
count.value++;
user.value = { name: 'Alice' };
```

**KettleJS:**
```typescript
const [count, setCount] = createSignal(0);
const [user, setUser] = createSignal(null);

// Access
console.log(count());

// Update
setCount(count() + 1);
setUser({ name: 'Alice' });
```

### Computed Properties

**Vue 3:**
```typescript
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});
```

**KettleJS:**
```typescript
const fullName = createMemo(() => {
  return `${firstName()} ${lastName()}`;
});
```

### Watchers

**Vue 3:**
```typescript
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
});

watchEffect(() => {
  console.log('Count:', count.value);
});
```

**KettleJS:**
```typescript
// Use effect with prev value
createEffect((prev = 0) => {
  const current = count();
  console.log(`Changed from ${prev} to ${current}`);
  return current;
});

// Simple effect
createEffect(() => {
  console.log('Count:', count());
});
```

### Components

**Vue 3:**
```vue
<template>
  <button @click="onClick">{{ label }}</button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  onClick: () => void;
}>();
</script>
```

**KettleJS:**
```typescript
interface ButtonProps extends ComponentProps {
  label: string;
  onClick: () => void;
}

const Button: Component<ButtonProps> = (props) => {
  return html`
    <button @click=${props.onClick}>
      ${props.label}
    </button>
  `;
};
```

### v-if / v-show

**Vue 3:**
```vue
<div v-if="isVisible">Visible</div>
<div v-else>Hidden</div>

<div v-show="isVisible">Toggle visibility</div>
```

**KettleJS:**
```typescript
${Show({
  when: isVisible,
  fallback: html`<div>Hidden</div>`,
  children: html`<div>Visible</div>`
})}

// For v-show behavior, use CSS
html`<div style="display: ${isVisible() ? 'block' : 'none'}">
  Toggle visibility
</div>`
```

### v-for

**Vue 3:**
```vue
<li v-for="item in items" :key="item.id">
  {{ item.name }}
</li>
```

**KettleJS:**
```typescript
${For({
  each: items,
  children: (item) => html`<li>${item.name}</li>`
})}
```

## From SolidJS

KettleJS is heavily inspired by SolidJS, so migration is straightforward!

### Main Differences

1. **Templates**: KettleJS uses lit-html instead of JSX
2. **Rendering**: Uses lit-html's rendering engine
3. **Custom Elements**: Native integration with KettleElement

### Signal Syntax

**SolidJS:**
```typescript
const [count, setCount] = createSignal(0);

// Read
count();

// Write
setCount(5);
setCount(c => c + 1);
```

**KettleJS:**
```typescript
// Identical!
const [count, setCount] = createSignal(0);

count();
setCount(5);
setCount(c => c + 1);
```

### Components

**SolidJS:**
```tsx
const Counter = () => {
  const [count, setCount] = createSignal(0);
  
  return (
    <button onClick={() => setCount(count() + 1)}>
      Count: {count()}
    </button>
  );
};
```

**KettleJS:**
```typescript
const Counter = () => {
  const [count, setCount] = createSignal(0);
  
  return html`
    <button @click=${() => setCount(count() + 1)}>
      Count: ${count()}
    </button>
  `;
};
```

### Show Component

**SolidJS:**
```tsx
<Show when={user()} fallback={<div>Loading...</div>}>
  {(u) => <div>{u.name}</div>}
</Show>
```

**KettleJS:**
```typescript
${Show({
  when: user,
  fallback: html`<div>Loading...</div>`,
  children: (u) => html`<div>${u.name}</div>`
})}
```

### For Component

**SolidJS:**
```tsx
<For each={items()}>
  {(item) => <li>{item.name}</li>}
</For>
```

**KettleJS:**
```typescript
${For({
  each: items,
  children: (item) => html`<li>${item.name}</li>`
})}
```

## From Svelte

### Concepts Mapping

| Svelte | KettleJS | Notes |
|--------|----------|-------|
| `let` | `createSignal` | Different syntax |
| `$:` | `createMemo` | Explicit instead of magic |
| `$:` (statement) | `createEffect` | Explicit effect |
| `{#if}` | `Show` | Component instead of syntax |
| `{#each}` | `For` | Component instead of syntax |
| Stores | Context + Signals | Similar concept |

### Reactive Declarations

**Svelte:**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  
  $: {
    console.log('Count:', count);
  }
</script>
```

**KettleJS:**
```typescript
const [count, setCount] = createSignal(0);

// Computed value
const doubled = createMemo(() => count() * 2);

// Effect
createEffect(() => {
  console.log('Count:', count());
});
```

### Components

**Svelte:**
```svelte
<script lang="ts">
  export let label: string;
  export let onClick: () => void;
</script>

<button on:click={onClick}>
  {label}
</button>
```

**KettleJS:**
```typescript
interface ButtonProps extends ComponentProps {
  label: string;
  onClick: () => void;
}

const Button: Component<ButtonProps> = (props) => {
  return html`
    <button @click=${props.onClick}>
      ${props.label}
    </button>
  `;
};
```

### Conditional Rendering

**Svelte:**
```svelte
{#if condition}
  <p>True</p>
{:else}
  <p>False</p>
{/if}
```

**KettleJS:**
```typescript
${Show({
  when: condition,
  fallback: html`<p>False</p>`,
  children: html`<p>True</p>`
})}
```

### List Rendering

**Svelte:**
```svelte
{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}
```

**KettleJS:**
```typescript
${For({
  each: items,
  children: (item) => html`<li>${item.name}</li>`
})}
```

## From Lit

Since KettleJS uses lit-html, migration is very smooth!

### Adding Reactivity

**Lit:**
```typescript
@customElement('my-counter')
class MyCounter extends LitElement {
  @property() count = 0;
  
  render() {
    return html`
      <button @click=${() => this.count++}>
        Count: ${this.count}
      </button>
    `;
  }
}
```

**KettleJS (WithSignals):**
```typescript
@customElement('my-counter')
class MyCounter extends WithSignals(LitElement) {
  private count = createSignal(0);
  
  render() {
    return html`
      <button @click=${() => this.count[1](this.count[0]() + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

**KettleJS (KettleElement):**
```typescript
@customElement('my-counter')
class MyCounter extends KettleElement {
  private [count, setCount] = createSignal(0);
  
  view() {
    return html`
      <button @click=${() => this.setCount(this.count() + 1)}>
        Count: ${this.count()}
      </button>
    `;
  }
}
```

### Gradual Migration

You can gradually adopt KettleJS in a Lit project:

```typescript
// Keep existing Lit components
@customElement('lit-component')
class LitComponent extends LitElement {
  // ... existing code
}

// Add new components with KettleElement
@customElement('kettle-component')
class KettleComponent extends KettleElement {
  // ... new reactive code
}

// Or enhance existing components
@customElement('enhanced-component')
class EnhancedComponent extends WithSignals(LitElement) {
  // Mix Lit properties with signals
  @property() litProp = '';
  private signal = createSignal(0);
}
```

## From Angular

### Concepts Mapping

| Angular | KettleJS | Notes |
|---------|----------|-------|
| Component | Component/KettleElement | Similar concept |
| Service | Context + Signals | Different approach |
| `@Input()` | Props | Functional approach |
| `@Output()` | Event callbacks | Use functions |
| Directives | Directives | Some overlap |
| Pipes | Functions/Memos | Use functions |
| RxJS | Signals + Effects | Simpler API |

### Components

**Angular:**
```typescript
@Component({
  selector: 'app-counter',
  template: `
    <button (click)="increment()">
      Count: {{ count }}
    </button>
  `
})
class CounterComponent {
  count = 0;
  
  increment() {
    this.count++;
  }
}
```

**KettleJS:**
```typescript
const Counter = () => {
  const [count, setCount] = createSignal(0);
  
  return html`
    <button @click=${() => setCount(count() + 1)}>
      Count: ${count()}
    </button>
  `;
};
```

### Services & Dependency Injection

**Angular:**
```typescript
@Injectable()
class DataService {
  getData() { /* ... */ }
}

@Component({...})
class MyComponent {
  constructor(private dataService: DataService) {}
}
```

**KettleJS:**
```typescript
const DataServiceContext = createContext<DataService>({
  getData: async () => {}
});

const DataServiceProvider = (props) => {
  const service = {
    getData: async () => { /* ... */ }
  };
  
  return Provider({
    context: DataServiceContext,
    value: service,
    children: props.children
  });
};

const MyComponent = () => {
  const dataService = useContext(DataServiceContext);
  // Use service
};
```

## General Migration Tips

### 1. Start Small

Don't rewrite everything at once. Start with new components or isolated parts.

### 2. Keep State Simple

Start with local component state, then move to context when needed.

### 3. Learn the Reactive Model

Spend time understanding signals, effects, and memos before diving deep.

### 4. Use TypeScript

KettleJS has excellent TypeScript support. Use it!

### 5. Follow the Patterns

Use control flow components (Show, For) instead of manual conditionals.

### 6. Test As You Go

Write tests for migrated components to ensure correctness.

### 7. Read the Docs

Review the [Complete Guide](./complete-guide.md) for comprehensive examples.

## Common Gotchas

### Forgetting to Call Signals

```typescript
// ❌ Wrong
console.log(count);

// ✅ Correct
console.log(count());
```

### Mutating Objects

```typescript
// ❌ Wrong
user().name = 'Alice';

// ✅ Correct
setUser({ ...user(), name: 'Alice' });
```

### Missing Dependencies

In KettleJS, dependencies are auto-tracked, so this isn't an issue!

```typescript
// No manual dependency arrays needed!
createEffect(() => {
  console.log(count()); // Automatically tracked
});
```

## Next Steps

After migrating:

1. Optimize with [Performance Guide](./performance.md)
2. Add routing with [Router Guide](./routing.md)
3. Review [Best Practices](./best-practices.md)
4. Join the [Discord Community](https://discord.gg/kettlejs)

## Getting Help

- [GitHub Discussions](https://github.com/adafri/kettlejs/discussions)
- [Discord](https://discord.gg/kettlejs)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/kettlejs)

Good luck with your migration! 🫖