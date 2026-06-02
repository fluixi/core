---
sidebar_position: 6
---

# Best Practices

Guidelines and patterns for using array utilities effectively in production applications.

## General Principles

### 1. Immutability First

All array utilities return new arrays, preserving immutability:

```typescript
import { sortBy, unique } from '@fluixi/utils/array/advanced';

const original = [{ id: 3 }, { id: 1 }, { id: 2 }];
const sorted = sortBy(original, 'id');

// ✅ Original is unchanged
console.log(original[0].id); // Still 3

// ✅ Sorted is a new array
console.log(sorted[0].id); // 1
```

**Why it matters:**
- Prevents unexpected mutations
- Makes code easier to reason about
- Enables time-travel debugging
- Works well with React/Vue state management

### 2. Choose the Right Function

Use specialized functions for better performance:

```typescript
// ✅ Good: Use binarySearch on sorted arrays
const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const index = binarySearch(sorted, 7); // O(log n)

// ❌ Avoid: Linear search when you have sorted data
const index = findIndex(sorted, x => x === 7); // O(n)

// ✅ Good: Use unique for deduplication
const unique = unique(array);

// ❌ Avoid: Manual deduplication
const unique = [...new Set(array)]; // OK for primitives, but unique handles objects
```

### 3. Leverage Type Safety

Take advantage of TypeScript's type inference:

```typescript
interface User {
  id: number;
  name: string;
  age: number;
}

const users: User[] = [/*...*/];

// ✅ TypeScript infers correct types
const names: string[] = pluck(users, 'name');
const grouped: Record<string, User[]> = groupBy(users, 'age');

// ✅ Autocomplete works for nested paths
const sorted = sortBy(users, 'age'); // 'age' is autocompleted
```

## Performance Optimization

### 1. Batch Processing for Large Datasets

Process large arrays in batches to avoid memory issues:

```typescript
// ✅ Good: Process in manageable chunks
await batchProcess(largeArray, 1000, async (batch) => {
  await processChunk(batch);
  // Memory is freed between batches
});

// ❌ Avoid: Loading everything in memory
const results = await Promise.all(
  largeArray.map(item => processItem(item))
);
```

### 2. Use Parallel Processing Wisely

Control concurrency to avoid overwhelming resources:

```typescript
// ✅ Good: Limit concurrent operations
await batchProcessParallel(items, 100, 5, async (batch) => {
  await apiCall(batch);
});
// Processes 100 items per batch, max 5 concurrent batches

// ❌ Avoid: Uncontrolled parallel execution
await Promise.all(items.map(item => apiCall(item)));
// Could spawn thousands of concurrent requests
```

### 3. Chain Operations Efficiently

Minimize iterations by chaining operations:

```typescript
// ✅ Good: Single pass through data
const result = filterCompact(
  sortBy(users, 'age'),
  user => user.isActive ? user : null
);

// ❌ Avoid: Multiple passes
const filtered = users.filter(u => u.isActive);
const sorted = sortBy(filtered, 'age');
```

### 4. Avoid Unnecessary Copies

```typescript
// ✅ Good: Sort once and use
const sorted = sortBy(users, 'age');
const top10 = take(sorted, 10);
const top20 = take(sorted, 20);

// ❌ Avoid: Sorting multiple times
const top10 = take(sortBy(users, 'age'), 10);
const top20 = take(sortBy(users, 'age'), 20);
```

## Common Patterns

### 1. Data Pipeline Pattern

Build composable data transformations:

```typescript
// Create reusable transformations
const filterActive = (users: User[]) => 
  filterCompact(users, u => u.isActive ? u : null);

const sortByScore = (users: User[]) => 
  sortBy(users, [{ key: 'score', dir: 'desc' }]);

const takeTop = (n: number) => (users: User[]) => 
  take(users, n);

// Compose into pipeline
const getTopActiveUsers = (users: User[], limit: number) =>
  users
    |> filterActive
    |> sortByScore
    |> takeTop(limit);

// Or without pipeline operator
const getTopActiveUsers = (users: User[], limit: number) =>
  takeTop(limit)(sortByScore(filterActive(users)));
```

### 2. Safe Property Access

Use path access for nested properties:

```typescript
// ✅ Good: Use path notation
const ages = pluck(users, 'profile.personal.age');
const sorted = sortBy(users, 'address.city');

// ❌ Avoid: Manual property access (prone to errors)
const ages = users.map(u => u.profile?.personal?.age);
```

### 3. Group-Transform-Reduce Pattern

```typescript
// Common pattern: Group → Transform → Aggregate
const salesByRegion = groupBy(sales, 'region');
const regionalStats = Object.entries(salesByRegion).map(([region, sales]) => ({
  region,
  total: sumBy(sales, 'amount'),
  average: avgBy(sales, 'amount'),
  count: sales.length
}));
```

### 4. Async Data Processing

Handle async operations efficiently:

```typescript
// ✅ Good: Use async utilities
const validated = await filterAsync(users, async user => {
  return await validateUser(user);
});

const enriched = await mapAsync(users, async user => {
  const details = await fetchUserDetails(user.id);
  return { ...user, details };
});

// ❌ Avoid: Manual Promise.all (loses context)
const validated = (await Promise.all(
  users.map(async user => ({
    user,
    valid: await validateUser(user)
  }))
)).filter(x => x.valid).map(x => x.user);
```

## Error Handling

### 1. Validate Inputs

Always validate inputs when dealing with external data:

```typescript
import { ensureArray, filterCompact } from '@fluixi/utils/array/advanced';

function processData(data: unknown) {
  // ✅ Ensure data is an array
  const array = ensureArray(data);
  
  // ✅ Filter out invalid entries
  const valid = filterCompact(array, item => {
    return isValidItem(item) ? item : null;
  });
  
  return processValidData(valid);
}
```

### 2. Handle Edge Cases

Functions handle edge cases gracefully, but be aware:

```typescript
// Empty arrays return safe defaults
median([]);              // undefined
sumBy([], 'price');      // 0
groupBy([], 'key');      // {}

// Always check for undefined
const med = median(numbers);
if (med !== undefined) {
  console.log('Median:', med);
}
```

### 3. Async Error Handling

```typescript
// ✅ Good: Wrap async operations in try-catch
try {
  const results = await mapAsync(items, async item => {
    const data = await fetchData(item);
    return processData(data);
  });
} catch (error) {
  console.error('Processing failed:', error);
  // Handle error appropriately
}

// ✅ Better: Handle errors per item
const results = await mapAsync(items, async item => {
  try {
    return await processItem(item);
  } catch (error) {
    console.error(`Failed to process ${item.id}:`, error);
    return null; // or default value
  }
});
const successful = compact(results);
```

## Memory Management

### 1. Large Array Processing

```typescript
// ✅ Good: Process in chunks and stream
async function processLargeFile(filePath: string) {
  const stream = createReadStream(filePath);
  const chunks: string[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk.toString());
    
    if (chunks.length >= 1000) {
      await processChunk(chunks);
      chunks.length = 0; // Clear processed chunks
    }
  }
  
  if (chunks.length > 0) {
    await processChunk(chunks);
  }
}

// ❌ Avoid: Loading entire file
const data = await readFile(filePath);
const lines = data.toString().split('\n');
await processAll(lines); // Huge memory usage
```

### 2. Avoid Memory Leaks

```typescript
// ✅ Good: Clear references when done
let cache = new Map();

function processWithCache(items: Item[]) {
  // Process items...
  
  // Clear cache when done
  cache.clear();
  cache = new Map();
}

// ❌ Avoid: Accumulating data indefinitely
const results: Result[] = [];
function process(item: Item) {
  results.push(processItem(item)); // Grows forever
}
```

## Testing Best Practices

### 1. Test Edge Cases

```typescript
import { chunk, median, percentile } from '@fluixi/utils/array/advanced';

describe('Array utilities', () => {
  it('handles empty arrays', () => {
    expect(chunk([], 5)).toEqual([]);
    expect(median([])).toBeUndefined();
  });
  
  it('handles invalid inputs', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([]);
    expect(chunk([1, 2, 3], -1)).toEqual([]);
  });
  
  it('handles single element', () => {
    expect(chunk([1], 5)).toEqual([[1]]);
    expect(median([42])).toBe(42);
  });
});
```

### 2. Test with Real Data Shapes

```typescript
// ✅ Good: Test with realistic data
const users = [
  { id: 1, name: 'Alice', profile: { age: 30 } },
  { id: 2, name: 'Bob', profile: { age: 25 } }
];

const sorted = sortBy(users, 'profile.age');
expect(sorted[0].name).toBe('Bob');

// ❌ Avoid: Only testing primitives
const sorted = sortBy([3, 1, 2]);
expect(sorted).toEqual([1, 2, 3]);
```

## Code Organization

### 1. Create Reusable Utilities

```typescript
// utils/arrayHelpers.ts
import { sortBy, groupBy, sumBy } from '@fluixi/utils/array/advanced';

export const sortByDate = <T extends { date: Date }>(items: T[]) =>
  sortBy(items, [{ key: 'date', dir: 'desc' }]);

export const calculateGroupTotals = <T extends { amount: number }>(
  items: T[],
  groupKey: keyof T
) => {
  const grouped = groupBy(items, groupKey as string);
  return Object.entries(grouped).map(([key, items]) => ({
    [groupKey]: key,
    total: sumBy(items, 'amount'),
    count: items.length
  }));
};
```

### 2. Type-Safe Wrappers

```typescript
// Create domain-specific wrappers
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

class ProductService {
  static sortByPrice(products: Product[], direction: 'asc' | 'desc' = 'asc') {
    return sortBy(products, [{ key: 'price', dir: direction }]);
  }
  
  static groupByCategory(products: Product[]) {
    return groupBy(products, 'category');
  }
  
  static calculateAveragePrice(products: Product[]) {
    return avgBy(products, 'price');
  }
}
```

## React Integration

### 1. Use with useMemo

```typescript
import { useMemo } from 'react';
import { sortBy, filterCompact } from '@fluixi/utils/array/advanced';

function UserList({ users }: { users: User[] }) {
  const sortedUsers = useMemo(
    () => sortBy(users, 'name'),
    [users]
  );
  
  const activeUsers = useMemo(
    () => filterCompact(sortedUsers, u => u.isActive ? u : null),
    [sortedUsers]
  );
  
  return (
    <ul>
      {activeUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### 2. Custom Hooks

```typescript
import { useMemo } from 'react';
import { groupBy, sortBy } from '@fluixi/utils/array/advanced';

function useGroupedData<T>(
  data: T[],
  groupKey: keyof T,
  sortKey?: keyof T
) {
  return useMemo(() => {
    const sorted = sortKey ? sortBy(data, sortKey as string) : data;
    return groupBy(sorted, groupKey as string);
  }, [data, groupKey, sortKey]);
}

// Usage
function Dashboard({ sales }: { sales: Sale[] }) {
  const salesByRegion = useGroupedData(sales, 'region', 'date');
  
  return (
    <div>
      {Object.entries(salesByRegion).map(([region, sales]) => (
        <RegionCard key={region} region={region} sales={sales} />
      ))}
    </div>
  );
}
```

## Performance Monitoring

### 1. Measure Performance

```typescript
function measurePerformance<T>(
  fn: () => T,
  label: string
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Usage
const sorted = measurePerformance(
  () => sortBy(largeArray, 'timestamp'),
  'Sorting large array'
);
```

### 2. Optimize Hot Paths

```typescript
// Profile and optimize frequently called code
class DataProcessor {
  private sortedCache = new Map<string, any[]>();
  
  getSorted(data: any[], key: string) {
    const cacheKey = `${key}-${data.length}`;
    
    if (this.sortedCache.has(cacheKey)) {
      return this.sortedCache.get(cacheKey)!;
    }
    
    const sorted = sortBy(data, key);
    this.sortedCache.set(cacheKey, sorted);
    return sorted;
  }
  
  clearCache() {
    this.sortedCache.clear();
  }
}
```

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Mutating During Iteration

```typescript
// ❌ Bad: Modifying array while iterating
for (let i = 0; i < users.length; i++) {
  if (shouldUpdate(users[i])) {
    users[i].status = 'updated'; // Mutation!
  }
}

// ✅ Good: Create new array
const updated = users.map(user => 
  shouldUpdate(user) 
    ? { ...user, status: 'updated' }
    : user
);
```

### ❌ Anti-Pattern 2: Over-Nesting

```typescript
// ❌ Bad: Deeply nested operations
const result = sortBy(
  filterCompact(
    unique(
      flatten(
        data.map(item => item.children)
      )
    )
  ),
  'timestamp'
);

// ✅ Good: Break into steps
const children = flatten(data.map(item => item.children));
const uniqueChildren = unique(children);
const validChildren = filterCompact(uniqueChildren);
const sorted = sortBy(validChildren, 'timestamp');
```

### ❌ Anti-Pattern 3: Ignoring TypeScript

```typescript
// ❌ Bad: Using 'any'
function process(data: any) {
  return sortBy(data, 'someKey');
}

// ✅ Good: Proper typing
function process<T extends { someKey: string }>(data: T[]) {
  return sortBy(data, 'someKey');
}
```

## Conclusion

Following these best practices will help you:

- Write more maintainable code
- Avoid common performance pitfalls
- Leverage TypeScript's type system
- Handle edge cases gracefully
- Build robust, production-ready applications

For more information, see:
- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [Getting Started](./getting-started.md)