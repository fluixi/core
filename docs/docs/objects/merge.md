# Object Merging Utilities

The merge module provides utilities for deep merging of JavaScript objects and arrays. It offers several variants of merge functions to handle different requirements, such as reference preservation and strict property merging.

## Core Functions

### `deepMerge(...sources)`

Merges multiple objects or multiple arrays deeply without maintaining references to the source objects.

This function creates a new instance with combined properties or items. It recursively merges nested objects and arrays, handling various data types and edge cases.

#### Parameters

- `...sources: T[]` - The objects or arrays to merge

#### Returns

A new object or array containing the merged properties/items.

#### Type Parameters

- `T` - The type of the objects/arrays being merged

#### Limitations

- Cannot mix arrays and objects in the same merge operation
- Does not preserve references to source objects
- Arrays are concatenated rather than recursively merged

#### Examples

**Merging objects**

```ts
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { b: { d: 3 }, e: 4 };
const result = deepMerge(obj1, obj2);
// result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

**Merging arrays**

```ts
const arr1 = [1, 2, { a: 1 }];
const arr2 = [3, { a: 2, b: 3 }];
const result = deepMerge(arr1, arr2);
// result: [1, 2, { a: 1 }, 3, { a: 2, b: 3 }]
```

### `deepMergeWithOptions(target, ...args)`

Merges objects or arrays with options for reference preservation and strict merging.

This versatile function provides additional control over how merging is performed, including whether to modify the target object directly and whether to add new properties that don't exist in the target.

#### Parameters

- `target: T` - The target object/array to merge into
- `...args` - The source objects/arrays to merge from, with an optional options object as the last argument

#### Options

- `preserveTarget?: boolean` - Whether to modify the target object directly (default: `false`)
- `strict?: boolean` - Whether to only merge properties that already exist in the target (default: `false`)

#### Returns

The merged object or array (either a new instance or the modified target).

#### Type Parameters

- `T` - The type of the target object/array

#### Examples

**With reference preservation**

```ts
const obj1 = { a: 1, b: { c: 2 } };
const result = deepMergeWithOptions(obj1, { b: { d: 3 }, e: 4 }, { preserveTarget: true });
// result === obj1 (same reference)
// result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

**With strict merging**

```ts
const obj1 = { a: 1, b: { c: 2 } };
const result = deepMergeWithOptions(obj1, { b: { d: 3 }, e: 4 }, { strict: true });
// result: { a: 1, b: { c: 2 } } - 'e' is not added as it doesn't exist in obj1
//                                 'd' is not added to 'b' as it doesn't exist in obj1.b
```

## Specialized Functions

### `deepMergeKeepReference(target, ...sources)`

Deep merges objects/arrays while preserving the reference to the first object/array.

This function modifies the target object directly rather than creating a new one, making it useful for in-place updates.

#### Parameters

- `target: T` - The target object that will be modified
- `...sources: object[]` - The source objects to merge from

#### Returns

The modified target object (same reference).

#### Type Parameters

- `T` - The type of the target object

#### Examples

```ts
const obj1 = { a: 1, b: { c: 2 } };
const result = deepMergeKeepReference(obj1, { b: { d: 3 }, e: 4 });
// result === obj1 (same reference)
// obj1 is now: { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

### `deepMergeStrict(target, ...args)`

Strict deep merge - only merges properties that already exist in the target.

This function does not add new properties that don't exist in the target, making it useful for partial updates while maintaining the original object structure.

#### Parameters

- `target: T` - The target object
- `...args` - The source objects to merge from, with an optional boolean flag as the last argument

The optional boolean flag indicates whether to preserve the reference to target (default: `false`).

#### Returns

The merged object.

#### Type Parameters

- `T` - The type of the target object

#### Examples

```ts
const obj1 = { a: 1, b: { c: 2 } };
const result = deepMergeStrict(obj1, { b: { d: 3 }, e: 4 });
// result: { a: 1, b: { c: 2 } } - 'e' is not added as it doesn't exist in obj1
//                                 'd' is not added to 'b' as it doesn't exist in obj1.b
```

With reference preservation:

```ts
const obj1 = { a: 1, b: { c: 2 } };
const result = deepMergeStrict(obj1, { b: { c: 3 } }, true);
// result === obj1 (same reference)
// obj1 is now: { a: 1, b: { c: 3 } }
```

## Aliases

For convenience, the following aliases are provided:

- `merge` → `deepMerge`
- `mergeKeepReference` → `deepMergeKeepReference`
- `mergeStrict` → `deepMergeStrict`
- `mergeWithOptions` → `deepMergeWithOptions`

## Use Cases

- Creating immutable state updates in Redux or similar state management
- Merging configuration objects with defaults
- Combining data from multiple sources
- Creating partial updates of existing objects
- Schema-based object validation and transformation

## Performance Considerations

- When merging very large objects or arrays, consider using a more specialized library or a non-recursive implementation
- The `preserveTarget` option can improve performance by avoiding creating new objects
- The `strict` option can improve performance by reducing the number of properties processed