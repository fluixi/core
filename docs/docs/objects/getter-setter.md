---
sidebar_position: 2
---

# Object Property Access Utilities

The Getter-Setter module provides advanced utilities for accessing and modifying nested properties in JavaScript objects and arrays. It offers a powerful selector syntax for navigating complex data structures with support for property paths, array indices, wildcards, slices, filters, and more.

## Core Functions

### `get(obj, path, options?)`

Retrieves values from an object using a path selector.

This function navigates through an object's structure based on a path selector string, returning the value at the specified location. It supports various selector types including property access, array indexing, wildcards, and filters.

#### Parameters

- `obj: any` - The source object to retrieve values from
- `path: string` - A selector path to the desired property
- `options?: object` - Optional configuration
  - `defaultValue?: any` - Value to return if path not found
  - `preserveStructure?: boolean` - Whether to return the entire structure instead of just values

#### Returns

The value at the specified path, or the defaultValue if not found.

#### Examples

**Basic property access**

```ts
const data = { user: { profile: { name: 'Alice' } } };
get(data, 'user.profile.name'); // 'Alice'
```

**Array access**

```ts
const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
get(data, 'users[0].name'); // 'Alice'
get(data, 'users[1].name'); // 'Bob'
```

**Wildcards**

```ts
const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
get(data, 'users[*].name'); // ['Alice', 'Bob']
```

**Default values**

```ts
const data = { user: { profile: { name: 'Alice' } } };
get(data, 'user.settings.theme', { defaultValue: 'light' }); // 'light'
```

**Structure preservation**

```ts
const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
get(data, 'users[0].name', { preserveStructure: true });
// { users: [{ name: 'Alice' }] }
```

### `set(obj, path, value, options?)`

Sets a value at a specified path in an object.

This function navigates through an object's structure based on a path selector string and sets a value at the specified location. It supports creating missing intermediate objects/arrays as needed.

#### Parameters

- `obj: any` - The object to modify
- `path: string` - A selector path to the desired property
- `value: any` - The value to set
- `options?: object` - Optional configuration
  - `createMissing?: boolean` - Whether to create missing intermediate objects (default: true)
  - `merge?: boolean` - Whether to merge objects instead of replacing them (default: false)

#### Returns

The modified object (same reference if possible, or a new object if necessary).

#### Examples

**Basic property setting**

```ts
const data = { user: { profile: {} } };
set(data, 'user.profile.name', 'Alice');
// data is now: { user: { profile: { name: 'Alice' } } }
```

**Creating missing paths**

```ts
const data = {};
set(data, 'user.profile.name', 'Alice');
// data is now: { user: { profile: { name: 'Alice' } } }
```

**Array setting**

```ts
const data = { users: [] };
set(data, 'users[0]', { name: 'Alice' });
// data is now: { users: [{ name: 'Alice' }] }
```

**Merging**

```ts
const data = { user: { profile: { age: 30 } } };
set(data, 'user.profile', { name: 'Alice' }, { merge: true });
// data is now: { user: { profile: { age: 30, name: 'Alice' } } }
```

### `select(obj, path, options?)`

Alias for `get` with `preserveStructure: true`. Returns the entire structure containing the selected path rather than just the value.

### `has(obj, path)`

Checks if a path exists in an object.

#### Parameters

- `obj: any` - The object to check
- `path: string` - A selector path to check

#### Returns

`boolean` - Whether the path exists in the object.

#### Examples

```ts
const data = { user: { profile: { name: 'Alice' } } };
has(data, 'user.profile.name'); // true
has(data, 'user.settings');     // false
```

### `deletePath(obj, path)`

Deletes a property at a specified path in an object.

#### Parameters

- `obj: any` - The object to modify
- `path: string` - A selector path to the property to delete

#### Returns

The modified object and a boolean indicating if the deletion was successful.

#### Examples

```ts
const data = { user: { profile: { name: 'Alice', age: 30 } } };
const [result, deleted] = deletePath(data, 'user.profile.age');
// result is: { user: { profile: { name: 'Alice' } } }
// deleted is: true
```

### `fromPath(path, value?)`

Generates an object structure from a path string.

This function creates a nested object or array structure based on a path selector, assigning an optional value at the deepest level.

#### Parameters

- `path: string` - The path string describing the structure to create
- `value?: any` - The value to place at the end of the path (optional)

#### Returns

The generated object/array structure.

#### Examples

```ts
// Simple nested object
fromPath('user.profile.name', 'John');
// Returns: { user: { profile: { name: 'John' } } }

// Array with specific index
fromPath('users[0].name', 'Alice');
// Returns: { users: [{ name: 'Alice' }] }

// Array with wildcard
fromPath('items[*].active', true);
// Returns: { items: [true] }
```

## Advanced Functions

### `update(obj, path, updater)`

Updates a value at a specified path in an object using a callback function.

#### Parameters

- `obj: any` - The object to modify
- `path: string` - A selector path to the property to update
- `updater: (currentValue) => newValue` - Callback function to transform the current value

#### Returns

The modified object.

#### Examples

```ts
const data = { counter: 5 };
update(data, 'counter', value => value + 1);
// data is now: { counter: 6 }
```

### `getPaths(obj, options?)`

Gets all possible paths in an object.

#### Parameters

- `obj: any` - The object to extract paths from
- `options?: object` - Optional configuration
  - `flatten?: boolean` - Whether to flatten nested objects (default: false)
  - `arrays?: boolean` - Whether to include array indices (default: true)
  - `onlyLeaves?: boolean` - Whether to only include leaf nodes (default: false)

#### Returns

An array of paths as strings.

#### Examples

```ts
const data = { user: { name: 'Alice', hobbies: ['reading', 'cycling'] } };
getPaths(data);
// ['user', 'user.name', 'user.hobbies', 'user.hobbies[0]', 'user.hobbies[1]']

getPaths(data, { onlyLeaves: true });
// ['user.name', 'user.hobbies[0]', 'user.hobbies[1]']
```

## Selector Syntax

The getter and setter functions support a powerful path selector syntax:

### Basic Syntax

- `prop` - Access object property
- `prop1.prop2` - Access nested property
- `arr[0]` - Access array element by index
- `obj.arr[0].prop` - Combine object and array access

### Advanced Selectors

- `arr[*]` - Select all elements in an array
- `arr[0:5]` - Select a range of elements (slicing)
- `arr[:3]` - Select elements from start to index 3 (exclusive)
- `arr[2:]` - Select elements from index 2 to end
- `arr[1:5:2]` - Select elements with step (every 2nd element)
- `arr[0,2,4]` - Select specific indices
- `arr[?(expr)]` - Filter elements using an expression
- `..prop` - Recursive descent (find prop at any level)

## Use Cases

- Accessing deeply nested properties without null/undefined checks
- Manipulating complex state in Redux or similar state managers
- Working with normalized data structures
- Converting between flat and nested data formats
- Implementing form libraries with complex field paths
- Building query languages for JavaScript objects
