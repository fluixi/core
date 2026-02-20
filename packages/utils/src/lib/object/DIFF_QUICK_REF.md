# diffObject Quick Reference Card

## Installation

```typescript
import {
  diffObject,
  diffObjectDetailed,
  getChangedPaths,
  hasObjectChanges,
  applyDiff
} from '@awc/utils/object';
```

---

## Functions

### `diffObject(old, new, options?)`
**Returns:** Object with only changed values

```typescript
const diff = diffObject(
  { a: 1, b: { c: 2 } },
  { a: 1, b: { c: 3 } }
);
// → { b: { c: 3 } }
```

### `diffObjectDetailed(old, new, options?)`
**Returns:** `{ changes, added, deleted, modified, hasChanges }`

```typescript
const result = diffObjectDetailed(oldObj, newObj);
// result.modified → ['users[0].name', 'items[2].status']
// result.added → ['settings.newFeature']
// result.deleted → ['deprecated']
// result.hasChanges → true
```

### `getChangedPaths(old, new, options?)`
**Returns:** `string[]` - Array of changed paths

```typescript
const paths = getChangedPaths(oldObj, newObj);
// → ['user.email', 'items[0].status', 'tags[2]']
```

### `hasObjectChanges(old, new, options?)`
**Returns:** `boolean` - Quick check if anything changed

```typescript
if (hasObjectChanges(oldState, newState)) {
  saveChanges();
}
```

### `applyDiff(base, diff)`
**Returns:** New object with diff applied

```typescript
const updated = applyDiff(
  { a: 1, b: 2 },
  { b: 3, c: 4 }
);
// → { a: 1, b: 3, c: 4 }
```

---

## Options

```typescript
interface DiffOptions {
  includeDeleted?: boolean;       // Default: false
  includeAdded?: boolean;         // Default: true
  deepArrayComparison?: boolean;  // Default: true
  equalityFn?: (a, b) => boolean; // Default: (a, b) => a === b
  preserveStructure?: boolean;    // Default: false
}
```

### Examples with Options

```typescript
// Include deletions
diffObject(old, new, { includeDeleted: true });
// → { removed: undefined }

// Custom equality
diffObject(old, new, {
  equalityFn: (a, b) => Math.abs(a - b) < 0.01
});

// Reference-based array comparison (faster)
diffObject(old, new, { deepArrayComparison: false });
```

---

## Path Notation Guide

| Path | Means | Access |
|------|-------|--------|
| `name` | Root property | `obj.name` |
| `user.email` | Nested property | `obj.user.email` |
| `items[0]` | Array element | `obj.items[0]` |
| `users[1].name` | Property in array | `obj.users[1].name` |
| `data[0][1]` | Nested array | `obj.data[0][1]` |
| `teams[0].members[2].tags[1]` | Deep nesting | `obj.teams[0].members[2].tags[1]` |

---

## Common Use Cases

### 1. State Management - Send Only Changes

```typescript
const changes = diffObject(prevState, newState);
await api.update(changes); // Send only what changed
```

### 2. Form Dirty Check

```typescript
const isDirty = hasObjectChanges(initialForm, currentForm);
// Show "unsaved changes" warning
```

### 3. Change Logging

```typescript
const paths = getChangedPaths(before, after);
console.log('Changed fields:', paths.join(', '));
// → 'user.email, settings.theme, items[2].status'
```

### 4. Selective Validation

```typescript
const changedFields = getChangedPaths(oldForm, newForm);
const errors = validateFields(changedFields);
```

### 5. Optimistic Updates with Rollback

```typescript
const backup = currentState;
currentState = applyDiff(currentState, optimisticChanges);

try {
  await api.save(optimisticChanges);
} catch {
  currentState = backup; // Rollback
}
```

### 6. Change Analytics

```typescript
const details = diffObjectDetailed(prev, curr);
analytics.track('state_changed', {
  changeCount: details.modified.length,
  paths: details.modified
});
```

---

## Array Index Examples

### Simple Array Change

```typescript
const old = { items: [1, 2, 3] };
const new = { items: [1, 5, 3] };

getChangedPaths(old, new);
// → ['items[1]']
```

### Array of Objects

```typescript
const old = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
};

const new = {
  users: [
    { id: 1, name: 'Alicia', role: 'admin' },
    { id: 2, name: 'Bob', role: 'moderator' }
  ]
};

getChangedPaths(old, new);
// → ['users[0].name', 'users[1].role']
```

### Nested Arrays

```typescript
const old = {
  data: {
    items: [{ tags: ['a', 'b'] }]
  }
};

const new = {
  data: {
    items: [{ tags: ['a', 'c'] }]
  }
};

getChangedPaths(old, new);
// → ['data.items[0].tags[1]']
```

### Added/Removed Elements

```typescript
const old = { list: [1, 2] };
const new = { list: [1, 2, 3] };

getChangedPaths(old, new);
// → ['list[2]']  (added)

diffObjectDetailed(old, new).added;
// → ['list[2]']
```

---

## Real-World Example

```typescript
// E-commerce cart state
const oldCart = {
  items: [
    { id: 1, product: 'Laptop', qty: 1, price: 1000 },
    { id: 2, product: 'Mouse', qty: 2, price: 25 }
  ],
  discount: null,
  total: 1050
};

const newCart = {
  items: [
    { id: 1, product: 'Laptop', qty: 1, price: 1000 },
    { id: 2, product: 'Mouse', qty: 3, price: 25 },
    { id: 3, product: 'Keyboard', qty: 1, price: 80 }
  ],
  discount: 0.1,
  total: 1192.5
};

// What changed?
const changes = diffObject(oldCart, newCart);
// → {
//     items: [...],  // Only the changed array
//     discount: 0.1,
//     total: 1192.5
//   }

// Specific paths
const paths = getChangedPaths(oldCart, newCart);
// → ['items[1].qty', 'items[2]', 'discount', 'total']

// Detailed info
const detailed = diffObjectDetailed(oldCart, newCart);
// modified: ['items[1].qty', 'discount', 'total']
// added: ['items[2]']
// deleted: []
// hasChanges: true

// Log for analytics
console.log(`Cart updated: ${detailed.modified.length} modified, ${detailed.added.length} added`);
// → "Cart updated: 3 modified, 1 added"
```

---

## Performance Tips

1. **Quick checks first:**
   ```typescript
   if (!hasObjectChanges(a, b)) return; // Fast bail out
   const diff = diffObject(a, b); // Only if needed
   ```

2. **Reference comparison for large arrays:**
   ```typescript
   diffObject(old, new, { deepArrayComparison: false });
   ```

3. **Disable unneeded tracking:**
   ```typescript
   diffObject(old, new, {
     includeDeleted: false,  // Skip if not needed
     includeAdded: false     // Skip if not needed
   });
   ```

---

## Cheat Sheet

| Task | Use |
|------|-----|
| Get only changes | `diffObject()` |
| Get change metadata | `diffObjectDetailed()` |
| Get changed paths | `getChangedPaths()` |
| Check if changed | `hasObjectChanges()` |
| Apply changes | `applyDiff()` |
| Include deletions | `{ includeDeleted: true }` |
| Custom equality | `{ equalityFn: (a,b) => ... }` |
| Fast array compare | `{ deepArrayComparison: false }` |

---

## TypeScript Support

All functions are fully typed:

```typescript
interface User {
  id: number;
  name: string;
  settings: { theme: string };
}

const old: User = { /* ... */ };
const new: User = { /* ... */ };

// Result is typed as Partial<User>
const diff = diffObject(old, new);

// Type-safe access
if (diff.settings?.theme) {
  applyTheme(diff.settings.theme); // string
}
```

---

## Edge Cases

```typescript
// Null/undefined
diffObject(null, { a: 1 });        // → { a: 1 }
diffObject({ a: 1 }, null);        // → {}

// Empty objects
diffObject({}, {});                // → {}

// Primitive type changes
diffObject({ x: 42 }, { x: "42" }); // → { x: "42" }

// Deletion with undefined
applyDiff({ a: 1, b: 2 }, { b: undefined });
// → { a: 1 }  (b is deleted)
```

---

## Quick Start

```typescript
import { diffObject, getChangedPaths } from '@awc/utils/object';

// Compare two objects
const changes = diffObject(oldData, newData);

// Get what changed
const paths = getChangedPaths(oldData, newData);
console.log('Changed:', paths);

// Use the changes
if (changes) {
  await api.update(changes);
}
```

---

**Documentation:** See `DIFF_README.md` for full API reference
**Examples:** See `diff.example.ts` for detailed examples
**Tests:** See `diff.spec.ts` for test coverage