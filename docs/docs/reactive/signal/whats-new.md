---
sidebar_position: 8
---

# What's New - Enhanced Reactivity

## Overview

The Signal system has been significantly enhanced with SolidJS-inspired features, improved scheduling, better debugging, and production-ready capabilities.

---

## Major Enhancements

### 🚀 Priority-Based Scheduling

The system now uses a priority-based scheduling mechanism ensuring updates happen in the correct order:

```typescript
enum UpdatePriority {
  IMMEDIATE = 0,    // Immediate synchronous updates
  RENDER = 1,       // Rendering effects (highest priority)
  COMPUTE = 2,      // Computed/memo updates
  EFFECT = 3,       // Regular effects
  TRANSITION = 4,   // Transition updates (lowest priority)
}
```

**Benefits:**
- Predictable execution order
- DOM updates before side effects
- Critical updates never blocked
- Better perceived performance

---

### 🎯 SolidJS-Style Batch with `runUpdates()`

Completely rewritten batching mechanism inspired by SolidJS:

```typescript
// Old approach (still works)
batch(() => {
  setA(1);
  setB(2);
});

// New internal mechanism
// - Uses update queue
// - Calls runUpdates() automatically
// - Processes updates in priority order
// - More predictable and efficient
```

**How it works:**
1. Updates are queued instead of immediate execution
2. `runUpdates()` processes the queue when batch completes
3. Priority-based flushing: renders → computations → effects
4. Synchronous execution for predictability

---

### ⏰ Transitions API

Non-blocking updates for better UX:

```typescript
import { startTransition, useTransition } from '@awc/reactive';

// Mark updates as low priority
await startTransition(() => {
  setExpensiveData(compute());
});

// Track pending state
const [isPending, start] = useTransition();
start(() => setData(newData));

if (isPending()) {
  return <LoadingSpinner />;
}
```

**Features:**
- Automatic priority assignment (TRANSITION)
- Updates queued in transition state
- Won't block urgent updates
- Built-in pending state tracking

---

### 🔄 Suspense Boundaries

Declarative async data loading:

```typescript
import { createSuspense, trackPromise } from '@awc/reactive';

const UserProfile = createSuspense(
  () => {
    const userData = trackPromise(fetchUser(id()));
    return <Profile data={userData} />;
  },
  <ProfileSkeleton /> // Fallback
);
```

**Features:**
- Nested suspense support
- Automatic promise tracking
- Clean loading states
- Composable boundaries

---

### 🛡️ Error Boundaries

Graceful error handling in reactive contexts:

```typescript
import { catchError } from '@awc/reactive';

const safeData = catchError(
  () => parseData(input()),
  (error) => {
    console.error('Parse error:', error);
    return fallbackValue;
  }
);

// Attach to roots
createRoot((dispose) => {
  const owner = getOwner();
  if (owner) {
    owner.errorBoundary = {
      errors: [],
      handler: (error) => console.error(error),
      reset: () => {}
    };
  }
});
```

**Features:**
- Automatic error propagation
- Prevents app crashes
- Error recovery mechanisms
- Root-level boundaries

---

### 🌐 Context API

Clean state sharing without prop drilling:

```typescript
import { createContext, useContext } from '@awc/reactive';

// Create context
const ThemeContext = createContext({ mode: 'light' });

// Provide values
ThemeContext.Provider({
  value: { mode: 'dark' },
  children: () => <App />
});

// Consume anywhere
const theme = useContext(ThemeContext);
```

**Features:**
- Type-safe contexts
- Nested context support
- Reactive context values
- Clean component APIs

---

### ⚡ Enhanced Effects

#### `createRenderEffect()`

Synchronous DOM updates with highest priority:

```typescript
import { createRenderEffect } from '@awc/reactive';

createRenderEffect(() => {
  // Runs synchronously after signal updates
  element.textContent = signal();
  
  return () => {
    // Cleanup
  };
});
```

#### `createReaction()`

Manual dependency tracking:

```typescript
import { createReaction } from '@awc/reactive';

const track = createReaction(() => {
  console.log('Changed!');
});

// Track specific signals
track(() => console.log(signal()));
```

#### `on()` Helper

Explicit dependencies:

```typescript
import { on, createEffect } from '@awc/reactive';

createEffect(
  on(
    () => [count(), name()],
    ([c, n], prev) => {
      console.log('Current:', c, n);
      console.log('Previous:', prev);
    },
    { defer: true } // Skip initial run
  )
);
```

---

### 👥 Owner Management

Advanced lifecycle control:

```typescript
import { getOwner, runWithOwner } from '@awc/reactive';

// Capture owner
const owner = getOwner();

// Run with owner later (async, etc.)
setTimeout(() => {
  runWithOwner(owner, () => {
    createEffect(() => {
      console.log('Effect with captured owner');
    });
  });
}, 1000);
```

**Use cases:**
- Async operations
- Dynamic components
- Plugin systems
- Advanced patterns

---

### 🔍 Enhanced Debugging

Completely rewritten `warnCoarseRead()` with comprehensive diagnostics:

```typescript
// Automatically warns about:
// - Large objects (>5 keys)
// - Large arrays (>20 items)  
// - High observer counts (>15)
```

**Example output:**

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
│ Dependencies      │ 3        │
│ Observers         │ 18       │
└───────────────────┴──────────┘

Observer Types:
┌───────────┬───────┐
│ effect    │ 12    │
│ memo      │ 4     │
│ render    │ 2     │
└───────────┴───────┘

Dependency Chain:
  userData (signal)
    depends on:
      apiResponse (async)
      userPreferences (signal)

Suggestions:
  • Use derived signals for specific properties
  • Consider breaking into smaller signals
  • Use memos for computed values
  • Use untrack() to exclude from tracking

⚠️ High observer count (18) - consider refactoring
```

**Additional debugging tools:**

```typescript
// Get statistics
const stats = getNodeStats();
console.log('Total nodes:', stats.total);
console.log('By type:', stats.byType);

// Find memory leaks
const leaks = findPotentialLeaks();
if (leaks.length > 0) {
  console.warn('Potential leaks:', leaks);
}

// Dump reactive graph (dev mode)
__dumpReactiveGraph__();
```

---

## Transition State Tracking

Effects and memos now respect transition state:

```typescript
// Inside createEffect
if (currentTransition) {
  node.priority = UpdatePriority.TRANSITION; // Low priority
} else {
  node.priority = UpdatePriority.EFFECT; // Normal priority
}

// Inside createMemo
if (currentTransition) {
  memoNode.priority = UpdatePriority.TRANSITION;
} else {
  memoNode.priority = UpdatePriority.COMPUTE;
}
```

**Benefits:**
- Automatic priority assignment
- Effects in transitions don't block
- Clear separation of urgent vs. non-urgent work
- Better user experience

---

## Breaking Changes

### ✅ None!

All enhancements are **100% backward compatible**. Existing code continues to work without modifications.

---

## Migration Guide

### Step 1: Start Using Transitions

```typescript
// Before
function handleSearch(query: string) {
  setResults(expensiveSearch(query));
}

// After
function handleSearch(query: string) {
  startTransition(() => {
    setResults(expensiveSearch(query));
  });
}
```

### Step 2: Replace Loading States with Suspense

```typescript
// Before
const [loading, setLoading] = createSignal(true);
const [data, setData] = createSignal(null);

async function load() {
  setLoading(true);
  try {
    const result = await fetchData();
    setData(result);
  } finally {
    setLoading(false);
  }
}

// After
const DataView = createSuspense(
  () => {
    const data = trackPromise(fetchData());
    return <Display data={data} />;
  },
  <LoadingSpinner />
);
```

### Step 3: Add Error Boundaries

```typescript
// Before
const result = parseJSON(input());

// After
const result = catchError(
  () => parseJSON(input()),
  (error) => {
    console.error('Parse error:', error);
    return defaultValue;
  }
);
```

### Step 4: Use Context Instead of Prop Drilling

```typescript
// Before
<App theme={theme}>
  <Layout theme={theme}>
    <Sidebar theme={theme}>
      <Button theme={theme} />

// After
const ThemeContext = createContext({ mode: 'light' });

ThemeContext.Provider({
  value: { mode: theme() },
  children: () => <App />
});

// In Button
const theme = useContext(ThemeContext);
```

### Step 5: Use Render Effects for DOM

```typescript
// Before
createEffect(() => {
  element.textContent = signal();
});

// After (higher priority, synchronous)
createRenderEffect(() => {
  element.textContent = signal();
});
```

---

## Performance Improvements

### 1. Priority-Based Flushing

Updates now execute in optimal order:
- Renders first (DOM updates)
- Computations next (derived state)
- Effects last (side effects)

### 2. Queue-Based Updates

The new `runUpdates()` mechanism:
- Batches all updates efficiently
- Prevents redundant computations
- Predictable synchronous execution

### 3. Transition Deferral

Non-urgent work doesn't block:
- UI remains responsive
- Expensive computations queued
- Automatic priority management

### 4. Smart Debugging

Only warns when needed:
- Large object detection
- High observer count detection
- Performance metric tracking

---

## New API Surface

### Transitions
- `startTransition(fn)` - Mark updates as low priority
- `useTransition()` - Track transition state

### Suspense
- `createSuspense(fn, fallback)` - Async boundaries
- `trackPromise(promise)` - Register promises

### Errors
- `catchError(fn, handler)` - Handle errors

### Context
- `createContext(defaultValue)` - Create context
- `useContext(context)` - Consume context

### Effects
- `createRenderEffect(fn)` - Synchronous effects
- `createReaction(onInvalidate)` - Manual tracking
- `on(deps, fn, options)` - Explicit dependencies

### Owners
- `getOwner()` - Get current owner
- `runWithOwner(owner, fn)` - Run with owner

### Debugging
- `warnCoarseRead(node, reason)` - Enhanced warnings
- `getNodeStats()` - Node statistics
- `findPotentialLeaks()` - Leak detection

### Internal (Advanced)
- `runUpdates()` - Process update queue
- `queueUpdate(fn)` - Queue an update

---

## Best Practices

### Do ✅

1. **Use transitions for expensive updates**
   ```typescript
   startTransition(() => {
     setLargeList(compute());
   });
   ```

2. **Use suspense for async data**
   ```typescript
   createSuspense(
     () => trackPromise(fetch()),
     <Loading />
   );
   ```

3. **Add error boundaries**
   ```typescript
   catchError(
     () => operation(),
     (err) => fallback
   );
   ```

4. **Use context for shared state**
   ```typescript
   const value = useContext(MyContext);
   ```

5. **Batch related updates**
   ```typescript
   batch(() => {
     setA(1);
     setB(2);
   });
   ```

### Don't ❌

1. **Don't block UI with expensive work**
   ```typescript
   setLargeList(compute()); // Blocks!
   ```

2. **Don't manage loading states manually**
   ```typescript
   const [loading, setLoading] = createSignal(true);
   ```

3. **Don't ignore errors**
   ```typescript
   riskyOperation(); // Might crash
   ```

4. **Don't prop drill**
   ```typescript
   <Child prop1={x} prop2={y} prop3={z} />
   ```

---

## Examples

### Complete App Example

```typescript
import { 
  createSignal, 
  createEffect,
  batch,
  startTransition,
  createSuspense,
  trackPromise,
  catchError,
  createContext,
  useContext,
  useTransition
} from '@awc/reactive';

// Context
const AppContext = createContext({ 
  user: null,
  theme: 'light' 
});

// App component
function App() {
  const [user, setUser] = createSignal(null);
  const [theme, setTheme] = createSignal('light');
  const [isPending, start] = useTransition();
  
  // Load user with suspense
  const UserProfile = createSuspense(
    () => {
      const userData = trackPromise(fetchUser());
      return <Profile data={userData} />;
    },
    <ProfileSkeleton />
  );
  
  // Update theme in transition
  const toggleTheme = () => {
    start(() => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    });
  };
  
  // Safe data parsing
  const config = catchError(
    () => parseConfig(rawConfig()),
    (error) => defaultConfig
  );
  
  // Batch updates
  const updateUser = (updates) => {
    batch(() => {
      if (updates.name) setUserName(updates.name);
      if (updates.email) setUserEmail(updates.email);
    });
  };
  
  return AppContext.Provider({
    value: { user: user(), theme: theme() },
    children: () => (
      <div>
        <UserProfile />
        {isPending() && <LoadingBar />}
      </div>
    )
  });
}

// Child component using context
function ThemedButton() {
  const { theme } = useContext(AppContext);
  
  return {
    backgroundColor: theme === 'dark' ? '#333' : '#fff'
  };
}
```

---

## Summary

The enhanced Signal system provides:

✅ **Better Performance** - Priority-based scheduling  
✅ **Better UX** - Non-blocking transitions  
✅ **Cleaner Code** - Suspense and context  
✅ **More Robust** - Error boundaries  
✅ **Easier Debugging** - Enhanced diagnostics  
✅ **Full Control** - Manual tracking options  
✅ **100% Compatible** - No breaking changes  

The system is now production-ready for complex applications while maintaining simplicity for basic use cases.

---

## Further Reading

- [Core Signals](./signal.md) - Complete API reference
- [SolidJS Features](./solidjs-features.md) - Detailed feature guide
- [Advanced Patterns](./advanced-patterns.md) - Complex patterns
- [Quick Reference](./quick-reference.md) - Quick lookup guide