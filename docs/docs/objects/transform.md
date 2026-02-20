---
sidebar_position: 3
---

# Object Transformation Utilities

The Object Transformation module provides powerful utilities for restructuring, mapping, and applying transformations to JavaScript objects and their properties. These utilities help with data conversion, normalization, and preparing data for different contexts.

## Value Transformations

### `mapValues(obj, fn)`

Maps object values with a transform function, keeping the same keys.

Creates a new object with the same keys as the input, but with transformed values using the provided function. The function receives the value, key, and original object.

#### Parameters

- `obj: T` - The source object
- `fn: (value, key, obj) => R` - The transform function to apply to each value

#### Returns

`Record<keyof T, R>` - A new object with transformed values

#### Examples

```ts
const prices = { apple: '1.25', banana: '0.75', orange: '1.00' };
const numericPrices = mapValues(prices, price => parseFloat(price));
// { apple: 1.25, banana: 0.75, orange: 1 }
```

### `mapKeys(obj, fn)`

Maps object keys with a transform function, keeping the same values.

Creates a new object with transformed keys using the provided function, while maintaining the original values. The function receives the key, value, and original object.

#### Parameters

- `obj: T` - The source object
- `fn: (key, value, obj) => string` - The transform function to apply to each key

#### Returns

`Record<string, T[keyof T]>` - A new object with transformed keys

#### Examples

```ts
const data = { firstName: 'Alice', lastName: 'Smith' };
const camelToSnake = mapKeys(data, key => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`));
// { first_name: 'Alice', last_name: 'Smith' }
```

### `transformValues(obj, ...transformers)`

Transforms object values by applying a series of transform functions.

Creates a new object with the same structure as the input, but with all values transformed by the provided sequence of functions. Each function is applied in order to the result of the previous function.

#### Parameters

- `obj: T` - The source object
- `transformers: Array<(value) => any>` - One or more transform functions to apply

#### Returns

`Record<keyof T, any>` - A new object with transformed values

#### Examples

```ts
const data = {
  name: '  Alice Smith  ',
  email: 'ALICE@EXAMPLE.COM',
  score: '85'
};

// Apply multiple transforms: trim strings, convert to lowercase, and parse numbers
const transformed = transformValues(data,
  value => typeof value === 'string' ? value.trim() : value,
  value => typeof value === 'string' ? value.toLowerCase() : value,
  value => !isNaN(Number(value)) ? Number(value) : value
);

// {
//   name: 'alice smith',
//   email: 'alice@example.com',
//   score: 85
// }
```

## Case Conversion

### `camelCaseKeys(obj, options?)`

Transforms keys to camelCase.

Creates a new object with all keys transformed to camelCase format. Handles keys in kebab-case, snake_case, and PascalCase.

#### Parameters

- `obj: T` - The source object
- `options?: { deep?: boolean }` - Transformation options
  - `deep` - Whether to transform nested objects (default: true)

#### Returns

`Record<string, any>` - A new object with camelCase keys

#### Examples

```ts
const data = {
  first_name: 'Alice',
  'last-name': 'Smith',
  ContactInfo: {
    email_address: 'alice@example.com',
    phone_number: '555-1234'
  }
};

const camelCased = camelCaseKeys(data);
// {
//   firstName: 'Alice',
//   lastName: 'Smith',
//   contactInfo: {
//     emailAddress: 'alice@example.com',
//     phoneNumber: '555-1234'
//   }
// }
```

### `snakeCaseKeys(obj, options?)`

Transforms keys to snake_case.

Creates a new object with all keys transformed to snake_case format. Handles keys in camelCase, kebab-case, and PascalCase.

#### Parameters

- `obj: T` - The source object
- `options?: { deep?: boolean }` - Transformation options
  - `deep` - Whether to transform nested objects (default: true)

#### Returns

`Record<string, any>` - A new object with snake_case keys

#### Examples

```ts
const data = {
  firstName: 'Alice',
  'last-name': 'Smith',
  ContactInfo: {
    emailAddress: 'alice@example.com',
    phoneNumber: '555-1234'
  }
};

const snakeCased = snakeCaseKeys(data);
// {
//   first_name: 'Alice',
//   last_name: 'Smith',
//   contact_info: {
//     email_address: 'alice@example.com',
//     phone_number: '555-1234'
//   }
// }
```

### `kebabCaseKeys(obj, options?)`

Transforms keys to kebab-case.

Creates a new object with all keys transformed to kebab-case format. Handles keys in camelCase, snake_case, and PascalCase.

#### Parameters

- `obj: T` - The source object
- `options?: { deep?: boolean }` - Transformation options
  - `deep` - Whether to transform nested objects (default: true)

#### Returns

`Record<string, any>` - A new object with kebab-case keys

#### Examples

```ts
const data = {
  firstName: 'Alice',
  last_name: 'Smith',
  ContactInfo: {
    emailAddress: 'alice@example.com',
    phone_number: '555-1234'
  }
};

const kebabCased = kebabCaseKeys(data);
// {
//   'first-name': 'Alice',
//   'last-name': 'Smith',
//   'contact-info': {
//     'email-address': 'alice@example.com',
//     'phone-number': '555-1234'
//   }
// }
```

## Structural Transformations

### `flatten(obj, options?)`

Flattens a nested object structure into a single-level object with path-based keys.

Creates a new flat object where nested keys are represented as path strings. Supports custom path delimiters and array handling.

#### Parameters

- `obj: T` - The source object to flatten
- `options?: object` - Flattening options
  - `delimiter?: string` - Character(s) to separate path segments (default: '.')
  - `includeArrays?: boolean` - Whether to flatten arrays (default: true)
  - `maxDepth?: number` - Maximum depth to flatten (default: Infinity)

#### Returns

`Record<string, any>` - A flattened object with path keys

#### Examples

```ts
const user = {
  name: {
    first: 'Alice',
    last: 'Smith'
  },
  contacts: [
    { type: 'email', value: 'alice@example.com' },
    { type: 'phone', value: '555-1234' }
  ]
};

const flattened = flatten(user);
// {
//   'name.first': 'Alice',
//   'name.last': 'Smith',
//   'contacts.0.type': 'email',
//   'contacts.0.value': 'alice@example.com',
//   'contacts.1.type': 'phone',
//   'contacts.1.value': '555-1234'
// }
```

### `unflatten(obj, options?)`

Unflatten a single-level object with path-based keys into a nested object structure.

Reverses the flattening process, converting an object with path keys back into a nested structure. Supports custom path delimiters and array detection.

#### Parameters

- `obj: Record<string, any>` - The flattened object to unflatten
- `options?: object` - Unflattening options
  - `delimiter?: string` - Character(s) that separate path segments (default: '.')
  - `detectArrays?: boolean` - Whether to convert numeric indices to arrays (default: true)

#### Returns

`Record<string, any>` - A nested object structure

#### Examples

```ts
const flattened = {
  'user.name.first': 'Alice',
  'user.name.last': 'Smith',
  'user.contacts.0.type': 'email',
  'user.contacts.0.value': 'alice@example.com',
  'user.contacts.1.type': 'phone',
  'user.contacts.1.value': '555-1234'
};

const nested = unflatten(flattened);
// {
//   user: {
//     name: {
//       first: 'Alice',
//       last: 'Smith'
//     },
//     contacts: [
//       { type: 'email', value: 'alice@example.com' },
//       { type: 'phone', value: '555-1234' }
//     ]
//   }
// }
```

### `renameKeys(obj, mapping, options?)`

Renames keys in an object according to a mapping.

Creates a new object with keys renamed according to the provided mapping. Keys not in the mapping are kept unchanged.

#### Parameters

- `obj: T` - The source object
- `mapping: Record<string, string>` - Object mapping from original keys to new keys
- `options?: { removeUnmapped?: boolean }` - Renaming options
  - `removeUnmapped` - Whether to remove keys not in the mapping (default: false)

#### Returns

`Record<string, any>` - A new object with renamed keys

#### Examples

```ts
const user = {
  first_name: 'Alice',
  last_name: 'Smith',
  email: 'alice@example.com',
  age: 30
};

const renamed = renameKeys(user, {
  first_name: 'firstName',
  last_name: 'lastName'
});

// {
//   firstName: 'Alice',
//   lastName: 'Smith',
//   email: 'alice@example.com',
//   age: 30
// }
```

### `structureByKeys(obj, options?)`

Transforms a flat object with key-value pairs into a structured object by key pattern.

Useful for converting flat configuration objects or query parameters into structured objects. Groups keys by a shared prefix and nests them accordingly.

#### Parameters

- `obj: Record<string, any>` - The flat object to structure
- `options?: object` - Structuring options
  - `separator?: string` - The character(s) that separate key parts (default: '.')
  - `detectArrays?: boolean` - Whether to convert numeric indices to arrays (default: true)

#### Returns

`Record<string, any>` - A structured object

#### Examples

```ts
const params = {
  'user.name': 'Alice',
  'user.email': 'alice@example.com',
  'preferences.theme': 'dark',
  'preferences.notifications': 'true',
  'items.0.id': '1001',
  'items.0.name': 'Widget',
  'items.1.id': '1002',
  'items.1.name': 'Gadget'
};

const structured = structureByKeys(params);
// {
//   user: {
//     name: 'Alice',
//     email: 'alice@example.com'
//   },
//   preferences: {
//     theme: 'dark',
//     notifications: 'true'
//   },
//   items: [
//     { id: '1001', name: 'Widget' },
//     { id: '1002', name: 'Gadget' }
//   ]
// }
```

## Deep and Path-Based Transformations

### `deepTransform(data, options?)`

Deeply transforms objects, arrays, and values in a nested structure.

Recursively traverses an object or array and applies different transform functions based on the type of each node (object, array, or primitive value).

#### Parameters

- `data: T` - The data to transform
- `options?: object` - Transform options
  - `transformObject?: (obj, path) => object` - Function to transform objects (default: identity)
  - `transformArray?: (arr, path) => array` - Function to transform arrays (default: identity)
  - `transformValue?: (value, key, path) => any` - Function to transform primitive values (default: identity)
  - `maxDepth?: number` - Maximum depth to transform (default: Infinity)

#### Returns

`T` - The transformed data

#### Examples

```ts
const data = {
  user: {
    name: 'Alice Smith',
    scores: [85, 92, 78],
    active: true
  },
  metadata: {
    lastUpdated: '2023-01-15'
  }
};

// Apply different transformations to objects, arrays, and primitive values
const result = deepTransform(data, {
  transformObject: obj => ({ ...obj, _transformed: true }),
  transformArray: arr => arr.map(x => typeof x === 'number' ? x + 10 : x),
  transformValue: (val, key) => key === 'name' ? val.toUpperCase() : val
});

// {
//   user: {
//     name: 'ALICE SMITH',
//     scores: [95, 102, 88],
//     active: true,
//     _transformed: true
//   },
//   metadata: {
//     lastUpdated: '2023-01-15',
//     _transformed: true
//   },
//   _transformed: true
// }
```

### `transformPath(obj, paths, transformer, options?)`

Transforms values at specific paths in an object.

Applies transform functions to values at the specified path(s), supporting advanced path selectors including property paths, array indices, wildcards, and filters. Supports transforming multiple paths in a single operation.

#### Parameters

- `obj: T` - The source object
- `paths: string | string[]` - Path selector or array of path selectors to the values to transform
- `transformer: (value, path?, parent?) => any` - Function to transform the value
- `options?: { transformAll?: boolean }` - Additional options
  - `transformAll` - Whether to apply transformer to all paths or individually (default: false)

#### Returns

`T` - A new object with the transformed value(s)

#### Examples

```ts
const user = {
  id: 1,
  name: 'Alice Smith',
  profile: {
    email: 'alice@example.com',
    settings: {
      notifications: true
    }
  },
  posts: [
    { id: 101, title: 'Hello', likes: 5 },
    { id: 102, title: 'World', likes: 10 }
  ]
};

// Transform a simple property
const result1 = transformPath(user, 'name', name => name.toUpperCase());
// user.name becomes 'ALICE SMITH'

// Transform a nested property
const result2 = transformPath(user, 'profile.email', email => email.split('@')[0] + '@example.org');
// user.profile.email becomes 'alice@example.org'

// Transform using wildcards
const result3 = transformPath(user, 'posts[*].likes', likes => likes * 2);
// All post likes are doubled

// Transform multiple paths
const result4 = transformPath(
  user,
  ['name', 'profile.email', 'posts[*].likes'],
  value => {
    if (typeof value === 'string') return value.toUpperCase();
    if (typeof value === 'number') return value * 2;
    return value;
  }
);
// Transforms multiple properties at once

// Use path-specific transformations
const result5 = transformPath(
  user,
  ['name', 'profile.email', 'posts[*].likes'],
  (value, path) => {
    if (path === 'name') return value.toUpperCase();
    if (path === 'profile.email') return value.split('@')[0] + '@example.org';
    if (path.includes('likes')) return value + 10;
    return value;
  },
  { transformAll: true }
);
```

### `mapPath(obj, paths, mapper, options?)`

Maps values at specific paths in an object.

Similar to transformPath, but returns an array of transformed values rather than modifying the object structure. Supports mapping multiple paths in a single operation.

#### Parameters

- `obj: T` - The source object
- `paths: string | string[]` - Path selector or array of path selectors to the values to map
- `mapper: (value, path?, parent?) => R` - Function to transform each value
- `options?: { flatten?: boolean }` - Additional options
  - `flatten` - Whether to flatten the results into a single array (default: true)

#### Returns

`R[]` - An array of transformed values

#### Examples

```ts
const data = {
  users: [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: 'Charlie', age: 35 }
  ]
};

// Extract and transform user names
const names = mapPath(data, 'users[*].name', name => name.toUpperCase());
// ['ALICE', 'BOB', 'CHARLIE']

// Filter and transform
const youngUsers = mapPath(data, 'users[?(@.age < 30)].name', (name, user) => ({
  name,
  greeting: `Hello, ${name}!`
}));
// [{ name: 'Bob', greeting: 'Hello, Bob!' }]

// Map multiple paths
const info = mapPath(
  data,
  ['users[*].name', 'users[*].age'],
  value => typeof value === 'string' ? value.toUpperCase() : value
);
// ['ALICE', 'BOB', 'CHARLIE', 30, 25, 35]

// Map multiple paths with path context
const info2 = mapPath(
  data,
  ['users[*].name', 'users[*].age'],
  (value, path) => {
    if (path.includes('name')) return `Name: ${value}`;
    if (path.includes('age')) return `Age: ${value}`;
    return value;
  }
);
// ['Name: Alice', 'Name: Bob', 'Name: Charlie', 'Age: 30', 'Age: 25', 'Age: 35']
```

### `transformKeysAtPath(obj, paths, transformer, options?)`

Transforms keys at specific paths in an object.

Applies a transform function to keys at the specified path(s), supporting advanced path selectors. Supports transforming keys at multiple paths in a single operation.

#### Parameters

- `obj: T` - The source object
- `paths: string | string[]` - Path selector or array of path selectors to the objects whose keys should be transformed
- `transformer: (key, value, path?) => string` - Function to transform each key
- `options?: { recursive?: boolean }` - Additional options
  - `recursive` - Whether to recursively transform nested object keys (default: false)

#### Returns

`T` - A new object with transformed keys at the specified path(s)

#### Examples

```ts
const data = {
  user: {
    personal_info: {
      first_name: 'Alice',
      last_name: 'Smith',
      email_address: 'alice@example.com'
    },
    work_info: {
      job_title: 'Developer',
      department_name: 'Engineering'
    }
  }
};

// Transform snake_case keys to camelCase at a single path
const result1 = transformKeysAtPath(data, 'user.personal_info', key =>
  key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
);

// Transform keys at multiple paths
const result2 = transformKeysAtPath(
  data,
  ['user.personal_info', 'user.work_info'],
  key => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
);

// Recursively transform all nested keys
const result3 = transformKeysAtPath(
  data,
  'user',
  key => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
  { recursive: true }
);

// Result3:
// {
//   user: {
//     personalInfo: {
//       firstName: 'Alice',
//       lastName: 'Smith',
//       emailAddress: 'alice@example.com'
//     },
//     workInfo: {
//       jobTitle: 'Developer',
//       departmentName: 'Engineering'
//     }
//   }
// }
```

## Use Cases

- **API Data Transformation**: Convert between different naming conventions (camelCase, snake_case)
- **Form Data Processing**: Transform and validate user input
- **Data Normalization**: Standardize data format from different sources
- **Query Parameter Handling**: Convert flat URL query params to structured objects
- **View Model Creation**: Transform domain models to view-specific formats
- **Data Export/Import**: Prepare data for CSV, JSON, or other formats
- **Selective Data Updates**: Apply transforms only to specific parts of complex objects
- **Migration**: Convert between different data schemas
