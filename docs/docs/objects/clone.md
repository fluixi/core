# Deep Clone Utilities

The deep clone module provides utilities for creating complete copies of JavaScript values including objects, arrays, and built-in types.

## Functions

### `deepClone(obj)`

Creates a deep clone of a value (object, array, primitive, or built-in types).

This function creates a complete copy of the input value, including all nested properties, without maintaining any references to the original object.

#### Parameters

- `obj: T` - The value to clone

#### Returns

`T` - A deep copy of the input value with the same type

#### Type Parameters

- `T` - The type of the value being cloned

#### Supported Types

The `deepClone` function properly handles:

- Primitive values (strings, numbers, booleans)
- Plain objects
- Arrays
- Dates
- RegExp
- Maps
- Sets
- Symbols as object keys

#### Examples

**Cloning a nested object**

```ts
const obj = { a: 1, b: { c: 2 } };
const clone = deepClone(obj);
obj.b.c = 3;
console.log(clone.b.c); // 2 (remains unchanged)
```

**Cloning an array with objects**

```ts
const arr = [1, 2, { a: 3 }];
const cloneArr = deepClone(arr);
arr[2].a = 4;
console.log(cloneArr[2].a); // 3 (remains unchanged)
```

**Cloning built-in types**

```ts
const date = new Date();
const map = new Map([['key', 'value']]);
const set = new Set([1, 2, 3]);

const dateClone = deepClone(date); // independent Date instance
const mapClone = deepClone(map);   // independent Map instance
const setClone = deepClone(set);   // independent Set instance
```

## Use Cases

- Creating independent copies of data for immutable operations
- Copying state in Redux or other state management solutions
- Storing snapshots of data for comparison later
- Preventing side effects when sharing complex objects between components

## Performance Considerations

While `deepClone` provides a complete copy of complex objects, it may not be the most efficient solution for all scenarios. For large, complex objects, consider:

- Using a structured clone algorithm if available
- Implementing a more specific clone function optimized for your data structures
- Using libraries like Immer or Immutable.js for immutable data operations

## Edge Cases

- Circular references are not handled (will cause a stack overflow)
- Functions are not cloned (will maintain reference to the original function)
- WeakMap and WeakSet instances cannot be cloned with their values preserved
- DOM nodes and other host objects are not cloned properly