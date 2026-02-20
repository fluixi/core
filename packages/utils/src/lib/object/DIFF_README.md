# Object Diff Utilities

A comprehensive set of utilities for comparing objects and tracking changes with support for deeply nested structures and array index notation.

## Features

- ✅ Deep object comparison with nested structure preservation
- ✅ Array index notation support (e.g., `users[0].name`, `items[2].tags[1]`)
- ✅ Detailed change tracking (added, deleted, modified)
- ✅ Custom equality functions
- ✅ Configurable behavior (include/exclude deletions and additions)
- ✅ Path extraction for changed values
- ✅ Diff application to merge changes
- ✅ TypeScript-first with full type safety

## Installation

```typescript
import {
  diffObject,
  diffObjectDetailed,
  hasObjectChanges,
  applyDiff,
  getChangedPaths,
} from '@awc/utils/object';
```

## API Reference

### `diffObject<T>(oldObj: T, newObj: T, options?: DiffOptions): Partial<T>`

Compares two objects and returns only the changed values while preserving the object structure.

#### Options

```typescript
interface DiffOptions {
  includeDeleted?: boolean;      // Include deleted properties (default: false)
  includeAdded?: boolean;        // Include added properties (default: true)
  deepArrayComparison?: boolean; // Deep compare arrays (default: true)
  equalityFn?: (a: any, b: any) => boolean; // Custom equality function
  preserveStructure?: boolean;   // Keep unchanged values as undefined (default: false)
}
```

#### Examples

**Basic Usage:**
```typescript
const old = { a: 1, b: 2, c: 3 };
const newObj = { a: 1, b: 4, c: 3 };
const diff = diffObject(old, newObj);
// Returns: { b: 4 }
```

**Nested Objects:**
```typescript
const old = {
  user: {
    name: 'John',
    age: 30,
    address: { city: 'NYC', zip: '10001' }
  }
};

const newObj = {
  user: {
    name: 'John',
    age: 31,
    address: { city: 'LA', zip: '10001' }
  }
};

const diff = diffObject(old, newObj);
// Returns: {
//   user: {
//     age: 31,
//     address: { city: 'LA' }
//   }
// }
```

**Arrays with Objects:**
```typescript
const old = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
};

const newObj = {
  users: [
    { id: 1, name: 'Alice', role: 'super-admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
};

const diff = diffObject(old, newObj);
// Returns: {
//   users: [
//     { id: 1, name: 'Alice', role: 'super-admin' },
//     { id: 2, name: 'Bob', role: 'user' }
//   ]
// }
```

**Including Deletions:**
```typescript
const old = { a: 1, b: 2, c: 3 };
const newObj = { a: 1, b: 2 };
const diff = diffObject(old, newObj, { includeDeleted: true });
// Returns: { c: undefined }
```

---

### `diffObjectDetailed<T>(oldObj: T, newObj: T, options?: DiffOptions): DiffResult<T>`

Returns detailed information about changes including paths with array indices.

#### Return Type

```typescript
interface DiffResult<T> {
  changes: Partial<T>;     // Object with only changed values
  added: string[];         // Paths that were added
  deleted: string[];       // Paths that were deleted
  modified: string[];      // Paths that were modified
  hasChanges: boolean;     // Whether any changes exist
}
```

#### Examples

**Basic Usage:**
```typescript
const old = { a: 1, b: 2, c: 3 };
const newObj = { a: 1, b: 4, d: 5 };
const result = diffObjectDetailed(old, newObj, { includeDeleted: true });

// Result:
// {
//   changes: { b: 4, c: undefined, d: 5 },
//   added: ['d'],
//   deleted: ['c'],
//   modified: ['b'],
//   hasChanges: true
// }
```

**Array Index Notation:**
```typescript
const old = {
  users: [
    { id: 1, name: 'Alice', tags: ['admin', 'user'] },
    { id: 2, name: 'Bob', tags: ['user'] }
  ]
};

const newObj = {
  users: [
    { id: 1, name: 'Alicia', tags: ['admin', 'user'] },
    { id: 2, name: 'Bob', tags: ['moderator'] }
  ]
};

const result = diffObjectDetailed(old, newObj);

// result.modified includes:
// ['users[0].name', 'users[1].tags[0]']
```

**Complex Nested Arrays:**
```typescript
const old = {
  departments: [
    {
      name: 'Engineering',
      teams: [
        { name: 'Frontend', members: ['Alice', 'Bob'] }
      ]
    }
  ]
};

const newObj = {
  departments: [
    {
      name: 'Engineering',
      teams: [
        { name: 'Frontend', members: ['Alice', 'Bob', 'Charlie'] }
      ]
    }
  ]
};

const result = diffObjectDetailed(old, newObj);
// result.added includes: ['departments[0].teams[0].members[2]']
```

---

### `getChangedPaths<T>(oldObj: T, newObj: T, options?: DiffOptions): string[]`

Returns an array of paths (with array indices) pointing to all changed values.

#### Examples

**Basic Paths:**
```typescript
const old = { a: 1, b: { c: 2, d: 3 } };
const newObj = { a: 1, b: { c: 4, d: 3 }, e: 5 };
const paths = getChangedPaths(old, newObj);
// Returns: ['b.c', 'e']
```

**Array Index Paths:**
```typescript
const old = {
  items: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]
};

const newObj = {
  items: [
    { id: 1, name: 'Updated Item 1' },
    { id: 2, name: 'Item 2' }
  ]
};

const paths = getChangedPaths(old, newObj);
// Returns: ['items[0].name']
```

**Deeply Nested Arrays:**
```typescript
const old = {
  data: {
    items: [
      { nested: [{ value: 1 }, { value: 2 }] }
    ]
  }
};

const newObj = {
  data: {
    items: [
      { nested: [{ value: 1 }, { value: 3 }] }
    ]
  }
};

const paths = getChangedPaths(old, newObj);
// Returns: ['data.items[0].nested[1].value']
```

---

### `hasObjectChanges<T>(oldObj: T, newObj: T, options?: DiffOptions): boolean`

Quick check to determine if two objects have any differences.

#### Examples

```typescript
const obj1 = { a: 1, b: 2 };
const obj2 = { a: 1, b: 2 };
const obj3 = { a: 1, b: 3 };

hasObjectChanges(obj1, obj2); // false
hasObjectChanges(obj1, obj3); // true
```

---

### `applyDiff<T>(baseObj: T, diff: Partial<T>): T`

Applies a diff object to a base object, merging the changes.

#### Examples

```typescript
const base = {
  user: {
    name: 'John',
    age: 30,
    address: { city: 'NYC', zip: '10001' }
  }
};

const diff = {
  user: {
    age: 31,
    address: { city: 'LA' }
  }
};

const result = applyDiff(base, diff);
// Returns: {
//   user: {
//     name: 'John',
//     age: 31,
//     address: { city: 'LA', zip: '10001' }
//   }
// }
```

**Handling Deletions:**
```typescript
const base = { a: 1, b: 2, c: 3 };
const diff = { b: undefined }; // undefined means delete
const result = applyDiff(base, diff);
// Returns: { a: 1, c: 3 }
```

---

## Advanced Usage

### Custom Equality Function

Use a custom equality function for approximate comparisons:

```typescript
const approxEqual = (a: any, b: any) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.0001;
  }
  return a === b;
};

const old = { value: 1.0000001 };
const newObj = { value: 1.0000002 };

const diff = diffObject(old, newObj, { equalityFn: approxEqual });
// Returns: {} (no changes due to approximate equality)
```

### State Management Example

Track changes in application state efficiently:

```typescript
interface AppState {
  user: User;
  items: Item[];
  settings: Settings;
}

const previousState: AppState = { /* ... */ };
const newState: AppState = { /* ... */ };

// Get only the changes
const changes = diffObject(previousState, newState);

// Send only changes to server (bandwidth optimization)
if (hasObjectChanges(previousState, newState)) {
  await api.updateState(changes);
}

// Log all changed paths for debugging
const changedPaths = getChangedPaths(previousState, newState);
console.log('Changed:', changedPaths);
// Output: ['user.email', 'items[2].status', 'settings.theme']

// Get detailed analytics
const details = diffObjectDetailed(previousState, newState);
console.log(`Total changes: ${details.modified.length + details.added.length}`);
```

### Form Change Tracking

Track form changes with specific field paths:

```typescript
const initialFormData = {
  personal: {
    firstName: 'John',
    lastName: 'Doe',
    contacts: [
      { type: 'email', value: 'john@example.com' },
      { type: 'phone', value: '555-1234' }
    ]
  },
  preferences: {
    notifications: true,
    theme: 'dark'
  }
};

const currentFormData = { /* user edits */ };

// Get what fields changed
const changedFields = getChangedPaths(initialFormData, currentFormData);
// Returns: ['personal.firstName', 'personal.contacts[0].value', 'preferences.theme']

// Determine if form is dirty
const isDirty = hasObjectChanges(initialFormData, currentFormData);

// Get only changed values for submission
const updates = diffObject(initialFormData, currentFormData);
```

### Optimistic Updates & Rollback

```typescript
let currentState = { /* ... */ };
const originalState = deepClone(currentState);

// Apply optimistic update
currentState = applyDiff(currentState, optimisticChanges);

try {
  await api.save(optimisticChanges);
} catch (error) {
  // Rollback to original state
  currentState = originalState;
}
```

---

## Performance Considerations

1. **Deep Array Comparison**: Set `deepArrayComparison: false` for reference-based array comparison when dealing with large arrays that don't need deep comparison.

2. **Path Tracking**: If you only need to know IF something changed, use `hasObjectChanges()` instead of `diffObject()` for better performance.

3. **Large Objects**: For very large objects, consider:
   - Using custom equality functions to skip expensive comparisons
   - Comparing specific subtrees instead of entire objects
   - Disabling `includeDeleted` if deletions aren't needed

---

## TypeScript Support

All functions are fully typed with generics for type safety:

```typescript
interface User {
  id: number;
  name: string;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

const old: User = { /* ... */ };
const newObj: User = { /* ... */ };

// Result is typed as Partial<User>
const diff = diffObject(old, newObj);

// Type-safe access
if (diff.settings?.theme) {
  console.log(diff.settings.theme); // 'light' | 'dark'
}
```

---

## Edge Cases

### Null and Undefined
```typescript
diffObject({ a: null }, { a: undefined }); // { a: undefined }
diffObject(null, { a: 1 }); // { a: 1 }
diffObject({ a: 1 }, null); // {}
```

### Empty Objects
```typescript
diffObject({}, {}); // {}
diffObject({}, { a: 1 }); // { a: 1 }
```

### Arrays of Different Lengths
```typescript
const old = { items: [1, 2, 3] };
const newObj = { items: [1, 2, 3, 4, 5] };
const paths = getChangedPaths(old, newObj);
// Returns: ['items[3]', 'items[4]']
```

### Primitive Type Changes
```typescript
const old = { value: 42 };
const newObj = { value: "42" };
const diff = diffObject(old, newObj);
// Returns: { value: "42" }
```

---

## Best Practices

1. **Use appropriate options**: Enable `includeDeleted` only when you need to track deletions to improve performance.

2. **Choose the right function**:
   - Use `hasObjectChanges()` for simple checks
   - Use `diffObject()` for getting changed values
   - Use `diffObjectDetailed()` for analytics and debugging
   - Use `getChangedPaths()` for path-based operations

3. **Custom equality**: Provide custom equality functions for special comparison needs (dates, floats, case-insensitive strings, etc.)

4. **Immutability**: These functions don't modify the input objects - they always return new objects.

---

## License

MIT