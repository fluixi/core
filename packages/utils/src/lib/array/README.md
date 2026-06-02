# Array Utilities Documentation

Welcome to the comprehensive documentation for the advanced array utilities module.

## 📚 Documentation Structure

This documentation is organized into the following sections:

### [Index (Overview)](./index.md)
Start here for a high-level overview of all available utilities, key features, and quick start examples.

### [Getting Started](./getting-started.md)
Learn the basics:
- Installation and setup
- First array operations
- Key concepts (immutability, path access, selector functions)
- Common patterns
- TypeScript integration

### [Examples](./examples.md)
Real-world examples including:
- Data processing pipelines
- E-commerce applications
- Analytics and reporting
- User management
- API response processing
- Financial calculations
- Gaming leaderboards

### [API Reference](./array-utilities.md)
Complete function reference organized by category:
- Type guards
- Chunking & flattening
- Uniqueness & grouping
- Sorting & ordering
- Set operations
- Statistical operations
- Async operations
- And much more...

### [Best Practices](./best-practices.md)
Guidelines for production use:
- Performance optimization
- Error handling
- Memory management
- Testing strategies
- Code organization
- React integration

## 🚀 Quick Links

**Most Popular Functions:**
- `chunk` - Split arrays into chunks
- `unique` - Remove duplicates
- `groupBy` - Group by key or function
- `sortBy` - Advanced multi-key sorting
- `filterCompact` - Filter and remove nullish values
- `sumBy` / `avgBy` - Statistical aggregation
- `batchProcess` - Process large datasets
- `mapAsync` - Async array mapping

**By Use Case:**
- **Data Processing**: `flatten`, `flattenDeep`, `transpose`, `zip`
- **Analytics**: `median`, `percentile`, `standardDeviation`, `quartiles`
- **Set Operations**: `difference`, `intersection`, `union`
- **Async Processing**: `mapAsync`, `filterAsync`, `batchProcess`

## 🎯 Feature Highlights

✅ **111+ Utility Functions** - Comprehensive array manipulation toolkit

✅ **Immutable Operations** - All functions return new arrays

✅ **TypeScript First** - Full type safety with intelligent inference

✅ **High Performance** - Optimized implementations for production use

✅ **Object Integration** - Deep path access with object utilities

✅ **Async Support** - Built-in async operations with batch processing

✅ **Statistical Functions** - Professional-grade statistics (median, percentile, standard deviation, etc.)

✅ **Production Ready** - Thoroughly tested with 138+ test cases

## 💡 Quick Example

```typescript
import { 
  sortBy, 
  groupBy, 
  sumBy, 
  unique 
} from '@fluixi/utils/array/advanced';

const sales = [
  { region: 'North', rep: 'Alice', amount: 1000 },
  { region: 'South', rep: 'Bob', amount: 1500 },
  { region: 'North', rep: 'Charlie', amount: 800 }
];

// Group by region
const byRegion = groupBy(sales, 'region');

// Calculate totals
const totals = Object.entries(byRegion).map(([region, sales]) => ({
  region,
  total: sumBy(sales, 'amount'),
  reps: unique(sales, 'rep').length
}));

// Sort by total descending
const sorted = sortBy(totals, [{ key: 'total', dir: 'desc' }]);
```

## 📦 Installation

```bash
npm install @fluixi/utils
```

```typescript
import { chunk, unique, sortBy } from '@fluixi/utils/array/advanced';
```

## 🔍 Finding What You Need

### By Category

- **Basic Operations**: Type guards, chunking, flattening
- **Data Organization**: Grouping, sorting, partitioning
- **Search & Filter**: Finding, filtering, selection
- **Statistics**: Sum, average, median, percentiles
- **Transformations**: Mapping, zipping, transposing
- **Set Operations**: Difference, intersection, union
- **Async**: Async map/filter/reduce, batch processing
- **Advanced**: Frequency analysis, cumulative operations

### By Problem

**"I need to..."**

- Remove duplicates → `unique`
- Split into chunks → `chunk`
- Flatten nested arrays → `flatten`, `flattenDeep`
- Sort by multiple keys → `sortBy`
- Group items → `groupBy`
- Calculate statistics → `sumBy`, `avgBy`, `median`, `percentile`
- Process large dataset → `batchProcess`, `batchProcessParallel`
- Work with async data → `mapAsync`, `filterAsync`, `reduceAsync`
- Find common elements → `intersection`
- Remove specific values → `without`, `difference`

## 🧪 Testing

All utilities are thoroughly tested:

```bash
# Run array utility tests
npm test -- array/advanced
```

**Coverage:**
- ✅ 138+ test cases
- ✅ 100% test pass rate
- ✅ Edge cases covered
- ✅ Type safety verified

## 🤝 Contributing

Found a bug or have a feature request?

1. Check the [API Reference](./array-utilities.md) for current functionality
2. Review [Examples](./examples.md) for usage patterns
3. Open an issue on GitHub with detailed information

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Related Documentation

- [Object Utilities](../objects/) - Deep path access, cloning, merging
- [Color Utilities](../color/) - Color manipulation and conversion
- [Reactive Utilities](../reactive/) - Reactive state management

## 📞 Need Help?

- Check [Getting Started](./getting-started.md) for basics
- Browse [Examples](./examples.md) for real-world usage
- Review [Best Practices](./best-practices.md) for optimization tips
- Consult [API Reference](./array-utilities.md) for detailed documentation

---

**Start Reading:** [Index (Overview)](./index.md) → [Getting Started](./getting-started.md)