---
sidebar_position: 1
---
# Object Utilities

The Object Utilities module provides a comprehensive set of tools for working with JavaScript objects, arrays, and other data structures. These utilities simplify common operations like deep cloning, merging, traversal, type checking, and more.

## Core Features

- **Type Checking** - Functions to detect object types, empty objects, plain objects, etc.
- **Deep Operations** - Clone and merge objects/arrays with proper handling of nested structures
- **Object Traversal** - Navigate complex object structures with advanced path selectors
- **Property Access** - Get and set deeply nested properties with various selector syntaxes
- **Differencing** - Compare objects and determine what has changed
- **Serialization** - Safely convert objects to JSON with improved handling of special cases

## Getting Started

```typescript
// Import specific utilities
import { 
  deepClone, 
  deepMerge, 
  isObject,
  get, 
  set 
} from '@fluixi/utils/object';

// Clone an object
const original = { user: { name: 'Alice', settings: { theme: 'dark' } } };
const clone = deepClone(original);

// Merge objects
const merged = deepMerge(
  { id: 1, name: 'Product', price: 10 },
  { price: 15, available: true }
);
// Result: { id: 1, name: 'Product', price: 15, available: true }

```typescript
// Get nested properties with path selectors
const user = { 
  profile: { 
    contact: { 
      emails: ['user@example.com', 'admin@example.com'] 
    } 
  } 
};

const email = get(user, 'profile.contact.emails[0]');
// Result: 'user@example.com'

// Transform object keys to camelCase
const userData = {
  first_name: 'Alice',
  'last-name': 'Smith',
  contact_details: { email_address: 'alice@example.com' }
};
const camelCased = camelCaseKeys(userData);
// { firstName: 'Alice', lastName: 'Smith', contactDetails: { emailAddress: '...' } }

// Remove sensitive data from objects
const userWithSensitive = { id: 1, name: 'Alice', password: 'secret' };
const safeUser = omit(userWithSensitive, ['password']);
// { id: 1, name: 'Alice' }
```

## Available Modules

- [**clone**](./clone.md) - Deep cloning of objects and other data types
- [**diff**](./diff.md) - Object comparison and difference calculation 
- [**getter-setter**](./getter-setter.md) - Advanced property access with path selectors
- [**merge**](./merge.md) - Deep merging with various strategies
- [**omit**](./omit.md) - Property filtering and extraction utilities
- [**transform**](./transform.md) - Object transformation and restructuring
- [**utils**](./utils.md) - General object utility functions and type checks

## Advanced Features

### Path Selectors

Many of the utilities support path selectors for accessing nested properties with a concise syntax:

```typescript
// Different selector formats
get(data, 'users[0].profile.name');       // Bracket notation for array indices
get(data, 'users[*].name');               // Wildcard for all items in array
get(data, 'users[?(@.active)].name');     // Filter expression
get(data, 'users[:5].name');              // Slice notation
get(data, 'users[0,2,4].name');           // Multiple indices
```

### Immutable Operations

Many utilities provide options for immutable operations:

```typescript
// Merge without modifying original objects
const result = deepMerge(objA, objB);

// Set properties without modifying the original
const newState = set(state, 'user.preferences.theme', 'dark');

// Deep transform objects at all levels
const data = { users: [{ name: 'alice', age: '28' }, { name: 'bob', age: '32' }] };
const transformed = transformPath(data, 'users[*].age', age => parseInt(age, 10));
// { users: [{ name: 'alice', age: 28 }, { name: 'bob', age: 32 }] }

// Flatten nested objects
const nested = { user: { profile: { name: 'Alice', settings: { theme: 'dark' } } } };
const flat = flatten(nested);
// { 'user.profile.name': 'Alice', 'user.profile.settings.theme': 'dark' }
```
