# Store Proxy Reactivity in DOM Runtime

## Overview

The DOM runtime now fully supports reactivity with store proxies from `@fluixi/reactive/store`. This allows you to use store state directly in your templates and have the DOM automatically update when the store changes.

## Key Changes

### 1. Store Proxy Detection

The runtime now detects store proxies using the `$PROXY` symbol and the `isStoreProxy()` function:

```typescript
export function isStoreProxy(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  
  // Use the loaded function if available
  if (isStoreProxyFn) {
    return isStoreProxyFn(value);
  }
  
  // Fallback check using symbol
  if ($PROXY) {
    return $PROXY in value;
  }
  
  return false;
}
```

### 2. Reactive Tracking

Store proxies are now treated as reactive values alongside signal accessors. When you use a store proxy in:
- `insert()` - Dynamic content insertion
- `setDynamicAttribute()` - Dynamic attributes
- `setDynamicProperty()` - Dynamic properties
- `spread()` - Props spreading

The runtime automatically wraps them in effects to track changes.

### 3. Property Access Tracking

Store proxies track property access through their internal `get` trap. When you access a property:

```typescript
const value = storeProxy.someProperty;
```

The store's internal tracking system records this access. When that property changes, all effects that accessed it will re-run.

## Usage Examples

### Basic Store Usage

```typescript
import { createStore } from '@fluixi/reactive/store';
import { insert } from '@fluixi/dom/runtime';

// Create a store
const [state, setState] = createStore({
  count: 0,
  user: { name: 'John' }
});

// Insert reactive content - updates automatically when count changes
const parent = document.getElementById('app')!;
insert(parent, () => state.count);

// Update the store - DOM updates automatically
setState('count', c => c + 1);
```

### Array Store Reactivity

```typescript
const [todos, setTodos] = createStore([
  { id: 1, text: 'Learn stores', completed: false },
  { id: 2, text: 'Build app', completed: false }
]);

// Render list - each item is tracked independently
insert(parent, () => todos.map((todo, i) => {
  const div = document.createElement('div');
  div.textContent = `${todo.text} - ${todo.completed ? '✓' : '○'}`;
  return div;
}));

// Update specific item - only that item re-renders
setTodos(1, 'completed', true);

// Add new item - list updates
setTodos([...todos, { id: 3, text: 'Deploy', completed: false }]);
```

### Using Store Proxies with Attributes

```typescript
const [theme, setTheme] = createStore({
  bgColor: '#ffffff',
  textColor: '#000000',
  fontSize: '16px'
});

const element = document.createElement('div');

// Store proxy values are automatically reactive
setDynamicAttribute(element, 'data-theme', () => theme.bgColor);
setDynamicProperty(element, 'style', () => ({
  backgroundColor: theme.bgColor,
  color: theme.textColor,
  fontSize: theme.fontSize
}));

// Changes reflect immediately in DOM
setTheme('bgColor', '#000000');
setTheme('textColor', '#ffffff');
```

### Props Spreading with Store Proxies

```typescript
const [props, setProps] = createStore({
  className: 'button',
  disabled: false,
  title: 'Click me'
});

const button = document.createElement('button');

// Spread store proxy as props - each property is tracked
spread({
  element: button,
  props: props // Store proxy - properties are reactive
});

// Update individual props - only changed attributes update
setProps('disabled', true);
setProps('className', 'button button-disabled');
```

### Nested Store Properties

```typescript
const [state, setState] = createStore({
  user: {
    profile: {
      name: 'John',
      age: 30
    },
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
});

// Access nested properties - they're tracked independently
insert(parent, () => state.user.profile.name); // Tracked
insert(parent, () => state.user.settings.theme); // Tracked separately

// Update nested property - only dependent effects re-run
setState('user', 'profile', 'name', 'Jane'); // Only first insert updates
setState('user', 'settings', 'theme', 'light'); // Only second insert updates
```

## Important Considerations

### 1. Direct Property Access

Store proxies must be accessed within a reactive context (effect) to track dependencies:

```typescript
// ✅ CORRECT - Wrapped in effect (insert does this automatically)
insert(parent, () => state.count);

// ❌ INCORRECT - No tracking, won't update
insert(parent, state.count); // This is just the value at creation time
```

### 2. Array Mutations

Store arrays should be updated immutably:

```typescript
// ✅ CORRECT - Creates new array
setTodos([...todos, newTodo]);

// ❌ INCORRECT - Mutates store directly (may not trigger updates)
todos.push(newTodo);
```

### 3. Spread Operation

When spreading store proxies, the runtime creates effects for each property:

```typescript
const [props, setProps] = createStore({ a: 1, b: 2, c: 3 });

spread({
  element,
  props // Each property (a, b, c) gets its own effect
});

// Only properties that change will cause updates
setProps('a', 10); // Only updates attribute 'a'
```

### 4. Performance

Store proxies provide fine-grained reactivity:

- Each property access is tracked separately
- Only components that use changed properties re-render
- Nested object changes only affect dependent components

```typescript
const [state, setState] = createStore({
  pageA: { title: 'Page A', content: '...' },
  pageB: { title: 'Page B', content: '...' }
});

// These two inserts are completely independent
insert(parent1, () => state.pageA.title); // Only updates when pageA.title changes
insert(parent2, () => state.pageB.title); // Only updates when pageB.title changes

setState('pageA', 'title', 'New Title'); // Only parent1 updates
```

## Common Patterns

### Conditional Rendering

```typescript
const [state, setState] = createStore({
  isLoggedIn: false,
  username: ''
});

insert(parent, () => {
  if (state.isLoggedIn) {
    const div = document.createElement('div');
    div.textContent = `Welcome, ${state.username}!`;
    return div;
  } else {
    const div = document.createElement('div');
    div.textContent = 'Please log in';
    return div;
  }
});
```

### Form Binding

```typescript
const [form, setForm] = createStore({
  email: '',
  password: '',
  rememberMe: false
});

const emailInput = document.createElement('input');
emailInput.type = 'email';
setDynamicProperty(emailInput, 'value', () => form.email);
emailInput.addEventListener('input', (e) => {
  setForm('email', (e.target as HTMLInputElement).value);
});

const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
setDynamicProperty(checkbox, 'checked', () => form.rememberMe);
checkbox.addEventListener('change', (e) => {
  setForm('rememberMe', (e.target as HTMLInputElement).checked);
});
```

### Derived State

```typescript
const [state, setState] = createStore({
  items: [
    { id: 1, name: 'Item 1', price: 10 },
    { id: 2, name: 'Item 2', price: 20 }
  ]
});

// Computed total - recalculates when items change
insert(parent, () => {
  const total = state.items.reduce((sum, item) => sum + item.price, 0);
  const div = document.createElement('div');
  div.textContent = `Total: $${total}`;
  return div;
});
```

## Debugging Tips

### 1. Check if Value is a Store Proxy

```typescript
import { isStoreProxy } from '@fluixi/reactive/store';

console.log(isStoreProxy(state)); // true
console.log(isStoreProxy(state.count)); // false (primitive)
console.log(isStoreProxy(state.user)); // true (nested object)
```

### 2. Unwrap Store for Inspection

```typescript
import { unwrap } from '@fluixi/reactive/store';

const rawValue = unwrap(state);
console.log(rawValue); // Plain object without proxy
```

### 3. Track Signal Access

```typescript
import { createEffect } from '@fluixi/reactive/signal';

createEffect(() => {
  console.log('Effect running');
  console.log('Count:', state.count); // Logs whenever count changes
});
```

## Migration from Signal-Only Code

If you were using signals exclusively, migrating to stores is straightforward:

### Before (Signals)

```typescript
const [count, setCount] = createSignal(0);

insert(parent, count);
setCount(c => c + 1);
```

### After (Stores)

```typescript
const [state, setState] = createStore({ count: 0 });

insert(parent, () => state.count);
setState('count', c => c + 1);
```

### Why Use Stores?

- **Fine-grained updates**: Only changed properties trigger updates
- **Nested reactivity**: Deep object changes are tracked
- **Batch updates**: Multiple changes can be batched
- **Immutable API**: Predictable state updates
- **Array operations**: Built-in array helpers (push, pop, splice, etc.)

## Troubleshooting

### Store Changes Not Reflecting in DOM

**Problem**: You update the store but the DOM doesn't update.

**Solution**: Ensure you're accessing the store proxy within a reactive context:

```typescript
// ❌ WRONG - Accessing outside effect
const value = state.count;
insert(parent, value);

// ✅ CORRECT - Accessing inside effect
insert(parent, () => state.count);
```

### Array Override Issue

**Problem**: Setting an array property overrides the entire array instead of updating it.

**Solution**: Use immutable updates or array-specific methods:

```typescript
// ❌ WRONG - May cause issues
setState('items', state.items.concat(newItem));

// ✅ CORRECT - Use spread operator
setState('items', [...state.items, newItem]);

// ✅ CORRECT - Use store array methods
setState.push('items', newItem);
```

### Spread Modifying Store Values

**Problem**: The `spread()` function seems to modify store proxy values.

**Solution**: This was a bug in earlier versions. The current implementation properly handles store proxies without mutation. Ensure you're using the latest version.

```typescript
// Both patterns work correctly now
spread({ element, props: storeProxy }); // ✅ Correct
spread({ element, props: { ...storeProxy } }); // ✅ Also works
```

## Best Practices

1. **Use stores for complex state**: Multiple related values, nested objects, arrays
2. **Use signals for simple values**: Single primitive values, toggles
3. **Avoid mixing**: Don't mix signals and stores for the same logical state
4. **Immutable updates**: Always use immutable patterns when updating stores
5. **Batch updates**: Use `batch()` when making multiple related changes
6. **Fine-grained access**: Access only the properties you need in each effect

## API Reference

### Functions that Support Store Proxies

- `insert(parent, accessor, marker?, init?)` - Insert content reactively
- `setDynamicAttribute(element, name, accessor, isSVG?)` - Set reactive attribute
- `setDynamicProperty(element, name, accessor)` - Set reactive property
- `spread(options)` - Spread props reactively

All these functions now automatically detect store proxies and create appropriate reactive effects.

### Store Detection

- `isStoreProxy(value)` - Check if a value is a store proxy
- `$PROXY` - Symbol used to identify store proxies
- `$NODE` - Symbol used to access store node internals

## Further Reading

- [Store Documentation](../reactive/src/lib/store/README.md)
- [Signal Documentation](../reactive/src/lib/signal/README.md)
- [DOM Runtime API](./src/lib/dom/README.md)