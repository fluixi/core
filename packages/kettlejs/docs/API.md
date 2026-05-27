# KettleJS API Documentation

Complete API reference for KettleJS framework v0.0.1

## Table of Contents

- [Core API](#core-api)
- [Reactive Primitives](#reactive-primitives)
- [Control Flow Components](#control-flow-components)
- [Context API](#context-api)
- [Resources](#resources)
- [Router](#router)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Utilities](#utilities)

---

## Core API

### `render(component, container)`

Renders a component into a DOM container with reactive updates.

**Parameters:**
- `component: Component | (() => TemplateResult)` - Component or function to render
- `container: HTMLElement` - DOM element to render into

**Returns:** `() => void` - Cleanup function to dispose the component

**Example:**
```typescript
import { render, html } from '@awc/kettlejs';

const App = () => html`<div>Hello World</div>`;
const dispose = render(App, document.getElementById('app')!);

// Later, to unmount:
dispose();
```

---

### `createComponent<P>(fn)`

Creates a component with lifecycle management.

**Parameters:**
- `fn: Component<P>` - Component function

**Returns:** `Component<P>` - Enhanced component with lifecycle management

**Example:**
```typescript
import { createComponent, html, createSignal } from '@awc/kettlejs';

const Counter = createComponent<{ initialCount: number }>((props) => {
  const [count, setCount] = createSignal(props.initialCount);

  return html`
    <div>
      <p>Count: ${count()}</p>
      <button @click=${() => setCount(count() + 1)}>Increment</button>
    </div>
  `;
});
```

---

### `createRoot(fn, container)`

Creates a root rendering context for the application.

**Parameters:**
- `fn: (dispose: () => void) => TemplateResult` - Root function
- `container: HTMLElement` - Container element

**Returns:** `() => void` - Dispose function

**Example:**
```typescript
import { createRoot, html } from '@awc/kettlejs';

const dispose = createRoot((dispose) => {
  return html`<div>${App()}</div>`;
}, document.getElementById('root')!);
```

---

## Reactive Primitives

### `createSignal<T>(initialValue, options?)`

Creates a reactive signal (reactive state).

**Parameters:**
- `initialValue: T` - Initial value
- `options?: SignalOptions<T>` - Configuration options
  - `equals?: (prev: T, next: T) => boolean` - Custom equality check
  - `name?: string` - Name for debugging

**Returns:** `[Accessor<T>, Setter<T>]` - Getter and setter tuple

**Example:**
```typescript
import { createSignal } from '@awc/kettlejs';

const [count, setCount] = createSignal(0);
const [user, setUser] = createSignal<User | null>(null);

console.log(count()); // 0
setCount(5);
console.log(count()); // 5

// Update with function
setCount(prev => prev + 1);
```

---

### `createEffect(fn)`

Creates a side effect that runs when dependencies change.

**Parameters:**
- `fn: () => void` - Effect function that tracks reactive dependencies

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
import { createSignal, createEffect } from '@awc/kettlejs';

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log('Count changed:', count());
});

setCount(1); // Logs: "Count changed: 1"
```

---

### `createMemo<T>(fn)`

Creates derived reactive state (computed value).

**Parameters:**
- `fn: () => T` - Function to compute the value

**Returns:** `() => T` - Accessor for the computed value

**Example:**
```typescript
import { createSignal, createMemo } from '@awc/kettlejs';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

const fullName = createMemo(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
setFirstName('Jane');
console.log(fullName()); // "Jane Doe"
```

---

### `batch(fn)`

Batches multiple signal updates together.

**Parameters:**
- `fn: () => T` - Function containing updates to batch

**Returns:** `T` - Return value from the function

**Example:**
```typescript
import { createSignal, batch } from '@awc/kettlejs';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

batch(() => {
  setFirstName('Jane');
  setLastName('Smith');
}); // UI updates only once
```

---

### `untrack(fn)`

Runs a function without tracking dependencies.

**Parameters:**
- `fn: () => T` - Function to run untracked

**Returns:** `T` - Return value from the function

**Example:**
```typescript
import { createSignal, createEffect, untrack } from '@awc/kettlejs';

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log('Tracked:', count());
  
  // This won't cause the effect to re-run
  const untracked = untrack(() => count());
  console.log('Untracked:', untracked);
});
```

---

## Control Flow Components

### `Show({ when, fallback?, children })`

Conditional rendering component.

**Props:**
- `when: T | Accessor<T>` - Condition to evaluate
- `fallback?: ComponentChild | (() => ComponentChild)` - Content when falsy
- `children: ComponentChild | ((value: NonNullable<T>) => ComponentChild)` - Content when truthy

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { Show, createSignal, html } from '@awc/kettlejs';

const MyComponent = () => {
  const [user, setUser] = createSignal<User | null>(null);

  return html`
    ${Show({
      when: user,
      fallback: html`<p>Loading...</p>`,
      children: (u) => html`<p>Hello, ${u.name}!</p>`
    })}
  `;
};
```

---

### `For({ each, fallback?, children })`

List rendering component with keyed reconciliation.

**Props:**
- `each: T[] | Accessor<T[]>` - Array to iterate over
- `fallback?: ComponentChild` - Content when array is empty
- `children: (item: T, index: number) => U` - Render function for each item

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { For, createSignal, html } from '@awc/kettlejs';

const TodoList = () => {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn KettleJS' },
    { id: 2, text: 'Build an app' }
  ]);

  return html`
    <ul>
      ${For({
        each: todos,
        children: (todo, index) => html`<li>${todo.text}</li>`
      })}
    </ul>
  `;
};
```

---

### `Index({ each, fallback?, children })`

Non-keyed list rendering with reactive items.

**Props:**
- `each: T[] | Accessor<T[]>` - Array to iterate over
- `fallback?: ComponentChild` - Content when array is empty
- `children: (item: Accessor<T>, index: number) => U` - Render function

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { Index, createSignal, html } from '@awc/kettlejs';

const CounterList = () => {
  const [counts, setCounts] = createSignal([0, 0, 0]);

  return html`
    ${Index({
      each: counts,
      children: (count, index) => html`
        <div>Count ${index}: ${count()}</div>
      `
    })}
  `;
};
```

---

### `Switch({ fallback?, children })`

Multiple condition branches (like switch statement).

**Props:**
- `fallback?: ComponentChild` - Default content when no match
- `children: Array<ReturnType<typeof Match>>` - Match components

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { Switch, Match, createSignal, html } from '@awc/kettlejs';

const StatusView = () => {
  const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');

  return html`
    ${Switch({
      children: [
        Match({ when: () => status() === 'loading', children: html`<p>Loading...</p>` }),
        Match({ when: () => status() === 'success', children: html`<p>Success!</p>` }),
        Match({ when: () => status() === 'error', children: html`<p>Error!</p>` })
      ]
    })}
  `;
};
```

---

### `Portal({ mount?, useShadow?, ref?, children })`

Renders content outside the component hierarchy.

**Props:**
- `mount?: HTMLElement | string | Accessor<...>` - Target element (default: document.body)
- `useShadow?: boolean` - Use shadow DOM (default: false)
- `ref?: (element: HTMLElement | null) => void` - Reference callback
- `children: ComponentChild | (() => ComponentChild)` - Content to portal

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { Portal, Show, createSignal, html } from '@awc/kettlejs';

const Modal = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return html`
    <button @click=${() => setIsOpen(true)}>Open Modal</button>
    ${Show({
      when: isOpen,
      children: Portal({
        children: html`
          <div class="modal-overlay">
            <div class="modal">
              <button @click=${() => setIsOpen(false)}>Close</button>
            </div>
          </div>
        `
      })
    })}
  `;
};
```

---

### `Dynamic({ component, props?, children? })`

Renders components dynamically.

**Props:**
- `component: Component | string | Accessor<...>` - Component to render
- `props?: P` - Props to pass
- `children?: ComponentChild` - Children to pass

**Returns:** `TemplateResult | typeof nothing`

**Example:**
```typescript
import { Dynamic, createSignal, html } from '@awc/kettlejs';

const MyComponent = () => {
  const [viewMode, setViewMode] = createSignal<'list' | 'grid'>('list');

  const ListView = () => html`<div>List View</div>`;
  const GridView = () => html`<div>Grid View</div>`;

  return html`
    ${Dynamic({
      component: () => viewMode() === 'list' ? ListView : GridView
    })}
  `;
};
```

---

## Context API

### `createContext<T>(defaultValue, name?)`

Creates a context for sharing state.

**Parameters:**
- `defaultValue: T` - Default value
- `name?: string` - Name for debugging

**Returns:** `Context<T>`

**Example:**
```typescript
import { createContext } from '@awc/kettlejs';

interface Theme {
  primaryColor: string;
}

const ThemeContext = createContext<Theme>(
  { primaryColor: '#007bff' },
  'ThemeContext'
);
```

---

### `useContext<T>(context)`

Retrieves the value of a context.

**Parameters:**
- `context: Context<T>` - Context to read from

**Returns:** `T` - Current context value

**Example:**
```typescript
import { createContext, useContext, html } from '@awc/kettlejs';

const ThemeContext = createContext({ primaryColor: '#007bff' });

const ThemedButton = () => {
  const theme = useContext(ThemeContext);
  return html`<button style="color: ${theme.primaryColor}">Click</button>`;
};
```

---

### `Provider({ context, value, children })`

Provides a context value to descendants.

**Props:**
- `context: Context<T>` - Context to provide
- `value: T | Accessor<T>` - Value to provide
- `children: TemplateResult` - Children components

**Returns:** `TemplateResult`

**Example:**
```typescript
import { createContext, Provider, html } from '@awc/kettlejs';

const ThemeContext = createContext({ primaryColor: '#007bff' });

const App = () => {
  const theme = { primaryColor: '#28a745' };

  return Provider({
    context: ThemeContext,
    value: theme,
    children: html`<div><ThemedButton /></div>`
  });
};
```

---

## Resources

### `createResource<T, S>(source, fetcher, options?)`

Creates a resource for async data fetching.

**Parameters:**
- `source: ResourceSource<S>` - Source value or accessor
- `fetcher: ResourceFetcher<T, S>` - Function to fetch data
- `options?: ResourceOptions<T, S>` - Configuration options
  - `initialValue?: T` - Initial value
  - `onSuccess?: (data: T) => void` - Success callback
  - `onError?: (error: Error) => void` - Error callback
  - `fetchOnMount?: boolean` - Fetch immediately (default: true)

**Returns:** `[Resource<T>, { mutate, refetch }]`

**Resource Properties:**
- `state: ResourceState` - Current state ('unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored')
- `loading: boolean` - Whether currently loading
- `error: Error | undefined` - Current error
- `latest: T | undefined` - Latest loaded value
- `(): T | undefined` - Get current value

**Example:**
```typescript
import { createResource, html } from '@awc/kettlejs';

interface User {
  id: number;
  name: string;
}

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

const UserDetail = () => {
  const [userId, setUserId] = createSignal(1);
  const [user, { refetch, mutate }] = createResource(
    () => userId(),
    fetchUser,
    {
      onError: (error) => console.error('Failed to load user:', error)
    }
  );

  return html`
    <div>
      ${user.loading ? html`<p>Loading...</p>` : ''}
      ${user.error ? html`<p>Error: ${user.error.message}</p>` : ''}
      ${user() ? html`<p>Name: ${user()!.name}</p>` : ''}
      <button @click=${refetch}>Refresh</button>
    </div>
  `;
};
```

---

### `createLazyResource<T, S>(source, fetcher, options?)`

Creates a lazy resource that doesn't fetch until explicitly called.

**Parameters:**
- Same as `createResource`

**Returns:** `[Resource<T>, { fetch, mutate, refetch }]`

**Example:**
```typescript
import { createLazyResource, html } from '@awc/kettlejs';

const UserDetail = () => {
  const [userData, { fetch: fetchUser }] = createLazyResource(
    () => userId(),
    async (id) => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    }
  );

  return html`
    <button @click=${fetchUser}>Load User</button>
    ${userData() ? html`<p>${userData()!.name}</p>` : ''}
  `;
};
```

---

## Router

### `createRouter(routes, options?)`

Creates a router instance.

**Parameters:**
- `routes: RouteDefinition[]` - Array of route definitions
- `options?: RouterOptions` - Configuration options
  - `base?: string` - Base path (default: '')
  - `hash?: boolean` - Hash routing mode (default: false)
  - `scrollBehavior?: 'auto' | 'smooth' | 'none'` - Scroll behavior

**Returns:** `RouterContextValue`

**Example:**
```typescript
import { createRouter } from '@awc/kettlejs';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserDetail }
];

const router = createRouter(routes, { base: '/app' });
```

---

### `Router({ router, children })`

Router provider component.

**Props:**
- `router: RouterContextValue` - Router instance
- `children: TemplateResult` - Children components

**Returns:** `TemplateResult`

**Example:**
```typescript
import { createRouter, Router, html } from '@awc/kettlejs';

const App = () => {
  const router = createRouter([...routes]);

  return Router({
    router,
    children: html`
      <nav>...</nav>
      <main id="content"></main>
    `
  });
};
```

---

### `Link({ href, replace?, activeClass?, children })`

Navigation link component.

**Props:**
- `href: string` - Navigation target
- `replace?: boolean` - Replace history entry (default: false)
- `activeClass?: string` - CSS class when active
- `children: any` - Link content

**Returns:** `TemplateResult`

**Example:**
```typescript
import { Link, html } from '@awc/kettlejs';

const Nav = () => html`
  <nav>
    ${Link({ href: '/', children: 'Home', activeClass: 'active' })}
    ${Link({ href: '/about', children: 'About' })}
  </nav>
`;
```

---

### `useRouter()`

Accesses the router from context.

**Returns:** `RouterContextValue`

**Example:**
```typescript
import { useRouter } from '@awc/kettlejs';

const MyComponent = () => {
  const router = useRouter();
  
  const handleClick = () => {
    router.navigate('/about');
  };
};
```

---

### `useLocation()`

Accesses the current location.

**Returns:** `Accessor<Location>`

**Example:**
```typescript
import { useLocation, html } from '@awc/kettlejs';

const MyComponent = () => {
  const location = useLocation();
  
  return html`<p>Current path: ${location().pathname}</p>`;
};
```

---

### `useNavigate()`

Gets the navigation function.

**Returns:** `(to: string, options?: NavigateOptions) => void`

**Example:**
```typescript
import { useNavigate } from '@awc/kettlejs';

const MyComponent = () => {
  const navigate = useNavigate();
  
  const goToUser = (id: number) => {
    navigate(`/users/${id}`);
  };
};
```

---

### `useParams()`

Gets route parameters.

**Returns:** `RouteParams`

**Example:**
```typescript
import { useParams, html } from '@awc/kettlejs';

// For route '/users/:id'
const UserDetail = () => {
  const params = useParams();
  return html`<p>User ID: ${params.id}</p>`;
};
```

---

### `useQuery()`

Gets query parameters.

**Returns:** `QueryParams`

**Example:**
```typescript
import { useQuery, html } from '@awc/kettlejs';

// For URL '/search?q=test&page=2'
const SearchResults = () => {
  const query = useQuery();
  return html`
    <p>Search: ${query.q}</p>
    <p>Page: ${query.page}</p>
  `;
};
```

---

## Lifecycle Hooks

### `onMount(callback)`

Runs after the component mounts.

**Parameters:**
- `callback: LifecycleCallback` - Function to run on mount

**Returns:** `void`

**Example:**
```typescript
import { onMount, createSignal, html } from '@awc/kettlejs';

const MyComponent = () => {
  onMount(() => {
    console.log('Component mounted');
    
    // Optional cleanup
    return () => console.log('Component unmounting');
  });

  return html`<div>Hello</div>`;
};
```

---

### `onUnmount(callback)`

Runs before the component unmounts.

**Parameters:**
- `callback: () => void` - Function to run on unmount

**Returns:** `void`

**Example:**
```typescript
import { onUnmount, createSignal, html } from '@awc/kettlejs';

const MyComponent = () => {
  const timer = setInterval(() => console.log('tick'), 1000);

  onUnmount(() => {
    clearInterval(timer);
  });

  return html`<div>Timer running</div>`;
};
```

---

### `onCleanup(callback)`

Registers a cleanup function (from @awc/reactive).

**Parameters:**
- `callback: () => void` - Cleanup function

**Returns:** `void`

**Example:**
```typescript
import { createEffect, onCleanup } from '@awc/kettlejs';

createEffect(() => {
  const subscription = observable.subscribe(...);
  
  onCleanup(() => {
    subscription.unsubscribe();
  });
});
```

---

## Utilities

### `mergeProps(...props)`

Merges multiple prop objects.

**Parameters:**
- `...props: Partial<P>[]` - Props to merge

**Returns:** `P` - Merged props

**Example:**
```typescript
import { mergeProps, html } from '@awc/kettlejs';

const Button = (props: { label?: string; onClick?: () => void }) => {
  const merged = mergeProps({ label: 'Click me' }, props);
  return html`<button @click=${merged.onClick}>${merged.label}</button>`;
};
```

---

### `splitProps(props, ...keys)`

Splits props into multiple groups.

**Parameters:**
- `props: P` - Props to split
- `...keys: string[][]` - Arrays of keys for each group

**Returns:** `any[]` - Array of prop objects

**Example:**
```typescript
import { splitProps } from '@awc/kettlejs';

const MyComponent = (props: { a: number; b: string; c: boolean }) => {
  const [group1, group2, rest] = splitProps(props, ['a', 'b'], ['c']);
  // group1 = { a, b }, group2 = { c }, rest = {}
};
```

---

### `getOwner()`

Gets the owner (parent context) of the current component.

**Returns:** `ComponentContext | null`

---

### `runWithOwner(owner, fn)`

Runs a function in the context of a specific owner.

**Parameters:**
- `owner: ComponentContext | null` - Owner context
- `fn: () => T` - Function to execute

**Returns:** `T` - Return value

---

## Type Definitions

### `Component<P extends ComponentProps>`

```typescript
type Component<P extends ComponentProps = ComponentProps> = (props: P) => TemplateResult | null;
```

### `ComponentProps`

```typescript
interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
  [key: string]: any;
}
```

### `Accessor<T>`

```typescript
type Accessor<T> = () => T;
```

### `Setter<T>`

```typescript
type Setter<T> = (value: T | ((prev: T) => T)) => void;
```

### `Signal<T>`

```typescript
type Signal<T> = [Accessor<T>, Setter<T>];
```

---

## Best Practices

### 1. Signal Naming
```typescript
// ✅ Good
const [count, setCount] = createSignal(0);
const [user, setUser] = createSignal<User | null>(null);

// ❌ Avoid
const [count, updateCount] = createSignal(0);
const [user, changeUser] = createSignal<User | null>(null);
```

### 2. Memos for Expensive Computations
```typescript
// ✅ Use memo for derived state
const filteredItems = createMemo(() => 
  items().filter(item => item.active)
);

// ❌ Don't compute in render
const filteredItems = () => items().filter(item => item.active);
```

### 3. Batch Updates
```typescript
// ✅ Batch related updates
batch(() => {
  setFirstName('Jane');
  setLastName('Smith');
  setAge(30);
});

// ❌ Multiple separate updates
setFirstName('Jane');
setLastName('Smith');
setAge(30);
```

### 4. Cleanup Resources
```typescript
// ✅ Always cleanup
onMount(() => {
  const interval = setInterval(() => {...}, 1000);
  return () => clearInterval(interval);
});

// ❌ Memory leaks
onMount(() => {
  setInterval(() => {...}, 1000);
});
```

---

For more examples and guides, see the [full documentation](https://github.com/your-org/kettlejs/docs).