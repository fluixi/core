---
sidebar_position: 1
---

# Function Utilities

Comprehensive collection of functional programming utilities including memoization, debouncing, throttling, composition, currying, and more.

## Overview

The function utilities module provides over 30 powerful functions for functional programming patterns, performance optimization, and advanced function manipulation. All utilities are designed to work seamlessly in both browser and Node.js environments.

## Key Features

- 🎯 **Performance Optimization** - Memoization, debouncing, throttling with TTL support
- 🔄 **Function Composition** - Compose, pipe, curry, partial application
- ⏱️ **Timing Control** - Defer, delay, retry, timeout wrappers
- 🛡️ **Error Handling** - Try-catch wrappers, retry with backoff
- 🔧 **Function Transformation** - Flip, ary, unary, negate
- 🎪 **Call Restrictions** - Once, before, after call limits
- ✅ **Type Guards** - Check for functions, promises, async functions

## Installation

```typescript
import {
  memoize,
  debounce,
  throttle,
  compose,
  pipe,
  curry,
  // ... other utilities
} from '@fluixi/utils/functions';
```

## Quick Start

### Memoization

Cache expensive function results:

```typescript
import { memoize } from '@fluixi/utils/functions';

const expensiveCalculation = memoize((n: number) => {
  console.log('Computing...');
  return n * n;
});

expensiveCalculation(5); // Logs "Computing...", returns 25
expensiveCalculation(5); // Returns 25 from cache (no log)
```

### Debouncing

Delay function execution until after a period of inactivity:

```typescript
import { debounce } from '@fluixi/utils/functions';

const searchApi = debounce((query: string) => {
  console.log('Searching for:', query);
}, 300);

searchApi('hello'); // Won't execute immediately
searchApi('hello world'); // Cancels previous, waits 300ms
// After 300ms of inactivity: Logs "Searching for: hello world"
```

### Throttling

Limit function execution to once per time period:

```typescript
import { throttle } from '@fluixi/utils/functions';

const handleScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100);

window.addEventListener('scroll', handleScroll);
// Function executes at most once per 100ms
```

### Function Composition

Combine multiple functions:

```typescript
import { pipe, compose } from '@fluixi/utils/functions';

const double = (x: number) => x * 2;
const addOne = (x: number) => x + 1;
const square = (x: number) => x * x;

// Pipe: left to right
const calculate1 = pipe(double, addOne, square);
calculate1(5); // ((5 * 2) + 1)² = 121

// Compose: right to left
const calculate2 = compose(square, addOne, double);
calculate2(5); // ((5 * 2) + 1)² = 121
```

### Currying

Transform multi-argument functions:

```typescript
import { curry } from '@fluixi/utils/functions';

const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);

curriedAdd(1)(2)(3);        // 6
curriedAdd(1, 2)(3);        // 6
curriedAdd(1)(2, 3);        // 6
curriedAdd(1, 2, 3);        // 6
```

## Function Categories

### Performance Optimization

- **`memoize`** - Cache function results
- **`memoizeWithTTL`** - Cache with time-to-live
- **`debounce`** - Delay execution until inactivity
- **`throttle`** - Limit execution frequency
- **`defer`** - Defer execution to next tick
- **`delay`** - Delay execution by milliseconds

### Function Composition

- **`compose`** - Compose functions right to left
- **`pipe`** - Pipe functions left to right
- **`flow`** - Alias for pipe
- **`flowRight`** - Alias for compose

### Currying & Partial Application

- **`curry`** - Curry a function
- **`partial`** - Partial application from left
- **`partialRight`** - Partial application from right
- **`bind`** - Bind this context

### Function Transformation

- **`flip`** - Reverse function arguments
- **`negate`** - Negate predicate result
- **`rearg`** - Rearrange arguments
- **`overArgs`** - Transform arguments
- **`ary`** - Cap function arity
- **`unary`** - Create unary function

### Call Restrictions

- **`once`** - Execute only once
- **`before`** - Execute before n calls
- **`after`** - Execute after n calls

### Error Handling

- **`tryCatch`** - Wrap with error handler
- **`retry`** - Retry on failure with backoff
- **`withTimeout`** - Add timeout to async functions

### Type Guards

- **`isFunction`** - Check if value is a function
- **`isAsyncFunction`** - Check if async function
- **`isPromise`** - Check if value is a promise

## Common Use Cases

### Search Input with Debounce

```typescript
import { debounce } from '@fluixi/utils/functions';

const SearchInput = () => {
  const searchApi = debounce(async (query: string) => {
    const results = await fetch(`/api/search?q=${query}`);
    return results.json();
  }, 300);

  const handleChange = (e: Event) => {
    const query = (e.target as HTMLInputElement).value;
    searchApi(query);
  };

  return <input onChange={handleChange} />;
};
```

### Scroll Event Throttling

```typescript
import { throttle } from '@fluixi/utils/functions';

const trackScroll = throttle(() => {
  const scrollPercentage = (window.scrollY / document.body.scrollHeight) * 100;
  analytics.track('scroll', { percentage: scrollPercentage });
}, 1000);

window.addEventListener('scroll', trackScroll);
```

### API Call with Retry

```typescript
import { retry } from '@fluixi/utils/functions';

const fetchUser = retry(
  async (id: string) => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  {
    retries: 3,
    delay: 1000,
    backoff: 2,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt}:`, error.message);
    }
  }
);
```

### Expensive Calculation with Memoization

```typescript
import { memoize } from '@fluixi/utils/functions';

const fibonacci = memoize((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(40); // Fast due to memoization
```

### Data Processing Pipeline

```typescript
import { pipe } from '@fluixi/utils/functions';

const processData = pipe(
  (data: string[]) => data.filter(s => s.length > 0),
  (data: string[]) => data.map(s => s.trim()),
  (data: string[]) => data.map(s => s.toLowerCase()),
  (data: string[]) => [...new Set(data)],
  (data: string[]) => data.sort()
);

const cleaned = processData(['  Hello  ', 'WORLD', '', 'hello']);
// ['hello', 'world']
```

### Initialize Once

```typescript
import { once } from '@fluixi/utils/functions';

const initializeApp = once(() => {
  console.log('Initializing...');
  // Setup code
  return { initialized: true };
});

initializeApp(); // Logs "Initializing...", returns { initialized: true }
initializeApp(); // Returns cached result, no log
initializeApp(); // Returns cached result, no log
```

## Performance Considerations

### Memoization Cache Management

```typescript
import { memoize } from '@fluixi/utils/functions';

const fn = memoize(expensiveOperation);

// Clear cache manually when needed
fn.cache.clear();

// Or use TTL-based memoization
const fnWithTTL = memoizeWithTTL(expensiveOperation, 60000); // 1 minute
```

### Debounce vs Throttle

**Use debounce when:**
- Waiting for user to stop typing (search input)
- Window resize events
- Form validation
- Auto-save functionality

**Use throttle when:**
- Scroll events
- Mouse movement
- Animation frames
- Rate-limiting API calls

### Memory Leaks Prevention

```typescript
import { debounce } from '@fluixi/utils/functions';

// In components, clean up on unmount
const debouncedFn = debounce(myFunction, 300);

// Clean up
debouncedFn.cancel();
```

## TypeScript Support

All functions have full TypeScript support with proper type inference:

```typescript
import { memoize, curry, compose } from '@fluixi/utils/functions';

// Type inference works correctly
const add = memoize((a: number, b: number): number => a + b);
const result: number = add(1, 2); // Type is number

// Curry maintains types
const multiply = curry((a: number, b: number, c: number) => a * b * c);
const step1 = multiply(2);        // (b: number, c: number) => number
const step2 = step1(3);           // (c: number) => number
const final = step2(4);           // number = 24

// Composition preserves types
const double = (x: number) => x * 2;
const toString = (x: number) => x.toString();
const composed = compose(toString, double);
const output: string = composed(5); // "10"
```

## React Integration

### Custom Hooks

```typescript
import { useCallback, useEffect } from 'react';
import { debounce } from '@fluixi/utils/functions';

function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const debouncedFn = useCallback(
    debounce(callback, delay),
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn;
}

// Usage
function SearchComponent() {
  const search = useDebounce((query: string) => {
    console.log('Searching:', query);
  }, 300);

  return <input onChange={(e) => search(e.target.value)} />;
}
```

## Best Practices

### 1. Clean Up Resources

Always clean up debounced/throttled functions:

```typescript
const debouncedFn = debounce(myFunction, 300);

// When done (e.g., component unmount)
debouncedFn.cancel();
```

### 2. Use Appropriate Timing

```typescript
// Too short: May not debounce effectively
const tooShort = debounce(fn, 50);

// Good: Balances responsiveness and debouncing
const good = debounce(fn, 300);

// Too long: May feel unresponsive
const tooLong = debounce(fn, 2000);
```

### 3. Memoize Pure Functions Only

```typescript
// ✅ Good: Pure function
const pure = memoize((x: number) => x * 2);

// ❌ Bad: Impure function with side effects
const impure = memoize((x: number) => {
  console.log(x); // Side effect!
  return x * 2;
});
```

### 4. Choose the Right Tool

```typescript
// For single execution
const init = once(initialize);

// For rate limiting
const limited = throttle(apiCall, 1000);

// For delayed execution after inactivity
const search = debounce(searchApi, 300);

// For caching results
const calc = memoize(expensiveCalc);
```

## Documentation

- [API Reference](./api-reference.md) - Complete function documentation
- [Examples](./examples.md) - Real-world use cases
- [Best Practices](./best-practices.md) - Tips and patterns

## Browser Support

All utilities work in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 14+
- ✅ React Native
- ✅ Electron

## Next Steps

- Check out the [API Reference](./api-reference.md) for detailed documentation
- See [Examples](./examples.md) for real-world usage patterns
- Review [Best Practices](./best-practices.md) for optimization tips