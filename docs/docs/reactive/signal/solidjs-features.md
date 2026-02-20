---
sidebar_position: 5
---

# SolidJS-Inspired Features

The reactive signal system has been enhanced with powerful SolidJS-inspired features that provide better control over updates, async handling, error management, and debugging capabilities.

## Overview

These enhancements include:

- **Priority-Based Scheduling** - Ensures updates happen in the correct order
- **Transitions** - Non-blocking updates for better UX
- **Suspense** - Declarative async data loading
- **Error Boundaries** - Graceful error handling
- **Context API** - Clean state sharing without prop drilling
- **Enhanced Effects** - Render effects and reactions
- **Owner Management** - Advanced lifecycle control
- **Enhanced Debugging** - Detailed performance insights

---

## Priority-Based Scheduling

The system uses a priority-based scheduling mechanism to ensure critical updates execute before less important ones.

### Update Priorities

```typescript
enum UpdatePriority {
  IMMEDIATE = 0,    // Immediate synchronous updates
  RENDER = 1,       // Rendering effects (highest priority)
  COMPUTE = 2,      // Computed/memo updates
  EFFECT = 3,       // Regular effects
  TRANSITION = 4,   // Transition updates (lowest priority)
}
```

### How It Works

Updates are processed in priority order:

1. **Renders** execute first - DOM updates
2. **Computations** execute next - Memos and derived state
3. **Effects** execute after - Side effects
4. **Transitions** execute last - Low-priority updates

This ensures predictable behavior and optimal performance.

---

## Transitions

Transitions allow you to mark updates as non-urgent, preventing them from blocking the UI.

### `startTransition()`

Mark expensive updates as low priority:

```typescript
import { startTransition, createSignal } from '@awc/reactive';

const [query, setQuery] = createSignal('');
const [results, setResults] = createSignal([]);

// Urgent update - happens immediately
setQuery(newValue);

// Non-urgent update - won't block UI
await startTransition(() => {
  setResults(expensiveSearch(newValue));
});
```

### `useTransition()`

Track pending transitions and show loading states:

```typescript
const [isPending, start] = useTransition();

function handleSearch(query: string) {
  start(() => {
    // Expensive computation
    const results = searchDatabase(query);
    setResults(results);
  });
}

// Show loading indicator
if (isPending()) {
  return <LoadingSpinner />;
}
```

### Benefits

- **Non-blocking UI** - User interactions remain responsive
- **Better UX** - Show loading states for expensive operations
- **Automatic batching** - All transition updates are batched together
- **Priority control** - System knows what to prioritize

### Example: Search with Transitions

```typescript
const [query, setQuery] = createSignal('');
const [results, setResults] = createSignal<string[]>([]);
const [isPending, start] = useTransition();

function handleSearch(value: string) {
  // Update query immediately
  setQuery(value);
  
  // Defer expensive search
  start(() => {
    const searchResults = expensiveSearch(value);
    setResults(searchResults);
  });
}

createEffect(() => {
  console.log('Query:', query());
  console.log('Pending:', isPending());
  console.log('Results:', results());
});
```

---

## Suspense

Suspense boundaries handle async data loading, showing fallback content while data loads.

### `createSuspense()`

Create a suspense boundary:

```typescript
import { createSuspense, trackPromise } from '@awc/reactive';

const UserProfile = createSuspense(
  () => {
    // This function suspends until data is ready
    const userData = fetchUser(userId());
    trackPromise(userData);
    
    return <UserCard data={userData} />;
  },
  <ProfileSkeleton /> // Fallback while loading
);
```

### `trackPromise()`

Register promises with the nearest suspense boundary:

```typescript
async function loadUserData(id: number) {
  const promise = fetch(`/api/users/${id}`)
    .then(r => r.json());
  
  // Register with suspense boundary
  trackPromise(promise);
  
  return promise;
}

const DataView = createSuspense(
  () => {
    const data = loadUserData(userId());
    return <DisplayData data={data} />;
  },
  <LoadingSpinner />
);
```

### Nested Suspense

Suspense boundaries can be nested for fine-grained loading states:

```typescript
const App = createSuspense(
  () => {
    const mainData = trackPromise(fetchMain());
    
    return (
      <div>
        <Header data={mainData} />
        
        {createSuspense(
          () => {
            const details = trackPromise(fetchDetails());
            return <Details data={details} />;
          },
          <DetailsSkeleton />
        )}
      </div>
    );
  },
  <AppSkeleton />
);
```

### Benefits

- **Declarative async** - No manual loading state management
- **Composable** - Nest boundaries for different loading areas
- **Automatic** - Promise tracking happens automatically
- **Clean code** - Less boilerplate than manual state

---

## Error Handling

### `catchError()`

Catch and handle errors in reactive contexts:

```typescript
import { catchError, createEffect } from '@awc/reactive';

const safeData = catchError(
  () => {
    // Code that might throw
    return parseData(rawInput());
  },
  (error) => {
    console.error('Parse error:', error);
    return defaultData; // Fallback value
  }
);
```

### Error Boundaries in Roots

Attach error boundaries to reactive roots:

```typescript
import { createRoot, getOwner } from '@awc/reactive';

createRoot((dispose) => {
  const owner = getOwner();
  
  if (owner) {
    owner.errorBoundary = {
      errors: [],
      handler: (error) => {
        console.error('Caught error:', error);
        showErrorToast(error.message);
      },
      reset: () => {
        // Reset error state
      }
    };
  }
  
  // Your reactive code here
  createEffect(() => {
    // Errors are caught by the boundary
    riskyOperation();
  });
});
```

### Automatic Error Propagation

Errors automatically propagate to the nearest error boundary:

```typescript
createEffect(() => {
  // If this throws, it's caught by nearest boundary
  const result = JSON.parse(invalidJSON());
  console.log(result);
});
```

---

## Context API

Share data across reactive boundaries without prop drilling.

### `createContext()`

Create a typed context:

```typescript
import { createContext } from '@awc/reactive';

interface ThemeContext {
  mode: 'light' | 'dark';
  primaryColor: string;
}

const ThemeContext = createContext<ThemeContext>({
  mode: 'light',
  primaryColor: '#007bff'
});
```

### Context Provider

Provide context values:

```typescript
import { createRoot } from '@awc/reactive';

createRoot(() => {
  ThemeContext.Provider({
    value: {
      mode: 'dark',
      primaryColor: '#ff0000'
    },
    children: () => {
      return <App />;
    }
  });
});
```

### `useContext()`

Consume context values:

```typescript
import { useContext } from '@awc/reactive';

function ThemedButton() {
  const theme = useContext(ThemeContext);
  
  return {
    backgroundColor: theme.primaryColor,
    color: theme.mode === 'dark' ? '#fff' : '#000'
  };
}
```

### Example: Theme Context

```typescript
// Define context
const ThemeContext = createContext({
  mode: 'light' as 'light' | 'dark',
  toggleMode: () => {}
});

// Root component
function App() {
  const [mode, setMode] = createSignal<'light' | 'dark'>('light');
  
  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return ThemeContext.Provider({
    value: { mode: mode(), toggleMode },
    children: () => <UI />
  });
}

// Child component (no prop drilling!)
function Button() {
  const { mode, toggleMode } = useContext(ThemeContext);
  
  return {
    backgroundColor: mode === 'dark' ? '#333' : '#fff',
    onClick: toggleMode
  };
}
```

---

## Enhanced Effects

### `createRenderEffect()`

Render effects run synchronously after signals update, perfect for DOM manipulation:

```typescript
import { createRenderEffect, createSignal } from '@awc/reactive';

const [count, setCount] = createSignal(0);

createRenderEffect(() => {
  // Runs immediately and synchronously after count changes
  document.title = `Count: ${count()}`;
  
  // Optional cleanup
  return () => {
    console.log('Cleaning up previous render');
  };
});
```

### Difference from `createEffect()`

| Feature | `createRenderEffect()` | `createEffect()` |
|---------|------------------------|------------------|
| Priority | RENDER (1) | EFFECT (3) |
| Execution | Synchronous | Lower priority |
| Use Case | DOM updates, layout | Async ops, logging |

### `createReaction()`

Manual dependency tracking for fine-grained control:

```typescript
import { createReaction, createSignal } from '@awc/reactive';

const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('John');

const track = createReaction(() => {
  console.log('Dependencies changed!');
});

// Track only count
track(() => {
  console.log(count());
});

setCount(1); // Logs: "Dependencies changed!"
setName('Jane'); // No log (not tracked)

// Re-track with different dependencies
track(() => {
  console.log(name()); // Now track name
});
```

### Use Cases for Reactions

- **Performance optimization** - Track only what you need
- **Custom reactive patterns** - Build your own abstractions
- **Manual control** - Fine-grained update management
- **Dynamic tracking** - Change tracked dependencies at runtime

---

## Explicit Dependencies with `on()`

The `on()` helper creates explicit dependency relationships:

```typescript
import { on, createSignal, createEffect } from '@awc/reactive';

const [count, setCount] = createSignal(0);
const [multiplier, setMultiplier] = createSignal(2);

createEffect(
  on(
    () => [count(), multiplier()],
    ([c, m], prev) => {
      console.log('Result:', c * m);
      console.log('Previous:', prev);
    }
  )
);
```

### Deferred Execution

Skip the initial run:

```typescript
createEffect(
  on(
    () => [count()],
    ([value], prevValue) => {
      // Only runs on changes, not initially
      console.log('Changed from', prevValue, 'to', value);
    },
    { defer: true }
  )
);
```

### Benefits

- **Explicit** - Dependencies are clear and intentional
- **Previous values** - Access previous state easily
- **Deferred** - Control initial execution
- **Type-safe** - Full TypeScript inference

---

## Owner Management

### `getOwner()`

Get the current reactive owner:

```typescript
import { getOwner, createRoot } from '@awc/reactive';

createRoot(() => {
  const owner = getOwner();
  
  console.log('Owner:', owner);
  console.log('Cleanups:', owner?.cleanups);
  console.log('Context:', owner?.context);
});
```

### `runWithOwner()`

Run code with a specific owner context:

```typescript
import { getOwner, runWithOwner, createEffect } from '@awc/reactive';

// Capture owner
const owner = getOwner();

// Later, run code with that owner
setTimeout(() => {
  runWithOwner(owner, () => {
    // This effect belongs to the captured owner
    createEffect(() => {
      console.log('Effect with original owner');
    });
  });
}, 1000);
```

### Use Cases

- **Async operations** - Maintain reactive context in async code
- **Dynamic components** - Create components with specific owners
- **Plugin systems** - Manage lifecycle across boundaries
- **Advanced patterns** - Build custom reactive utilities

---

## Enhanced Debugging

### `warnCoarseRead()`

The enhanced warning system provides detailed insights:

```typescript
// Automatically warns about:
// - Large objects (>5 keys)
// - Large arrays (>20 items)
// - High observer counts (>15)
```

### Example Warning Output

```
⚠️ [Reactivity Warning] Coarse Dependency Detected

Node Information:
┌─────────────┬──────────────────┐
│ Node Name   │ userData         │
│ Node Type   │ signal           │
│ Version     │ 45               │
│ Observers   │ 18               │
└─────────────┴──────────────────┘

Reason:
  Reading large object (23 keys) - consider using 
  derived signals for specific properties

Performance Metrics:
┌───────────────────┬──────────┐
│ Node Age          │ 5432ms   │
│ Updates           │ 45       │
│ Avg Frequency     │ 120ms    │
└───────────────────┴──────────┘

Suggestions:
  • Use derived signals for specific properties
  • Consider breaking into smaller signals
  • Use memos for computed values
```

### `getNodeStats()`

Get comprehensive statistics:

```typescript
import { getNodeStats } from '@awc/reactive';

const stats = getNodeStats();

console.log('Total nodes:', stats.total);
console.log('By type:', stats.byType);
console.log('Oldest:', stats.oldest);
console.log('Dependencies:', stats.dependencies);
```

### `findPotentialLeaks()`

Detect memory leaks:

```typescript
import { findPotentialLeaks } from '@awc/reactive';

const leaks = findPotentialLeaks();

if (leaks.length > 0) {
  console.warn('Potential leaks found:', leaks);
  leaks.forEach(node => {
    console.log('- Node:', node.name, 'Type:', node.type);
  });
}
```

---

## Best Practices

### 1. Use Transitions for Expensive Updates

```typescript
// ✅ Good: Non-blocking
startTransition(() => {
  setLargeList(expensiveComputation());
});

// ❌ Bad: Blocks UI
setLargeList(expensiveComputation());
```

### 2. Leverage Suspense for Async

```typescript
// ✅ Good: Declarative
const data = createSuspense(
  () => trackPromise(fetchData()),
  <Loading />
);

// ❌ Bad: Manual state management
const [loading, setLoading] = createSignal(true);
const [data, setData] = createSignal(null);
```

### 3. Add Error Boundaries

```typescript
// ✅ Good: Graceful errors
catchError(
  () => riskyOperation(),
  (error) => fallbackValue
);

// ❌ Bad: Unhandled
riskyOperation(); // Might crash
```

### 4. Use Context for Shared State

```typescript
// ✅ Good: Clean
const theme = useContext(ThemeContext);

// ❌ Bad: Prop drilling
function Component({ theme, locale, user, ... }) {
  // Too many props
}
```

### 5. Choose the Right Effect Type

```typescript
// For DOM updates
createRenderEffect(() => {
  element.textContent = signal();
});

// For side effects
createEffect(() => {
  logToAnalytics(signal());
});

// For manual control
const track = createReaction(() => update());
```

---

## Migration Guide

### Step 1: Add Transitions

```typescript
// Before
setResults(expensiveSearch(query()));

// After
startTransition(() => {
  setResults(expensiveSearch(query()));
});
```

### Step 2: Use Suspense

```typescript
// Before
const [loading, setLoading] = createSignal(true);
const [data, setData] = createSignal(null);

async function load() {
  setLoading(true);
  const result = await fetchData();
  setData(result);
  setLoading(false);
}

// After
const data = createSuspense(
  () => trackPromise(fetchData()),
  <Loading />
);
```

### Step 3: Add Error Handling

```typescript
// Before
const result = parseJSON(input());

// After
const result = catchError(
  () => parseJSON(input()),
  (error) => defaultValue
);
```

### Step 4: Use Context

```typescript
// Before
<App theme={theme}>
  <Layout theme={theme}>
    <Sidebar theme={theme}>
      <Button theme={theme} />

// After
ThemeContext.Provider({
  value: theme,
  children: () => <App />
});

// In Button component
const theme = useContext(ThemeContext);
```

---

## Performance Tips

1. **Use `untrack()` to prevent tracking**
   ```typescript
   createEffect(() => {
     const tracked = signal();
     const untracked = untrack(() => other());
   });
   ```

2. **Batch related updates**
   ```typescript
   batch(() => {
     setA(1);
     setB(2);
     setC(3);
   });
   ```

3. **Use memos for expensive computations**
   ```typescript
   const result = createMemo(() => expensive(signal()));
   ```

4. **Monitor with debugging tools**
   ```typescript
   const stats = getNodeStats();
   const leaks = findPotentialLeaks();
   ```

---

## Summary

The SolidJS-inspired features provide:

✅ **Better Performance** - Priority-based scheduling  
✅ **Better UX** - Non-blocking transitions  
✅ **Cleaner Code** - Suspense and context  
✅ **More Robust** - Error boundaries  
✅ **Easier Debugging** - Enhanced warnings  
✅ **Full Control** - Manual tracking options  

These features make the reactive system production-ready for complex applications while maintaining simplicity for basic use cases.