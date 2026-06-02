---
sidebar_position: 6
---

# Advanced Patterns

This guide covers advanced patterns and techniques for building sophisticated reactive applications.

## Batch and Update Queue System

### Understanding `batch()` and `runUpdates()`

The reactive system uses a SolidJS-inspired batching mechanism with a central update queue.

#### How It Works

```typescript
// Internal implementation concept
const updateQueue: (() => void)[] = [];
let isRunningUpdates = false;
let batchDepth = 0;

function batch<T>(fn: () => T): T {
  batchDepth++;
  
  try {
    return fn();
  } finally {
    batchDepth--;
    
    if (batchDepth === 0 && !isRunningUpdates) {
      runUpdates(); // Process all queued updates
    }
  }
}
```

#### The Update Queue

When signals change, updates are queued rather than executed immediately:

```typescript
function queueUpdate(fn: () => void): void {
  updateQueue.push(fn);
  if (!isRunningUpdates) {
    runUpdates();
  }
}

function runUpdates(): void {
  if (isRunningUpdates) return;
  
  isRunningUpdates = true;
  
  try {
    // Process all queued updates
    while (updateQueue.length > 0) {
      const update = updateQueue.shift();
      update?.();
    }
    
    // Flush by priority: renders -> computations -> effects
    if (batchDepth === 0) {
      flushRenders();
      flushComputations();
      flushEffects();
    }
  } finally {
    isRunningUpdates = false;
  }
}
```

### Basic Batching

Batch multiple updates to run effects only once:

```typescript
import { batch, createSignal, createEffect } from '@fluixi/reactive';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

createEffect(() => {
  console.log(`Name: ${firstName()} ${lastName()}`);
});

// Without batching - effect runs twice
setFirstName('Jane');
setLastName('Smith');
// Logs:
// "Name: Jane Doe"
// "Name: Jane Smith"

// With batching - effect runs once
batch(() => {
  setFirstName('Bob');
  setLastName('Johnson');
});
// Logs:
// "Name: Bob Johnson"
```

### Nested Batching

Batches can be nested - updates only flush when outermost batch completes:

```typescript
batch(() => {
  setFirstName('Alice');
  
  batch(() => {
    setLastName('Williams');
    setAge(30);
  });
  
  setCity('New York');
  // Nothing has flushed yet - still in outer batch
});
// All effects run once here
```

### Batching with Transitions

Transitions automatically batch their updates with low priority:

```typescript
const [isPending, start] = useTransition();

start(() => {
  // All updates here are automatically batched
  // and marked as low priority
  setData1(value1);
  setData2(value2);
  setData3(value3);
});
```

## Transition State Tracking

### Effects in Transitions

Effects created within transitions automatically get `TRANSITION` priority:

```typescript
import { startTransition, createEffect } from '@fluixi/reactive';

startTransition(() => {
  // This effect has TRANSITION priority (lowest)
  createEffect(() => {
    console.log('Low priority effect');
  });
  
  setExpensiveData(compute());
});

// Regular effect (higher priority)
createEffect(() => {
  console.log('Normal priority effect');
});
// This runs first ^
```

### Memos in Transitions

Memos also respect transition state:

```typescript
const [query, setQuery] = createSignal('');

startTransition(() => {
  // This memo has TRANSITION priority
  const filtered = createMemo(() => {
    return expensiveFilter(query());
  });
  
  setResults(filtered());
});
```

### Checking Transition State

The system tracks current transition state internally:

```typescript
// Inside the reactive system:
if (currentTransition) {
  node.priority = UpdatePriority.TRANSITION;
  currentTransition.updates.add(() => executeNode(node));
} else {
  node.priority = UpdatePriority.EFFECT;
}
```

## Custom Update Queuing

### Manual Queue Control

For advanced use cases, you can use the queue directly:

```typescript
import { queueUpdate, runUpdates } from '@fluixi/reactive';

// Queue multiple operations
queueUpdate(() => updateUI());
queueUpdate(() => sendAnalytics());
queueUpdate(() => syncStorage());

// Manually trigger processing (usually automatic)
runUpdates();
```

### Deferred Updates

Defer updates to run after current batch:

```typescript
function deferredUpdate(fn: () => void) {
  queueMicrotask(() => {
    batch(() => fn());
  });
}

deferredUpdate(() => {
  setSignal1(value1);
  setSignal2(value2);
});
```

## Complex State Patterns

### State Machines

Build state machines with signals:

```typescript
type State = 'idle' | 'loading' | 'success' | 'error';

interface StateMachine {
  state: () => State;
  data: () => any;
  error: () => Error | null;
  load: () => Promise<void>;
  reset: () => void;
}

function createStateMachine<T>(
  loader: () => Promise<T>
): StateMachine {
  const [state, setState] = createSignal<State>('idle');
  const [data, setData] = createSignal<T | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  
  const load = async () => {
    batch(() => {
      setState('loading');
      setError(null);
    });
    
    try {
      const result = await loader();
      batch(() => {
        setData(result);
        setState('success');
      });
    } catch (err) {
      batch(() => {
        setError(err as Error);
        setState('error');
      });
    }
  };
  
  const reset = () => {
    batch(() => {
      setState('idle');
      setData(null);
      setError(null);
    });
  };
  
  return { state, data, error, load, reset };
}

// Usage
const machine = createStateMachine(() => fetchUserData());

createEffect(() => {
  if (machine.state() === 'loading') {
    console.log('Loading...');
  } else if (machine.state() === 'success') {
    console.log('Data:', machine.data());
  }
});
```

### Derived State Graphs

Create complex dependency graphs:

```typescript
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);
const [c, setC] = createSignal(3);

// Level 1 derived state
const ab = createMemo(() => a() + b());
const bc = createMemo(() => b() + c());

// Level 2 derived state
const total = createMemo(() => ab() + bc());

// Single effect tracks all dependencies
createEffect(() => {
  console.log('Total:', total());
});

// Update all at once
batch(() => {
  setA(10);
  setB(20);
  setC(30);
});
// Effect runs once: "Total: 90"
```

## Performance Optimization

### Strategic Use of `untrack()`

Prevent unnecessary tracking for performance:

```typescript
const [items, setItems] = createSignal<Item[]>([]);
const [filter, setFilter] = createSignal('');

const filtered = createMemo(() => {
  const currentFilter = filter();
  const currentItems = items();
  
  // Use untrack for expensive operations
  return untrack(() => {
    return currentItems.filter(item => 
      expensiveMatch(item, currentFilter)
    );
  });
});
```

### Selective Memoization

Memoize expensive computations strategically:

```typescript
const [data, setData] = createSignal<Data[]>([]);

// Memoize expensive transformation
const processed = createMemo(() => {
  return data().map(item => expensiveProcess(item));
});

// Memoize expensive filtering
const filtered = createMemo(() => {
  return processed().filter(item => item.valid);
});

// Cheap final transformation - no memo needed
const display = () => filtered().slice(0, 10);
```

### Batch Related Updates

Always batch related state changes:

```typescript
function updateUser(updates: Partial<User>) {
  batch(() => {
    if (updates.name) setName(updates.name);
    if (updates.email) setEmail(updates.email);
    if (updates.age) setAge(updates.age);
    if (updates.avatar) setAvatar(updates.avatar);
  });
}
```

## Async Patterns

### Sequential Async Operations

Chain async operations with transitions:

```typescript
async function loadUserAndPosts(userId: number) {
  const [isPending, start] = useTransition();
  
  // Load user first
  const user = await fetchUser(userId);
  setUser(user);
  
  // Then load posts in transition
  await start(async () => {
    const posts = await fetchPosts(userId);
    setPosts(posts);
  });
}
```

### Parallel Async Operations

Load multiple resources with suspense:

```typescript
const DataView = createSuspense(
  () => {
    // Both load in parallel
    const user = trackPromise(fetchUser(id()));
    const posts = trackPromise(fetchPosts(id()));
    
    return <Display user={user} posts={posts} />;
  },
  <LoadingBoth />
);
```

### Retry Logic

Implement retry with error boundaries:

```typescript
function createRetryable<T>(
  fn: () => Promise<T>,
  maxRetries = 3
) {
  const [attempt, setAttempt] = createSignal(0);
  const [data, setData] = createSignal<T | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  
  const execute = catchError(
    async () => {
      try {
        const result = await fn();
        setData(result);
        setError(null);
        return result;
      } catch (err) {
        if (attempt() < maxRetries) {
          setAttempt(a => a + 1);
          return execute();
        } else {
          throw err;
        }
      }
    },
    (err) => {
      setError(err as Error);
      throw err;
    }
  );
  
  return { execute, data, error, attempt };
}
```

## Owner-Based Patterns

### Scoped Effects

Create effects that belong to specific owners:

```typescript
function createScopedEffect(fn: EffectFn) {
  const owner = getOwner();
  
  return () => {
    runWithOwner(owner, () => {
      createEffect(fn);
    });
  };
}

// Usage
const root = createRoot(() => {
  const addEffect = createScopedEffect(() => {
    console.log('Scoped effect');
  });
  
  // Later, add effect to this root
  setTimeout(addEffect, 1000);
});
```

### Dynamic Component Mounting

Mount components with proper ownership:

```typescript
function mountComponent(
  component: () => void,
  parent: RootOwner | null
) {
  runWithOwner(parent, () => {
    createRoot(() => {
      component();
    });
  });
}
```

## Context Patterns

### Nested Contexts

Create hierarchical context systems:

```typescript
const AppContext = createContext({ level: 'app' });
const PageContext = createContext({ level: 'page' });
const ComponentContext = createContext({ level: 'component' });

AppContext.Provider({
  value: { level: 'app', theme: 'dark' },
  children: () => {
    PageContext.Provider({
      value: { level: 'page', layout: 'grid' },
      children: () => {
        ComponentContext.Provider({
          value: { level: 'component', size: 'large' },
          children: () => {
            // Access all contexts
            const app = useContext(AppContext);
            const page = useContext(PageContext);
            const comp = useContext(ComponentContext);
          }
        });
      }
    });
  }
});
```

### Dynamic Context Updates

Update context values reactively:

```typescript
const ThemeContext = createContext({ mode: 'light' });

function App() {
  const [mode, setMode] = createSignal('light');
  
  // Context value is reactive
  createEffect(() => {
    ThemeContext.Provider({
      value: { mode: mode(), setMode },
      children: () => <UI />
    });
  });
}
```

## Debugging Patterns

### Performance Monitoring

Track computation performance:

```typescript
function createMonitoredMemo<T>(
  fn: () => T,
  name: string
): Accessor<T> {
  return createMemo(() => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > 16) { // Longer than 1 frame
      console.warn(`Slow memo "${name}": ${duration}ms`);
    }
    
    return result;
  });
}
```

### Update Tracking

Track when signals update:

```typescript
function createTrackedSignal<T>(
  initialValue: T,
  name: string
): Signal<T> {
  const [get, set] = createSignal(initialValue);
  
  const trackedSet: Setter<T> = (value) => {
    console.log(`[${name}] updating:`, value);
    set(value);
  };
  
  return [get, trackedSet];
}
```

### Dependency Visualization

Log dependency relationships:

```typescript
function logDependencies(label: string) {
  createEffect(() => {
    const owner = getOwner();
    const stats = getNodeStats();
    
    console.group(`Dependencies: ${label}`);
    console.log('Total nodes:', stats.total);
    console.log('By type:', stats.byType);
    console.groupEnd();
  });
}
```

## Testing Patterns

### Testing with Batch

Test multiple updates:

```typescript
import { batch, createSignal } from '@fluixi/reactive';

test('batches updates correctly', () => {
  const [count, setCount] = createSignal(0);
  let runs = 0;
  
  createEffect(() => {
    count();
    runs++;
  });
  
  batch(() => {
    setCount(1);
    setCount(2);
    setCount(3);
  });
  
  expect(runs).toBe(2); // Initial + batch
});
```

### Testing Transitions

Test low-priority updates:

```typescript
test('transitions defer updates', async () => {
  const [data, setData] = createSignal('initial');
  const [isPending, start] = useTransition();
  
  const promise = start(() => {
    setData('updated');
  });
  
  expect(isPending()).toBe(true);
  await promise;
  expect(isPending()).toBe(false);
  expect(data()).toBe('updated');
});
```

### Testing Error Boundaries

Test error handling:

```typescript
test('catches errors in effects', () => {
  const errors: Error[] = [];
  
  const result = catchError(
    () => {
      throw new Error('Test error');
    },
    (error) => {
      errors.push(error);
      return 'fallback';
    }
  );
  
  expect(result).toBe('fallback');
  expect(errors).toHaveLength(1);
});
```

## Summary

These advanced patterns enable:

- **Efficient batching** with `batch()` and `runUpdates()`
- **Priority control** through transition state tracking
- **Complex state** with derived graphs and state machines
- **Performance** through strategic memoization and untracking
- **Async handling** with suspense and error boundaries
- **Clean architecture** with context and ownership
- **Better debugging** with monitoring and tracking tools

Master these patterns to build sophisticated, performant reactive applications.