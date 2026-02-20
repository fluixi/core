---
sidebar_position: 4
---

# Object Utility Functions

The object utilities module provides a collection of helper functions for working with JavaScript objects, arrays, and other data structures.

## Type Checking Functions

### `isObject(value)`

Checks if a value is an object (not an array, function, date, etc.).

This function determines if a value is a plain JavaScript object by excluding arrays, functions, and built-in object types like Date, RegExp, Map, etc.

#### Parameters

- `value: unknown` - The value to check

#### Returns

`boolean` - `true` if value is a plain object; `false` otherwise

#### Examples

```ts
isObject({});              // true
isObject({ key: 'value' }); // true

isObject([]);              // false
isObject(null);            // false
isObject(undefined);       // false
isObject(new Date());      // false
isObject(() => {});        // false
isObject(new Map());       // false
```

### `isPlainObject(v)`

Checks if a value is a plain object (only Object.prototype or null in prototype chain).

Unlike `isObject`, this function performs a stricter check to ensure the value is a "plain" object - created via object literal `{}` or `Object.create(null)`. This excludes objects created with custom constructors.

#### Parameters

- `v: unknown` - The value to check

#### Type Parameters

- `T` - The expected object type (defaults to `Record<string, any>`)

#### Returns

`boolean` - `true` if value is a plain object; `false` otherwise

#### Examples

```ts
isPlainObject({});                   // true
isPlainObject(Object.create(null));  // true

class Custom {}
isPlainObject(new Custom());         // false
isPlainObject([]);                   // false
isPlainObject(null);                 // false
```

### `isClass(obj)`

Checks if a value is a class constructor.

This function determines if a value is a class constructor by checking if it's a function and if its string representation starts with the "class" keyword.

#### Parameters

- `obj: unknown` - The value to check

#### Returns

`boolean` - `true` if value is a class constructor; `false` otherwise

#### Examples

```ts
class Example {}
isClass(Example);           // true

function regularFn() {}
isClass(regularFn);         // false

const arrowFn = () => {};
isClass(arrowFn);           // false
```

### `isEmptyObject(value)`

Checks if a value is an empty object.

This function determines if a value is an object with no enumerable properties. It first checks if the value is an object using `isObject` and then checks if it has any enumerable properties.

#### Parameters

- `value: unknown` - The value to check

#### Returns

`boolean` - `true` if value is an object with no properties; `false` otherwise

#### Examples

```ts
isEmptyObject({});               // true
isEmptyObject(Object.create(null)); // true

isEmptyObject({a: 1});           // false
isEmptyObject(null);             // false
isEmptyObject([]);               // false (arrays are not objects in this context)
```

## Object Traversal

### `traverseStructure(current, segments, depth, maxDepth)`

Traverses an object structure based on selector segments.

This advanced utility function traverses a data structure (object or array) based on a series of selector segments. It preserves the structure of the original data while navigating through it. The function supports various selector types including property access, array indexing, wildcards, slices, unions, filters, and recursive descent.

#### Parameters

- `current: any` - The current object/array being traversed
- `segments: SelectorSegment[]` - An array of selector segments that define the traversal path
- `depth: number` - The current traversal depth (for recursion limits)
- `maxDepth: number` - The maximum depth to traverse (prevents infinite recursion)

#### Returns

`any` - The traversed structure or `undefined` if no match found

#### Examples

```ts
// Access nested property with a simple path
const data = { users: [{ name: 'Alice', age: 30 }] };
const segments = [
  { type: 'property', value: 'users' },
  { type: 'index', value: 0 },
  { type: 'property', value: 'name' }
];
traverseStructure(data, segments, 0, 10); // { users: [{ name: 'Alice' }] }
```

#### Supported Selector Types

The function supports multiple selector types:

- `property` - Selects an object property by name
- `index` - Selects an array element by index
- `wildcard` - Selects all elements in an array or all properties in an object
- `slice` - Selects a range of elements from an array
- `union` - Selects multiple specific indices from an array
- `filter` - Selects elements that match a filter function
- `descendant` - Recursively searches for matching paths at any depth

## Serialization

### `toJSONString(value, space)`

Converts a value to a JSON string with improved handling of special cases.

This function converts a JavaScript value to a JSON string, similar to `JSON.stringify`, but with improved handling of circular references and special character escaping.

#### Parameters

- `value: any` - The value to convert to a JSON string
- `space: number` - The number of spaces to use for indentation (0 for no formatting, default)

#### Returns

`string` - The JSON string representation of the value or undefined for unsupported types

#### Examples

```ts
// Basic usage
toJSONString({ name: 'Alice', age: 30 });
// '{"name":"Alice","age":30}'

// With formatting
toJSONString({ name: 'Alice', age: 30 }, 2);
// '{
//   "name": "Alice",
//   "age": 30
// }'

// Handles circular references safely (throws error)
const circular = { self: null };
circular.self = circular;
toJSONString(circular); // throws TypeError (circular structure)
```

## Use Cases

- Type checking for conditional logic
- Object validation
- Advanced object traversal and manipulation
- Safe JSON serialization with circular reference detection
