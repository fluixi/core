---
sidebar_position: 2
title: Effects
---

# Effects

Effects are a core reactive primitive in KettleJS that allow you to run side effects in response to signal changes. They automatically track dependencies and re-run when those dependencies change.

## What is an Effect?

An effect is a function that runs automatically when any signal it reads changes. Effects are perfect for:

- Logging and debugging
- Synchronizing with external systems (localStorage, APIs, etc.)
- DOM manipulation outside the template
- Analytics and tracking
- Side effects triggered by state changes

```typescript
import { createSignal, createEffect } from '@fluixi/reactive';

const [count, setCount] = createSignal(0);

// Effect automatically runs when count changes
createEffect(() => {
  console.log('Count changed to:', count());
});

setCount(1); // Logs: "Count changed to: 1"
setCount(2); // Logs: "Count changed to: 2"
```

## Creating Effects

### Basic Effect

```typescript
import { createEffect, createSignal } from '@fluixi/reactive';

const [name, setName] = createSignal('Alice');

createEffect(() => {
  console.log('Hello,', name());
});

setName('Bob'); // Logs: "Hello, Bob"
```

### Effect with Multiple Dependencies

Effects track all signals read during execution:

```typescript
const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

createEffect(() => {
  console.log('Full name:', firstName(), lastName());
});

setFirstName('Jane'); // Logs: "Full name: Jane Doe"
setLastName('Smith'); // Logs: "Full name: Jane Smith"
```

### Effect with Cleanup

Return a cleanup function to run before the next effect or on disposal:

```typescript
const [userId, setUserId] = createSignal(1);

createEffect(() => {
  const id = userId();
  
  // Subscribe to user updates
  const unsubscribe = subscribeToUser(id, (user) => {
    console.log('User updated:', user);
  });

  // Cleanup function
  return () => {
    unsubscribe();
    console.log('Unsubscribed from user:', id);
  };
});
```

## Effect Lifecycle

### Initial Run

Effects run immediately when created:

```typescript
const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log('Effect runs immediately:', count());
});
// Immediately logs: "Effect runs immediately: 0"

setCount(1); // Logs: "Effect runs immediately: 1"
```

### Re-runs on Changes

Effects re-run whenever any tracked signal changes:

```typescript
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  console.log('Sum:', a() + b());
});
// Logs: "Sum: 3"

setA(5); // Logs: "Sum: 7"
setB(3); // Logs: "Sum: 8"
```

### Cleanup Sequence

When an effect re-runs, cleanup happens first:

```typescript
const [value, setValue] = createSignal(0);

createEffect(() => {
  console.log('Effect:', value());
  
  return () => {
    console.log('Cleanup:', value());
  };
});

// Logs:
// "Effect: 0"

setValue(1);
// Logs:
// "Cleanup: 0"  (cleanup from previous run)
// "Effect: 1"    (new effect run)

setValue(2);
// Logs:
// "Cleanup: 1"
// "Effect: 2"
```

## Common Use Cases

### LocalStorage Sync

```typescript
const [theme, setTheme] = createSignal(
  localStorage.getItem('theme') || 'light'
);

createEffect(() => {
  localStorage.setItem('theme', theme());
});

setTheme('dark'); // Automatically saved to localStorage
```

### API Polling

```typescript
const [data, setData] = createSignal(null);
const [intervalMs, setIntervalMs] = createSignal(5000);

createEffect(() => {
  const ms = intervalMs();
  
  const interval = setInterval(async () => {
    const result = await fetchData();
    setData(result);
  }, ms);

  return () => clearInterval(interval);
});
```

### Window Event Listeners

```typescript
const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);

createEffect(() => {
  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
```

### Document Title

```typescript
const [title, setTitle] = createSignal('My App');

createEffect(() => {
  document.title = title();
});

setTitle('New Page'); // Browser tab title updates
```

### Logging and Analytics

```typescript
const [currentPage, setCurrentPage] = createSignal('/home');

createEffect(() => {
  const page = currentPage();
  
  // Track page view
  analytics.track('page_view', { page });
  
  console.log('User navigated to:', page);
});
```

### WebSocket Connection

```typescript
const [userId, setUserId] = createSignal<number | null>(null);

createEffect(() => {
  const id = userId();
  
  if (!id) return;
  
  const ws = new WebSocket(`wss://api.example.com/users/${id}`);
  
  ws.onmessage = (event) => {
    console.log('Message:', event.data);
  };

  return () => {
    ws.close();
  };
});
```

## Advanced Patterns

### Conditional Dependencies

Only track certain signals conditionally:

```typescript
const [condition, setCondition] = createSignal(true);
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  if (condition()) {
    console.log('Tracking A:', a());
  } else {
    console.log('Tracking B:', b());
  }
});

// When condition is true, only changes to 'a' trigger the effect
// When condition is false, only changes to 'b' trigger the effect
```

### Debounced Effect

```typescript
import { debounce } from '@fluixi/kettlejs';

const [searchTerm, setSearchTerm] = createSignal('');

createEffect(() => {
  const term = searchTerm();
  
  const debouncedSearch = debounce(async () => {
    const results = await searchAPI(term);
    console.log('Search results:', results);
  }, 300);

  debouncedSearch();
});
```

### Effect with Async Operations

```typescript
const [userId, setUserId] = createSignal(1);
const [userData, setUserData] = createSignal(null);

createEffect(() => {
  const id = userId();
  
  // Track this ID for cleanup
  let cancelled = false;
  
  (async () => {
    try {
      const user = await fetchUser(id);
      if (!cancelled) {
        setUserData(user);
      }
    } catch (error) {
      if (!cancelled) {
        console.error('Failed to fetch user:', error);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
});
```

### Chained Effects

```typescript
const [input, setInput] = createSignal('');
const [processed, setProcessed] = createSignal('');

// First effect processes input
createEffect(() => {
  const value = input();
  setProcessed(value.toLowerCase().trim());
});

// Second effect uses processed value
createEffect(() => {
  const value = processed();
  console.log('Processed value:', value);
});
```

## Effect vs Memo

| Feature | Effect | Memo |
|---------|--------|------|
| Purpose | Side effects | Derived values |
| Returns value | No | Yes |
| Runs immediately | Yes | No (lazy) |
| Caches result | No | Yes |
| Should be pure | No | Yes |

```typescript
const [count, setCount] = createSignal(0);

// Memo - for derived values
const doubled = createMemo(() => count() * 2);

// Effect - for side effects
createEffect(() => {
  console.log('Count is:', count());
});
```

## Best Practices

### 1. Keep Effects Pure-ish

Avoid reading external state inside effects:

```typescript
// ❌ Bad - reads external state
let externalValue = 10;
createEffect(() => {
  console.log(count() + externalValue);
});

// ✅ Good - all dependencies are signals
const [externalValue, setExternalValue] = createSignal(10);
createEffect(() => {
  console.log(count() + externalValue());
});
```

### 2. Always Clean Up

Return cleanup functions for subscriptions:

```typescript
// ❌ Bad - no cleanup
createEffect(() => {
  const interval = setInterval(() => {
    console.log('Tick');
  }, 1000);
});

// ✅ Good - cleanup function
createEffect(() => {
  const interval = setInterval(() => {
    console.log('Tick');
  }, 1000);
  
  return () => clearInterval(interval);
});
```

### 3. Avoid Infinite Loops

Don't update signals that the effect depends on:

```typescript
const [count, setCount] = createSignal(0);

// ❌ Bad - infinite loop!
createEffect(() => {
  setCount(count() + 1);
});

// ✅ Good - guard condition or use untrack
createEffect(() => {
  if (count() < 10) {
    setTimeout(() => setCount(count() + 1), 1000);
  }
});
```

### 4. Use untrack for Non-reactive Reads

```typescript
import { untrack } from '@fluixi/reactive';

const [trigger, setTrigger] = createSignal(0);
const [data, setData] = createSignal('value');

createEffect(() => {
  trigger(); // Track this
  
  // Don't track data reads
  const currentData = untrack(() => data());
  console.log('Data snapshot:', currentData);
});
```

### 5. Batch Signal Updates

```typescript
import { batch } from '@fluixi/reactive';

const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  console.log('Sum:', a() + b());
});

// ❌ Effect runs twice
setA(5);
setB(3);

// ✅ Effect runs once
batch(() => {
  setA(5);
  setB(3);
});
```

## Component Integration

### With Functional Components

```typescript
const MyComponent = () => {
  const [count, setCount] = createSignal(0);

  // Effect runs when component renders
  createEffect(() => {
    console.log('Count in component:', count());
  });

  return html`<button @click=${() => setCount(count() + 1)}>
    Count: ${count()}
  </button>`;
};
```

### With KettleElement

```typescript
import { KettleElement } from '@fluixi/kettlejs';
import { customElement } from 'lit/decorators.js';

@customElement('my-element')
class MyElement extends KettleElement {
  private [count, setCount] = createSignal(0);

  connectedCallback() {
    super.connectedCallback();
    
    // Set up effects in connectedCallback
    this.runInScope(() => {
      createEffect(() => {
        console.log('Count:', this.count());
      });
    });
  }

  view() {
    return html`<p>Count: ${this.count()}</p>`;
  }
}
```

## Debugging Effects

### Naming Effects

```typescript
createEffect(() => {
  console.log('Count:', count());
}, { name: 'logCount' });
```

### Effect Tracking

```typescript
const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('Alice');

createEffect(() => {
  console.log('Effect running');
  console.log('Reading count:', count());
  console.log('Reading name:', name());
});

// Use browser debugger to step through effect execution
```

## Common Pitfalls

### 1. Missing Cleanup

```typescript
// ❌ Memory leak
createEffect(() => {
  const ws = new WebSocket('ws://example.com');
  ws.onmessage = () => console.log('Message');
});

// ✅ Properly cleaned up
createEffect(() => {
  const ws = new WebSocket('ws://example.com');
  ws.onmessage = () => console.log('Message');
  return () => ws.close();
});
```

### 2. Async Effect Without Cancellation

```typescript
// ❌ Race condition
createEffect(() => {
  const id = userId();
  fetchUser(id).then(setUser);
});

// ✅ Cancellation token
createEffect(() => {
  const id = userId();
  let cancelled = false;
  
  fetchUser(id).then(user => {
    if (!cancelled) setUser(user);
  });
  
  return () => { cancelled = true; };
});
```

### 3. Reading Signals in Cleanup

```typescript
// ❌ Don't read signals in cleanup
createEffect(() => {
  console.log(count());
  
  return () => {
    console.log(count()); // Don't do this!
  };
});

// ✅ Capture value in closure
createEffect(() => {
  const value = count();
  console.log(value);
  
  return () => {
    console.log('Previous value was:', value);
  };
});
```

## Next Steps

- Learn about [Memos](./memos.md) for computed values
- Understand [Lifecycle](./lifecycle.md) hooks
- Explore [Batching](./batching.md) for optimization
- See [Untrack](./untrack.md) for selective tracking

## Related Resources

- [API Reference: createEffect](../api-reference/core.md#createeffect)
- [Examples: Effect Patterns](../guides/examples.md#effects)
- [@fluixi/reactive Documentation](../../reactive/effects.md)