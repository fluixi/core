---
sidebar_position: 1
---

# Array Utilities

Powerful array manipulation utilities with deep integration with object utilities, providing comprehensive data processing capabilities for modern JavaScript/TypeScript applications.

## Overview

The array utilities module provides over 110 functions organized into logical categories, making it easy to perform complex array operations with ease. All functions are immutable, returning new arrays without modifying the originals.

## Key Features

- 🔒 **Immutable Operations** - All functions return new arrays
- 🎯 **Type-Safe** - Full TypeScript support with generics
- 🚀 **High Performance** - Optimized implementations
- 🔗 **Object Integration** - Seamless integration with object utilities
- 📊 **Statistical Functions** - Professional-grade statistics
- ⚡ **Async Support** - Built-in async operations
- 🔄 **Batch Processing** - Handle large datasets efficiently

## Installation

```typescript
import {
  chunk,
  flatten,
  unique,
  groupBy,
  sortBy,
  // ... other utilities
} from '@awc/utils/array/advanced';
```

## Quick Start

```typescript
import { sortBy, groupBy, sumBy, unique } from '@awc/utils/array/advanced';

const users = [
  { dept: 'sales', name: 'Alice', sales: 1000 },
  { dept: 'sales', name: 'Bob', sales: 1500 },
  { dept: 'eng', name: 'Charlie', sales: 800 }
];

// Sort by sales descending
const sorted = sortBy(users, [{ key: 'sales', dir: 'desc' }]);

// Group by department
const byDept = groupBy(users, 'dept');

// Calculate total sales
const total = sumBy(users, 'sales'); // 3300

// Get unique departments
const depts = unique(users, 'dept');
```

## Function Categories

### 📦 Basic Operations
- **Type Guards**: Check array types
- **Chunking**: Split arrays into smaller pieces
- **Flattening**: Flatten nested arrays
- **Uniqueness**: Remove duplicates

### 🎯 Data Organization
- **Grouping**: Group elements by key or function
- **Sorting**: Advanced multi-key sorting
- **Partitioning**: Split arrays by criteria

### 🔍 Search & Filter
- **Filtering**: Advanced filtering operations
- **Search**: Binary search, find operations
- **Selection**: Take, drop, slice operations

### 📊 Statistical Operations
- **Aggregation**: Sum, average, min, max
- **Statistics**: Median, mode, standard deviation
- **Normalization**: Normalize and standardize values
- **Ranking**: Assign ranks to values
- **Percentiles**: Calculate percentiles and quartiles

### 🔄 Transformations
- **Mapping**: Transform array elements
- **Zipping**: Combine multiple arrays
- **Transposing**: Convert rows to columns
- **Cartesian**: Cartesian product

### 🔢 Set Operations
- **Difference**: Elements in one array but not another
- **Intersection**: Common elements
- **Union**: Unique elements from all arrays
- **Subset/Superset**: Check containment

### ⚡ Async Operations
- **Map/Filter/Reduce**: Async versions of standard operations
- **Batch Processing**: Process large arrays in chunks
- **Parallel Processing**: Process with concurrency control

### 🎲 Random Operations
- **Shuffle**: Randomize array order
- **Sample**: Random element selection
- **Weighted Sampling**: Sample based on weights

### 🛠️ Advanced Utilities
- **Frequency Analysis**: Count occurrences
- **Cumulative Operations**: Running sums and scans
- **Array Comparison**: Deep equality checks
- **Array Generation**: Create arrays with patterns

## Documentation Structure

- **[Getting Started](./getting-started.md)** - Installation and basic usage
- **[API Reference](./api-reference.md)** - Complete function reference
- **[Examples](./examples.md)** - Real-world examples
- **[Statistical Operations](./statistical.md)** - Statistical functions guide
- **[Async Operations](./async.md)** - Async processing guide
- **[Best Practices](./best-practices.md)** - Tips and patterns

## Common Use Cases

### Data Processing Pipeline

```typescript
// Process user data
const result = users
  |> (arr => filterAsync(arr, async u => await isActive(u)))
  |> (arr => sortBy(arr, 'createdAt'))
  |> (arr => groupBy(arr, 'department'))
  |> (groups => Object.entries(groups).map(([dept, users]) => ({
      dept,
      count: users.length,
      totalSales: sumBy(users, 'sales')
    })));
```

### Statistical Analysis

```typescript
const data = [10, 20, 30, 40, 50];

const stats = {
  mean: avgBy(data, x => x),
  median: median(data),
  mode: mode(data),
  stdDev: standardDeviation(data),
  q1: percentile(data, 25),
  q3: percentile(data, 75)
};
```

### Batch Processing

```typescript
// Process large dataset in batches
await batchProcess(largeArray, 100, async (batch, index) => {
  console.log(`Processing batch ${index + 1}`);
  await saveToDatabase(batch);
});

// With concurrency control
await batchProcessParallel(largeArray, 100, 5, async (batch) => {
  await processData(batch);
});
```

### Data Transformation

```typescript
// Transform and merge data from multiple sources
const combined = mergeArraysByKey(
  [apiData1, apiData2, apiData3],
  'id',
  (existing, incoming) => ({
    ...existing,
    ...incoming,
    lastUpdated: new Date()
  })
);
```

## Performance Considerations

### Memory Efficiency

All functions are optimized for memory efficiency:

- **Lazy evaluation** where possible
- **Batch processing** for large datasets
- **Streaming support** for async operations

### Time Complexity

Most functions have optimal time complexity:

- **O(n)**: `map`, `filter`, `reduce`, `unique`, `groupBy`
- **O(n log n)**: `sortBy`, `median`, `percentile`
- **O(log n)**: `binarySearch` (on sorted arrays)
- **O(n²)**: `cartesian` (by nature of operation)

## TypeScript Support

Full TypeScript support with intelligent type inference:

```typescript
interface User {
  id: number;
  name: string;
  age: number;
  dept: string;
}

const users: User[] = [/*...*/];

// TypeScript infers types correctly
const names: string[] = pluck(users, 'name');
const grouped: Record<string, User[]> = groupBy(users, 'dept');
const sorted: User[] = sortBy(users, 'age');
```

## Browser & Node.js Support

Works in all modern JavaScript environments:

- ✅ Node.js 14+
- ✅ All modern browsers
- ✅ React Native
- ✅ Electron
- ✅ Deno

## Next Steps

- [Getting Started Guide](./getting-started.md) - Learn the basics
- [API Reference](./api-reference.md) - Explore all functions
- [Examples](./examples.md) - See real-world usage
- [Best Practices](./best-practices.md) - Write better code

## Contributing

Found a bug or have a feature request? Please open an issue on our GitHub repository.

## License

MIT License - see LICENSE file for details