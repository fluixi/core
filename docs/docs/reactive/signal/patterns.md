---
sidebar_position: 3
---


# Advanced Signal Patterns

This guide explores advanced patterns and techniques for working with the signal reactivity system. These patterns help manage complex state, optimize performance, and organize code in larger applications.

## Resource Management

### Using Cleanup Functions

Effects can return cleanup functions that run before the effect re-executes or when the owner is disposed:

```ts
createEffect((prev) => {
  // Setup phase
  const subscription = someService.subscribe();
  const timer = setInterval(doSomething, 1000);
  
  // Return cleanup function
  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
});
```

### Automatic Resource Disposal with Root

The `createRoot` function creates a reactive scope that automatically cleans up when disposed:

```ts
createRoot(dispose => {
  // All signals, effects and memos created here
  // will be automatically cleaned up when dispose() is called
  // or when the function completes
  
  const [data, setData] = createSignal([]);
  const totalItems = createMemo(() => data().length);
  
  createEffect(() => {
    console.log(`Total items: ${totalItems()}`);
  });
  
  // Call dispose() to clean up early if needed
  setTimeout(dispose, 10000);
});
```

## State Management

### Deriving Complex State

For complex derivations, you can compose multiple memos:

```ts
const [users] = createSignal([
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'user' }
]);

// Filter users by role
const adminUsers = createMemo(() => 
  users().filter(user => user.role === 'admin')
);

// Count admins
const adminCount = createMemo(() => adminUsers().length);

// Filter and transform in one step
const adminNames = createMemo(() => 
  adminUsers().map(user => user.name)
);
```

### State Machines

Signals can implement state machines for complex UI states:

```ts
// Create a simple state machine
function createStateMachine(initialState, transitions) {
  const [state, setState] = createSignal(initialState);
  
  // Event dispatcher
  function send(event) {
    const currentState = state();
    const nextState = transitions[currentState]?.[event];
    
    if (nextState) {
      setState(nextState);
      return true;
    }
    return false;
  }
  
  return [state, send];
}

// Usage
const [uiState, sendEvent] = createStateMachine('idle', {
  idle: { 
    FETCH: 'loading',
    ERROR: 'error' 
  },
  loading: { 
    SUCCESS: 'success',
    ERROR: 'error' 
  },
  error: { 
    RETRY: 'loading',
    CANCEL: 'idle' 
  },
  success: { 
    REFRESH: 'loading',
    RESET: 'idle' 
  }
});

// Transition the state
createEffect(() => {
  console.log(`UI State: ${uiState()}`);
});

sendEvent('FETCH'); // UI State: loading
```

## Performance Optimization

### Equality Checking

Custom equality functions can prevent unnecessary updates:

```ts
const [user, setUser] = createSignal(
  { id: 1, name: 'Alice', lastSeen: Date.now() },
  { 
    equals: (prev, next) => 
      prev.id === next.id && prev.name === next.name
      // Ignore lastSeen changes
  }
);
```

### Selective Updates with Memoization

Use memos to avoid recomputing expensive operations:

```ts
const [items, setItems] = createSignal([]);

// Expensive calculation only runs when items change
const sortedItems = createMemo(() => {
  console.log('Sorting items...');
  return [...items()].sort((a, b) => a.priority - b.priority);
});

// Filtered view only updates when relevant properties change
const importantItems = createMemo(() => {
  console.log('Filtering important items...');
  return sortedItems().filter(item => item.priority > 5);
});
```

### Untracking for Performance

The `untrack` function lets you access signals without creating dependencies:

```ts
createEffect(() => {
  // This creates a dependency
  const count = counter();
  
  // This does NOT create a dependency
  const config = untrack(() => settings());
  
  doSomethingWith(count, config);
  // Effect only re-runs when counter changes, not settings
});
```

### Batching Updates

Use `batch` to combine multiple state updates:

```ts
function resetForm() {
  batch(() => {
    setName('');
    setEmail('');
    setAge(0);
    setSubmitted(false);
    // Only triggers one update cycle
  });
}
```

## Architectural Patterns

### Using Signal Containers

Group related signals into containers:

```ts
function createUserStore(initialUser = null) {
  const [user, setUser] = createSignal(initialUser);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  
  // Derived state
  const isLoggedIn = createMemo(() => !!user());
  const userName = createMemo(() => user()?.name || 'Guest');
  
  // Actions
  async function login(credentials) {
    setLoading(true);
    setError(null);
    try {
      const userData = await api.login(credentials);
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  function logout() {
    setUser(null);
  }
  
  return {
    // State
    user,
    loading,
    error,
    
    // Derived
    isLoggedIn,
    userName,
    
    // Actions
    login,
    logout
  };
}

// Usage
const userStore = createUserStore();
```

### Component-Level Signals

Encapsulate component logic with signals:

```ts
function createCounter(initialCount = 0) {
  const [count, setCount] = createSignal(initialCount);
  const double = createMemo(() => count() * 2);
  
  function increment() {
    setCount(c => c + 1);
  }
  
  function decrement() {
    setCount(c => c - 1);
  }
  
  function reset() {
    setCount(initialCount);
  }
  
  return { count, double, increment, decrement, reset };
}

// Usage in a component
function Counter() {
  const { count, double, increment, decrement } = createCounter(0);
  
  return {
    render() {
      // Render logic using signals
    }
  };
}
```

## Advanced Techniques

### Lazy Initialization

Create signals with lazy initialization for expensive resources:

```ts
function createLazyResource(fetchFn) {
  const [data, setData] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [initialized, setInitialized] = createSignal(false);
  
  async function load() {
    if (initialized()) return data();
    
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
      setInitialized(true);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }
  
  return {
    data,
    loading,
    error,
    initialized,
    load
  };
}

// Usage
const userResource = createLazyResource(() => api.fetchUser(userId));

// Later, when needed
createEffect(() => {
  if (isVisible()) {
    userResource.load();
  }
});
```

### Signal Composition

Compose signals with utility functions:

```ts
function withDefault(accessor, defaultValue) {
  return () => accessor() ?? defaultValue;
}

function withLogging(accessor, label) {
  return () => {
    const value = accessor();
    console.log(`${label}:`, value);
    return value;
  }
}

const [user] = createSignal(null);
const safeUser = withDefault(user, { name: 'Guest' });
const loggedUser = withLogging(safeUser, 'Current user');

// Usage
console.log(loggedUser().name); // Logs "Current user: {name: 'Guest'}" and returns "Guest"
```

### Computed Collections

Efficiently handle collections with computed indices:

```ts
function createIndexed(itemsSignal, getKey) {
  const byId = createMemo(() => {
    const items = itemsSignal();
    const map = new Map();
    
    for (const item of items) {
      const key = getKey(item);
      map.set(key, item);
    }
    
    return map;
  });
  
  // Get an item by its key
  const getItem = (id) => byId().get(id);
  
  // Check if an item with the key exists
  const hasItem = (id) => byId().has(id);
  
  return {
    byId,
    getItem,
    hasItem
  };
}

// Usage
const [users] = createSignal([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

const userIndex = createIndexed(users, user => user.id);

// Efficient lookups
console.log(userIndex.getItem(1).name); // "Alice"
```

## Integrating with External Systems

### Using Deferred Promises

Create signals that resolve asynchronously using deferred promises:

```js
function createAsyncAPI(url) {
  const [data, setData] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  
  function fetchData(params = {}) {
    // Create a deferred promise we can resolve/reject manually
    const deferred = createDeferred();
    
    setLoading(true);
    setError(null);
    
    // Perform the fetch operation
    fetch(url, { params })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        setData(result);
        setLoading(false);
        deferred.resolve(result);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
        deferred.reject(err);
      });
      
    // Return the promise for chaining
    return deferred.promise;
  }
  
  return {
    data,
    loading,
    error,
    fetchData
  };
}

// Usage
const api = createAsyncAPI('/api/users');

// Trigger fetch and use promise API
api.fetchData({ limit: 10 })
  .then(data => console.log("Data fetched:", data))
  .catch(err => console.error("Fetch failed:", err));
  
// Use reactive signals in UI
createEffect(() => {
  if (api.loading()) {
    console.log("Loading...");
  } else if (api.error()) {
    console.log("Error:", api.error());
  } else {
    console.log("Data:", api.data());
  }
});
```

### Wrapping DOM Events

Create signals from DOM events:

```js
function createEventSignal(element, eventName) {
  const [value, setValue] = createSignal(null);
  
  const handler = (event) => setValue(event);
  element.addEventListener(eventName, handler);
  
  createEffect(() => {
    // This effect captures the current element
    return () => {
      element.removeEventListener(eventName, handler);
    };
  });
  
  return value;
}

// Usage
const clickSignal = createEventSignal(button, 'click');
const mouseMoveSignal = createEventSignal(document, 'mousemove');

createEffect(() => {
  const event = mouseMoveSignal();
  if (event) {
    console.log(`Mouse position: ${event.clientX}, ${event.clientY}`);
  }
});
```

### Using Signals with Web APIs

Integrate signals with browser APIs:

```ts
// Create a signal from media queries
function createMediaQuery(query) {
  const mq = window.matchMedia(query);
  const [matches, setMatches] = createSignal(mq.matches);
  
  const handler = (e) => setMatches(e.matches);
  mq.addEventListener('change', handler);
  
  createEffect(() => {
    return () => mq.removeEventListener('change', handler);
  });
  
  return matches;
}

// Usage
const isDarkMode = createMediaQuery('(prefers-color-scheme: dark)');
const isSmallScreen = createMediaQuery('(max-width: 768px)');

createEffect(() => {
  document.body.classList.toggle('dark-theme', isDarkMode());
  document.body.classList.toggle('mobile-layout', isSmallScreen());
});
```

## Debugging and Testing

### Signal Inspection

Add debugging information to signals:

```ts
function createDebugSignal(initialValue, name) {
  const [value, setValue] = createSignal(initialValue);
  
  return [
    // Enhanced getter
    () => {
      const v = value();
      console.log(`[READ] ${name}:`, v);
      return v;
    },
    // Enhanced setter
    (newValue) => {
      console.log(`[WRITE] ${name}:`, newValue);
      setValue(newValue);
    },
    // Debug utilities
    {
      name,
      toString() {
        return `DebugSignal(${name}): ${value()}`;
      },
      log() {
        console.log(`Signal ${name} =`, value());
      }
    }
  ];
}

// Usage
const [count, setCount, debugCount] = createDebugSignal(0, 'counter');
setCount(5); // [WRITE] counter: 5
console.log(count()); // [READ] counter: 5, then logs 5
```

### Testing Signals

Structure for testability:

```ts
// Create testable signal container
function createCounter(initialCount = 0, options = {}) {
  const { onChange } = options;
  
  const [count, setCount] = createSignal(initialCount);
  
  function increment() {
    setCount(c => {
      const newValue = c + 1;
      if (onChange) onChange(newValue);
      return newValue;
    });
  }
  
  return {
    count,
    increment
  };
}

// Test the counter
function testCounter() {
  let lastValue;
  const counter = createCounter(0, {
    onChange: (value) => {
      lastValue = value;
    }
  });
  
  counter.increment();
  console.assert(counter.count() === 1, "Count should be 1");
  console.assert(lastValue === 1, "onChange should be called with new value");
  
  counter.increment();
  console.assert(counter.count() === 2, "Count should be 2");
  console.assert(lastValue === 2, "onChange should be called with new value");
  
  console.log("All tests passed!");
}
```

## Best Practices

1. **Keep signals granular** - Create specific signals for distinct pieces of state
2. **Use memos for derived state** - Avoid recalculating values in effects
3. **Clean up resources** - Return cleanup functions from effects
4. **Batch related updates** - Use `batch` for efficiency
5. **Use equality functions** - Prevent unnecessary updates with custom equality checks
6. **Organize related signals** - Group signals into logical containers
7. **Avoid deep nesting** - Flatten structures where possible
8. **Be careful with untracked** - Use sparingly to maintain reactivity
9. **Handle signal disposal** - Use root owners or manual disposal
10. **Optimize reads/writes** - Minimize signal accesses in loops
