---
sidebar_position: 1
---

# Control Flow

Fluixi provides powerful control flow components for conditional rendering, lists, dynamic components, and portals. These components are optimized for fine-grained reactivity and provide better performance than manual approaches.

## Show

The `Show` component conditionally renders content based on a condition.

### Basic Usage

```typescript
import { html } from 'lit';
import { Show } from '@fluixi/core/control-flow';
import { createSignal } from '@fluixi/reactive/signal';

const [isLoggedIn, setIsLoggedIn] = createSignal(false);

const template = html`
  <div>
    ${Show({
      when: () => isLoggedIn(),
      children: html`<div>Welcome back!</div>`,
      fallback: html`<div>Please log in</div>`
    })}
  </div>
`;
```

### API Reference

```typescript
function Show(props: {
  when: Accessor<any> | (() => any);
  children: TemplateResult | (() => TemplateResult);
  fallback?: TemplateResult | (() => TemplateResult);
}): TemplateResult
```

**Props:**
- `when` - Condition accessor or function. Truthy values render children
- `children` - Content to render when condition is truthy
- `fallback` - Optional content to render when condition is falsy

### With Fallback

```typescript
const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');

html`
  ${Show({
    when: () => status() === 'success',
    children: html`<div class="success">Data loaded!</div>`,
    fallback: html`<div class="loading">Loading...</div>`
  })}
`;
```

### Function Children

Children can be functions for lazy evaluation:

```typescript
const [show, setShow] = createSignal(false);

html`
  ${Show({
    when: show,
    children: () => {
      console.log('Only executes when show is true');
      return html`<expensive-component></expensive-component>`;
    }
  })}
`;
```

### Nested Show

```typescript
html`
  ${Show({
    when: () => user(),
    children: html`
      <div>
        <h2>Welcome ${user()?.name}</h2>
        ${Show({
          when: () => user()?.isAdmin,
          children: html`<admin-panel></admin-panel>`
        })}
      </div>
    `
  })}
`;
```

## For

The `For` component efficiently renders lists with keyed reconciliation.

### Basic Usage

```typescript
import { For } from '@fluixi/core/control-flow';
import { createSignal } from '@fluixi/reactive/signal';

const [items, setItems] = createSignal([
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Orange' }
]);

html`
  <ul>
    ${For({
      each: items,
      children: (item, index) => html`
        <li key=${item.id}>
          ${index() + 1}. ${item.name}
        </li>
      `
    })}
  </ul>
`;
```

### API Reference

```typescript
function For<T>(props: {
  each: Accessor<T[]> | T[];
  children: (item: T, index: Accessor<number>) => TemplateResult;
  fallback?: TemplateResult;
}): TemplateResult
```

**Props:**
- `each` - Array accessor or array of items to iterate
- `children` - Function that renders each item. Receives item and index accessor
- `fallback` - Optional content to render when array is empty

### With Index

The index is reactive and updates if items are reordered:

```typescript
const [todos, setTodos] = createSignal([
  { id: 1, text: 'Task 1', done: false },
  { id: 2, text: 'Task 2', done: true }
]);

html`
  <ul>
    ${For({
      each: todos,
      children: (todo, index) => html`
        <li>
          <span>${index() + 1}.</span>
          <input 
            type="checkbox" 
            .checked=${todo.done}
            @change=${() => toggleTodo(todo.id)}
          />
          <span style="${todo.done ? 'text-decoration: line-through' : ''}">
            ${todo.text}
          </span>
        </li>
      `
    })}
  </ul>
`;
```

### Empty State

```typescript
html`
  ${For({
    each: () => items(),
    children: (item) => html`<div>${item.name}</div>`,
    fallback: html`<div class="empty">No items found</div>`
  })}
`;
```

### Complex Items

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

const [users, setUsers] = createSignal<User[]>([]);

html`
  <div class="user-list">
    ${For({
      each: users,
      children: (user) => html`
        <div class="user-card">
          <img src=${user.avatar} alt=${user.name} />
          <h3>${user.name}</h3>
          <p>${user.email}</p>
          <button @click=${() => selectUser(user.id)}>
            Select
          </button>
        </div>
      `
    })}
  </div>
`;
```

### Nested For

```typescript
const [categories, setCategories] = createSignal([
  {
    id: 1,
    name: 'Fruits',
    items: ['Apple', 'Banana', 'Orange']
  },
  {
    id: 2,
    name: 'Vegetables',
    items: ['Carrot', 'Broccoli', 'Spinach']
  }
]);

html`
  ${For({
    each: categories,
    children: (category) => html`
      <div class="category">
        <h3>${category.name}</h3>
        <ul>
          ${For({
            each: () => category.items,
            children: (item) => html`<li>${item}</li>`
          })}
        </ul>
      </div>
    `
  })}
`;
```

## Dynamic

The `Dynamic` component renders different components based on a signal.

### Basic Usage

```typescript
import { Dynamic } from '@fluixi/core/control-flow';
import { createSignal } from '@fluixi/reactive/signal';

const [view, setView] = createSignal('home');

const views = {
  home: HomeView,
  about: AboutView,
  contact: ContactView
};

html`
  <div>
    ${Dynamic({
      component: () => views[view()],
      props: { userId: 123 }
    })}
  </div>
`;
```

### API Reference

```typescript
function Dynamic<T = any>(props: {
  component: Accessor<Component<T>> | Component<T>;
  props?: T;
}): TemplateResult
```

**Props:**
- `component` - Component accessor or component to render
- `props` - Props to pass to the component

### Switching Components

```typescript
const [currentTab, setCurrentTab] = createSignal<'profile' | 'settings' | 'notifications'>('profile');

const tabs = {
  profile: ProfileTab,
  settings: SettingsTab,
  notifications: NotificationsTab
};

html`
  <div class="tabs">
    <button @click=${() => setCurrentTab('profile')}>Profile</button>
    <button @click=${() => setCurrentTab('settings')}>Settings</button>
    <button @click=${() => setCurrentTab('notifications')}>Notifications</button>
  </div>

  <div class="tab-content">
    ${Dynamic({
      component: () => tabs[currentTab()],
      props: { userId: currentUser().id }
    })}
  </div>
`;
```

### With Props

```typescript
interface TabProps {
  userId: number;
  onClose: () => void;
}

const [activeTab, setActiveTab] = createSignal<Component<TabProps>>(ProfileTab);

html`
  ${Dynamic({
    component: activeTab,
    props: {
      userId: 123,
      onClose: () => setActiveTab(null)
    }
  })}
`;
```

## Portal

The `Portal` component renders content into a different DOM location.

### Basic Usage

```typescript
import { Portal } from '@fluixi/core/control-flow';
import { createSignal } from '@fluixi/reactive/signal';

const [showModal, setShowModal] = createSignal(false);

html`
  <div class="page">
    <button @click=${() => setShowModal(true)}>
      Open Modal
    </button>

    ${Portal({
      target: () => document.body,
      children: html`
        <div class="modal-overlay" ?hidden=${!showModal()}>
          <div class="modal">
            <h2>Modal Title</h2>
            <p>Modal content</p>
            <button @click=${() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      `
    })}
  </div>
`;
```

### API Reference

```typescript
function Portal(props: {
  target?: Accessor<HTMLElement> | HTMLElement;
  children: TemplateResult;
}): TemplateResult
```

**Props:**
- `target` - Target element accessor or element. Defaults to `document.body`
- `children` - Content to render in the portal

### Modal Example

```typescript
const [isOpen, setIsOpen] = createSignal(false);

const Modal = (props: { title: string; children: any }) => {
  return Portal({
    children: html`
      <div class="modal-backdrop" @click=${() => setIsOpen(false)}>
        <div class="modal-dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h3>${props.title}</h3>
            <button @click=${() => setIsOpen(false)}>×</button>
          </div>
          <div class="modal-body">
            ${props.children}
          </div>
        </div>
      </div>
    `
  });
};

html`
  <button @click=${() => setIsOpen(true)}>Open</button>
  ${Show({
    when: isOpen,
    children: () => Modal({
      title: 'Confirm Action',
      children: html`<p>Are you sure?</p>`
    })
  })}
`;
```

### Tooltip Portal

```typescript
const [tooltipTarget, setTooltipTarget] = createSignal<HTMLElement | null>(null);
const [tooltipText, setTooltipText] = createSignal('');

function showTooltip(e: MouseEvent, text: string) {
  setTooltipTarget(e.target as HTMLElement);
  setTooltipText(text);
}

function hideTooltip() {
  setTooltipTarget(null);
}

html`
  <button 
    @mouseenter=${(e: MouseEvent) => showTooltip(e, 'Click to submit')}
    @mouseleave=${hideTooltip}
  >
    Submit
  </button>

  ${Show({
    when: tooltipTarget,
    children: () => Portal({
      children: html`
        <div class="tooltip" style="
          position: absolute;
          top: ${tooltipTarget()!.getBoundingClientRect().bottom + 5}px;
          left: ${tooltipTarget()!.getBoundingClientRect().left}px;
        ">
          ${tooltipText()}
        </div>
      `
    })
  })}
`;
```

## Switch/Match Pattern

While Fluixi doesn't have built-in Switch/Match components, you can implement the pattern easily:

### Manual Switch

```typescript
const [status, setStatus] = createSignal<'idle' | 'loading' | 'success' | 'error'>('idle');

function renderStatus() {
  switch (status()) {
    case 'idle':
      return html`<div>Ready to load</div>`;
    case 'loading':
      return html`<div>Loading...</div>`;
    case 'success':
      return html`<div>Success!</div>`;
    case 'error':
      return html`<div>Error occurred</div>`;
  }
}

html`<div>${renderStatus()}</div>`;
```

### Match with Show

```typescript
const Match = (props: { when: boolean; children: any }) => {
  return props.when ? props.children : nothing;
};

html`
  <div>
    ${Match({ when: status() === 'loading', children: html`<spinner></spinner>` })}
    ${Match({ when: status() === 'success', children: html`<success-message></success-message>` })}
    ${Match({ when: status() === 'error', children: html`<error-message></error-message>` })}
  </div>
`;
```

## Performance Comparisons

### For vs Array.map()

```typescript
// ✅ Efficient - keyed reconciliation
${For({
  each: items,
  children: (item) => html`<div>${item.name}</div>`
})}

// ❌ Less efficient - recreates all items
${items().map(item => html`<div>${item.name}</div>`)}
```

### Show vs Ternary

```typescript
// ✅ Efficient - only evaluates needed branch
${Show({
  when: condition,
  children: () => expensiveComponent(),
  fallback: () => cheapComponent()
})}

// ❌ Less efficient - evaluates both branches
${condition() ? expensiveComponent() : cheapComponent()}
```

## Best Practices

### 1. Use For for Lists

Always use `For` instead of `.map()` for better performance:

```typescript
// ✅ Good
For({ each: items, children: (item) => renderItem(item) })

// ❌ Avoid
items().map(item => renderItem(item))
```

### 2. Function Children for Expensive Operations

Use function children to defer expensive computations:

```typescript
// ✅ Good - only computes when shown
Show({
  when: visible,
  children: () => expensiveComponent()
})

// ❌ Avoid - always computes
Show({
  when: visible,
  children: expensiveComponent()
})
```

### 3. Memoize Complex Conditions

```typescript
// ✅ Good
const shouldShow = createMemo(() => 
  user() && user().isAdmin && user().hasPermission('view')
);

Show({ when: shouldShow, children: html`...` })

// ❌ Avoid - recalculates every time
Show({ 
  when: () => user() && user().isAdmin && user().hasPermission('view'),
  children: html`...`
})
```

### 4. Key Items in For

Always ensure items have unique, stable keys:

```typescript
// ✅ Good - stable ID
interface Item { id: number; name: string; }

// ❌ Avoid - index as key (unstable)
items.map((item, i) => ({ ...item, key: i }))
```

### 5. Portal Cleanup

Portals automatically clean up when unmounted, but be mindful of event listeners:

```typescript
// ✅ Good - cleanup on unmount
createEffect(() => {
  if (showModal()) {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
});
```

## Common Patterns

### Loading States

```typescript
const [data, setData] = createSignal(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal(null);

html`
  ${Show({
    when: loading,
    children: html`<div>Loading...</div>`,
    fallback: () => Show({
      when: error,
      children: html`<div>Error: ${error()?.message}</div>`,
      fallback: () => Show({
        when: data,
        children: html`<div>${data()?.content}</div>`,
        fallback: html`<div>No data</div>`
      })
    })
  })}
`;
```

### Conditional Wrapper

```typescript
const ConditionalWrap = (props: {
  condition: boolean;
  wrapper: (children: any) => any;
  children: any;
}) => {
  return props.condition ? props.wrapper(props.children) : props.children;
};

html`
  ${ConditionalWrap({
    condition: isLink(),
    wrapper: (children) => html`<a href=${url()}>${children}</a>`,
    children: html`<span>${text()}</span>`
  })}
`;
```

### Paginated List

```typescript
const [page, setPage] = createSignal(0);
const [itemsPerPage] = createSignal(10);

const paginatedItems = createMemo(() => {
  const start = page() * itemsPerPage();
  const end = start + itemsPerPage();
  return allItems().slice(start, end);
});

html`
  <div>
    ${For({
      each: paginatedItems,
      children: (item) => html`<div>${item.name}</div>`
    })}
    
    <div class="pagination">
      <button @click=${() => setPage(p => Math.max(0, p - 1))}>
        Previous
      </button>
      <span>Page ${page() + 1}</span>
      <button @click=${() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  </div>
`;
```

## See Also

- [Resources](./resources.md) - Async data management
- [Core Concepts](../core-concepts.md) - Understanding reactivity
- [API Reference](../api/control-flow.md) - Complete API docs

---

**Next:** [Resources →](./resources.md)