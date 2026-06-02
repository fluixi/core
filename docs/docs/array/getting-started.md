---
sidebar_position: 2
---

# Getting Started

Learn how to use the advanced array utilities in your projects.

## Installation

The array utilities are part of the `@fluixi/utils` package. If you haven't installed it yet:

```bash
npm install @fluixi/utils
# or
yarn add @fluixi/utils
# or
pnpm add @fluixi/utils
```

## Basic Import

Import the functions you need from the advanced array module:

```typescript
import { chunk, unique, groupBy, sortBy } from '@fluixi/utils/array/advanced';
```

Or import everything:

```typescript
import * as arrayUtils from '@fluixi/utils/array/advanced';
```

## Your First Array Operations

### Basic Transformations

```typescript
import { chunk, flatten, unique } from '@fluixi/utils/array/advanced';

// Split array into chunks
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const chunks = chunk(numbers, 3);
// [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

// Flatten nested arrays
const nested = [[1, 2], [3, 4], [5, 6]];
const flat = flatten(nested);
// [1, 2, 3, 4, 5, 6]

// Remove duplicates
const withDuplicates = [1, 2, 2, 3, 3, 3, 4];
const uniqueValues = unique(withDuplicates);
// [1, 2, 3, 4]
```

### Working with Objects

Array utilities work seamlessly with arrays of objects:

```typescript
import { sortBy, groupBy, pluck } from '@fluixi/utils/array/advanced';

const users = [
  { id: 1, name: 'Alice', age: 30, dept: 'Engineering' },
  { id: 2, name: 'Bob', age: 25, dept: 'Sales' },
  { id: 3, name: 'Charlie', age: 35, dept: 'Engineering' },
  { id: 4, name: 'Diana', age: 28, dept: 'Sales' }
];

// Sort by age
const sortedByAge = sortBy(users, 'age');

// Group by department
const byDept = groupBy(users, 'dept');
// {
//   Engineering: [Alice, Charlie],
//   Sales: [Bob, Diana]
// }

// Extract all names
const names = pluck(users, 'name');
// ['Alice', 'Bob', 'Charlie', 'Diana']
```

## Key Concepts

### Immutability

All functions return **new arrays** and never modify the original:

```typescript
import { sortBy } from '@fluixi/utils/array/advanced';

const original = [{ age: 30 }, { age: 20 }, { age: 25 }];
const sorted = sortBy(original, 'age');

console.log(original[0].age); // Still 30
console.log(sorted[0].age);   // 20
```

### Path Access

Many functions support deep path access for nested objects:

```typescript
import { sortBy, groupBy, pluck } from '@fluixi/utils/array/advanced';

const data = [
  { user: { profile: { age: 30 } } },
  { user: { profile: { age: 25 } } },
  { user: { profile: { age: 35 } } }
];

// Access nested properties with dot notation
const sorted = sortBy(data, 'user.profile.age');
const ages = pluck(data, 'user.profile.age');
// [30, 25, 35]
```

### Selector Functions

Most functions accept either string keys or selector functions:

```typescript
import { unique, groupBy, sortBy } from '@fluixi/utils/array/advanced';

const products = [
  { id: 1, name: 'Widget', price: 10.99 },
  { id: 2, name: 'Gadget', price: 10.99 },
  { id: 3, name: 'Doohickey', price: 15.99 }
];

// Using string key
const uniqueByPrice1 = unique(products, 'price');

// Using selector function
const uniqueByPrice2 = unique(products, p => p.price);

// Group by price range
const byPriceRange = groupBy(products, p => {
  return p.price < 15 ? 'cheap' : 'expensive';
});
```

## Common Patterns

### Chaining Operations

Combine multiple operations for powerful data transformations:

```typescript
import { sortBy, take, pluck } from '@fluixi/utils/array/advanced';

const topSalespeople = 
  sortBy(employees, [{ key: 'sales', dir: 'desc' }])
    |> (arr => take(arr, 5))
    |> (arr => pluck(arr, 'name'));
```

Without pipeline operator:

```typescript
const sorted = sortBy(employees, [{ key: 'sales', dir: 'desc' }]);
const top5 = take(sorted, 5);
const names = pluck(top5, 'name');
```

### Filtering and Mapping

```typescript
import { filterCompact, flatMap } from '@fluixi/utils/array/advanced';

// Filter and remove nullish values in one go
const validUsers = filterCompact(users, u => u.isActive ? u : null);

// Map and flatten
const allTags = flatMap(articles, a => a.tags);
```

### Statistical Analysis

```typescript
import { 
  sumBy, 
  avgBy, 
  median, 
  standardDeviation 
} from '@fluixi/utils/array/advanced';

const sales = [
  { rep: 'Alice', amount: 1000 },
  { rep: 'Bob', amount: 1500 },
  { rep: 'Charlie', amount: 800 }
];

const totalSales = sumBy(sales, 'amount');        // 3300
const avgSales = avgBy(sales, 'amount');          // 1100
const amounts = pluck(sales, 'amount');
const medianSales = median(amounts);              // 1000
const stdDev = standardDeviation(amounts);        // ~305
```

## Working with TypeScript

The array utilities are fully typed with TypeScript:

```typescript
import { groupBy, sortBy, pluck } from '@fluixi/utils/array/advanced';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

const products: Product[] = [
  { id: 1, name: 'Laptop', category: 'Electronics', price: 999 },
  { id: 2, name: 'Mouse', category: 'Electronics', price: 29 }
];

// TypeScript knows the return types
const byCategory: Record<string, Product[]> = groupBy(products, 'category');
const sorted: Product[] = sortBy(products, 'price');
const names: string[] = pluck(products, 'name');

// Autocomplete works for property names
const expensive = sortBy(products, 'price'); // 'price' is autocompleted
```

## Error Handling

Functions handle edge cases gracefully:

```typescript
import { chunk, sortBy, median } from '@fluixi/utils/array/advanced';

// Empty arrays
chunk([], 2);           // []
sortBy([], 'key');      // []
median([]);             // undefined

// Invalid inputs
chunk([1, 2, 3], 0);    // []
chunk([1, 2, 3], -1);   // []

// Non-array inputs
sortBy(null, 'key');    // []
chunk('string', 2);     // []
```

## Performance Tips

### Use the Right Function

```typescript
// ✅ Good: Use binary search on sorted arrays
const index = binarySearch(sortedArray, target);

// ❌ Avoid: Linear search on sorted arrays
const index = findIndex(sortedArray, x => x === target);
```

### Batch Large Operations

```typescript
import { batchProcess } from '@fluixi/utils/array/advanced';

// ✅ Good: Process in batches
await batchProcess(largeArray, 100, async (batch) => {
  await processChunk(batch);
});

// ❌ Avoid: Processing all at once
await Promise.all(largeArray.map(item => processItem(item)));
```

### Avoid Unnecessary Operations

```typescript
// ✅ Good: Chain operations efficiently
const result = unique(sortBy(filter(data), 'key'));

// ❌ Avoid: Multiple iterations
const filtered = filter(data);
const sorted = sortBy(filtered, 'key');
const unique = unique(sorted);
```

## Next Steps

Now that you understand the basics, explore:

- **[API Reference](./api-reference.md)** - Complete function documentation
- **[Examples](./examples.md)** - Real-world use cases
- **[Statistical Operations](./statistical.md)** - Advanced statistics
- **[Async Operations](./async.md)** - Working with async data
- **[Best Practices](./best-practices.md)** - Patterns and tips

## Quick Reference

### Most Used Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `chunk` | Split into chunks | `chunk([1,2,3,4], 2)` → `[[1,2],[3,4]]` |
| `flatten` | Flatten one level | `flatten([[1],[2]])` → `[1,2]` |
| `unique` | Remove duplicates | `unique([1,2,2,3])` → `[1,2,3]` |
| `groupBy` | Group by key | `groupBy(arr, 'type')` |
| `sortBy` | Sort by key(s) | `sortBy(arr, 'age')` |
| `pluck` | Extract values | `pluck(arr, 'name')` |
| `sumBy` | Sum by key | `sumBy(arr, 'price')` |
| `take` | First n items | `take(arr, 5)` |
| `partition` | Split by predicate | `partition(arr, x => x > 0)` |

### Import Cheatsheet

```typescript
// Core operations
import { 
  chunk, flatten, unique, 
  groupBy, sortBy 
} from '@fluixi/utils/array/advanced';

// Statistical
import { 
  sumBy, avgBy, median, 
  standardDeviation, percentile 
} from '@fluixi/utils/array/advanced';

// Async
import { 
  mapAsync, filterAsync, 
  batchProcess 
} from '@fluixi/utils/array/advanced';

// Set operations
import { 
  difference, intersection, union 
} from '@fluixi/utils/array/advanced';
```

## Getting Help

If you encounter issues or have questions:

1. Check the [API Reference](./api-reference.md) for detailed documentation
2. Look at [Examples](./examples.md) for common patterns
3. Review [Best Practices](./best-practices.md) for tips
4. Open an issue on GitHub for bugs or feature requests