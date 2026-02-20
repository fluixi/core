/**
 * Object transformation utilities for restructuring, mapping, and applying transformations.
 * @module transform
 */
import { AnyObject, SelectorFor } from './types.js';
/**
 * Maps object values with a transform function, keeping the same keys
 *
 * Creates a new object with the same keys as the input, but with transformed values
 * using the provided function. The function receives the value, key, and original object.
 *
 * @template T - The input object type
 * @template R - The transformed value type
 * @param obj - The source object
 * @param fn - The transform function to apply to each value
 * @returns A new object with transformed values
 *
 * @example
 * ```ts
 * const prices = { apple: '1.25', banana: '0.75', orange: '1.00' };
 * const numericPrices = mapValues(prices, price => parseFloat(price));
 * // { apple: 1.25, banana: 0.75, orange: 1 }
 * ```
 */
export declare function mapValues<T extends AnyObject, R>(obj: T, fn: (value: T[keyof T], key: string, obj: T) => R): Record<keyof T, R>;
/**
 * Maps object keys with a transform function, keeping the same values
 *
 * Creates a new object with transformed keys using the provided function,
 * while maintaining the original values. The function receives the key, value, and original object.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param fn - The transform function to apply to each key
 * @returns A new object with transformed keys
 *
 * @example
 * ```ts
 * const data = { firstName: 'Alice', lastName: 'Smith' };
 * const camelToSnake = mapKeys(data, key => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`));
 * // { first_name: 'Alice', last_name: 'Smith' }
 * ```
 */
export declare function mapKeys<T extends AnyObject>(obj: T, fn: (key: string, value: T[keyof T], obj: T) => string): Record<string, T[keyof T]>;
/**
 * Transforms keys to camelCase
 *
 * Creates a new object with all keys transformed to camelCase format.
 * Handles keys in kebab-case, snake_case, and PascalCase.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param options - Transformation options
 * @param options.deep - Whether to transform nested objects (default: true)
 * @returns A new object with camelCase keys
 *
 * @example
 * ```ts
 * const data = {
 *   first_name: 'Alice',
 *   'last-name': 'Smith',
 *   ContactInfo: {
 *     email_address: 'alice@example.com',
 *     phone_number: '555-1234'
 *   }
 * };
 *
 * const camelCased = camelCaseKeys(data);
 * // {
 * //   firstName: 'Alice',
 * //   lastName: 'Smith',
 * //   contactInfo: {
 * //     emailAddress: 'alice@example.com',
 * //     phoneNumber: '555-1234'
 * //   }
 * // }
 * ```
 */
export declare function camelCaseKeys<T extends AnyObject>(obj: T, options?: {
    deep?: boolean;
}): Record<string, any>;
/**
 * Transforms keys to snake_case
 *
 * Creates a new object with all keys transformed to snake_case format.
 * Handles keys in camelCase, kebab-case, and PascalCase.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param options - Transformation options
 * @param options.deep - Whether to transform nested objects (default: true)
 * @returns A new object with snake_case keys
 *
 * @example
 * ```ts
 * const data = {
 *   firstName: 'Alice',
 *   'last-name': 'Smith',
 *   ContactInfo: {
 *     emailAddress: 'alice@example.com',
 *     phoneNumber: '555-1234'
 *   }
 * };
 *
 * const snakeCased = snakeCaseKeys(data);
 * // {
 * //   first_name: 'Alice',
 * //   last_name: 'Smith',
 * //   contact_info: {
 * //     email_address: 'alice@example.com',
 * //     phone_number: '555-1234'
 * //   }
 * // }
 * ```
 */
export declare function snakeCaseKeys<T extends AnyObject>(obj: T, options?: {
    deep?: boolean;
}): Record<string, any>;
/**
 * Transforms keys to kebab-case
 *
 * Creates a new object with all keys transformed to kebab-case format.
 * Handles keys in camelCase, snake_case, and PascalCase.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param options - Transformation options
 * @param options.deep - Whether to transform nested objects (default: true)
 * @returns A new object with kebab-case keys
 *
 * @example
 * ```ts
 * const data = {
 *   firstName: 'Alice',
 *   last_name: 'Smith',
 *   ContactInfo: {
 *     emailAddress: 'alice@example.com',
 *     phone_number: '555-1234'
 *   }
 * };
 *
 * const kebabCased = kebabCaseKeys(data);
 * // {
 * //   'first-name': 'Alice',
 * //   'last-name': 'Smith',
 * //   'contact-info': {
 * //     'email-address': 'alice@example.com',
 * //     'phone-number': '555-1234'
 * //   }
 * // }
 * ```
 */
export declare function kebabCaseKeys<T extends AnyObject>(obj: T, options?: {
    deep?: boolean;
}): Record<string, any>;
/**
 * Flattens a nested object structure into a single-level object with path-based keys
 *
 * Creates a new flat object where nested keys are represented as path strings.
 * Supports custom path delimiters and array handling.
 *
 * @template T - The input object type
 * @param obj - The source object to flatten
 * @param options - Flattening options
 * @param options.delimiter - Character(s) to separate path segments (default: '.')
 * @param options.includeArrays - Whether to flatten arrays (default: true)
 * @param options.maxDepth - Maximum depth to flatten (default: Infinity)
 * @returns A flattened object with path keys
 *
 * @example
 * ```ts
 * const user = {
 *   name: {
 *     first: 'Alice',
 *     last: 'Smith'
 *   },
 *   contacts: [
 *     { type: 'email', value: 'alice@example.com' },
 *     { type: 'phone', value: '555-1234' }
 *   ]
 * };
 *
 * const flattened = flatten(user);
 * // {
 * //   'name.first': 'Alice',
 * //   'name.last': 'Smith',
 * //   'contacts.0.type': 'email',
 * //   'contacts.0.value': 'alice@example.com',
 * //   'contacts.1.type': 'phone',
 * //   'contacts.1.value': '555-1234'
 * // }
 * ```
 */
export declare const flatten: (obj: AnyObject, options?: {
    delimiter?: string;
    includeArrays?: boolean;
    maxDepth?: number;
}) => AnyObject;
/**
 * Unflatten a single-level object with path-based keys into a nested object structure
 *
 * Reverses the flattening process, converting an object with path keys back into a nested structure.
 * Supports custom path delimiters and array detection.
 *
 * @param obj - The flattened object to unflatten
 * @param options - Unflattening options
 * @param options.delimiter - Character(s) that separate path segments (default: '.')
 * @param options.detectArrays - Whether to convert numeric indices to arrays (default: true)
 * @returns A nested object structure
 *
 * @example
 * ```ts
 * const flattened = {
 *   'user.name.first': 'Alice',
 *   'user.name.last': 'Smith',
 *   'user.contacts.0.type': 'email',
 *   'user.contacts.0.value': 'alice@example.com',
 *   'user.contacts.1.type': 'phone',
 *   'user.contacts.1.value': '555-1234'
 * };
 *
 * const nested = unflatten(flattened);
 * // {
 * //   user: {
 * //     name: {
 * //       first: 'Alice',
 * //       last: 'Smith'
 * //     },
 * //     contacts: [
 * //       { type: 'email', value: 'alice@example.com' },
 * //       { type: 'phone', value: '555-1234' }
 * //     ]
 * //   }
 * // }
 * ```
 */
export declare function unflatten(obj: Record<string, any>, options?: {
    delimiter?: string;
    detectArrays?: boolean;
}): Record<string, any>;
/**
 * Transforms object values by applying a series of transform functions
 *
 * Creates a new object with the same structure as the input,
 * but with all values transformed by the provided sequence of functions.
 * Each function is applied in order to the result of the previous function.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param transformers - One or more transform functions to apply
 * @returns A new object with transformed values
 *
 * @example
 * ```ts
 * const data = {
 *   name: '  Alice Smith  ',
 *   email: 'ALICE@EXAMPLE.COM',
 *   score: '85'
 * };
 *
 * // Apply multiple transforms: trim strings, convert to lowercase, and parse numbers
 * const transformed = transformValues(data,
 *   value => typeof value === 'string' ? value.trim() : value,
 *   value => typeof value === 'string' ? value.toLowerCase() : value,
 *   value => !isNaN(Number(value)) ? Number(value) : value
 * );
 *
 * // {
 * //   name: 'alice smith',
 * //   email: 'alice@example.com',
 * //   score: 85
 * // }
 * ```
 */
export declare function transformValues<T extends AnyObject>(obj: T, ...transformers: Array<(value: any) => any>): Record<keyof T, any>;
/**
 * Renames keys in an object according to a mapping
 *
 * Creates a new object with keys renamed according to the provided mapping.
 * Keys not in the mapping are kept unchanged.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param mapping - Object mapping from original keys to new keys
 * @param options - Renaming options
 * @param options.removeUnmapped - Whether to remove keys not in the mapping (default: false)
 * @returns A new object with renamed keys
 *
 * @example
 * ```ts
 * const user = {
 *   first_name: 'Alice',
 *   last_name: 'Smith',
 *   email: 'alice@example.com',
 *   age: 30
 * };
 *
 * const renamed = renameKeys(user, {
 *   first_name: 'firstName',
 *   last_name: 'lastName'
 * });
 *
 * // {
 * //   firstName: 'Alice',
 * //   lastName: 'Smith',
 * //   email: 'alice@example.com',
 * //   age: 30
 * // }
 * ```
 */
export declare function renameKeys<T extends AnyObject, M extends Record<string, string>>(obj: T, mapping: M, options?: {
    removeUnmapped?: boolean;
}): Record<string, any>;
/**
 * Deeply transforms objects, arrays, and values in a nested structure
 *
 * Recursively traverses an object or array and applies different transform functions
 * based on the type of each node (object, array, or primitive value).
 *
 * @template T - The input type
 * @param data - The data to transform
 * @param options - Transform options
 * @param options.transformObject - Function to transform objects (default: identity)
 * @param options.transformArray - Function to transform arrays (default: identity)
 * @param options.transformValue - Function to transform primitive values (default: identity)
 * @param options.maxDepth - Maximum depth to transform (default: Infinity)
 * @returns The transformed data
 *
 * @example
 * ```ts
 * const data = {
 *   user: {
 *     name: 'Alice Smith',
 *     scores: [85, 92, 78],
 *     active: true
 *   },
 *   metadata: {
 *     lastUpdated: '2023-01-15'
 *   }
 * };
 *
 * // Apply different transformations to objects, arrays, and primitive values
 * const result = deepTransform(data, {
 *   transformObject: obj => ({ ...obj, _transformed: true }),
 *   transformArray: arr => arr.map(x => typeof x === 'number' ? x + 10 : x),
 *   transformValue: (val, key) => key === 'name' ? val.toUpperCase() : val
 * });
 *
 * // {
 * //   user: {
 * //     name: 'ALICE SMITH',
 * //     scores: [95, 102, 88],
 * //     active: true,
 * //     _transformed: true
 * //   },
 * //   metadata: {
 * //     lastUpdated: '2023-01-15',
 * //     _transformed: true
 * //   },
 * //   _transformed: true
 * // }
 * ```
 */
export declare function deepTransform<T, K extends SelectorFor<T>, R>(data: T, options?: {
    transformObject?: (obj: Record<string, any>, path: K[]) => Record<string, any>;
    transformArray?: (arr: any[], path: K[]) => R[];
    transformValue?: (value: any, key: string, path: K[]) => R;
    maxDepth?: number;
}): T;
/**
 * Transforms a flat object with key-value pairs into a structured object by key pattern
 *
 * Useful for converting flat configuration objects or query parameters into structured objects.
 * Groups keys by a shared prefix and nests them accordingly.
 *
 * @param obj - The flat object to structure
 * @param options - Structuring options
 * @param options.separator - The character(s) that separate key parts (default: '.')
 * @param options.detectArrays - Whether to convert numeric indices to arrays (default: true)
 * @returns A structured object
 *
 * @example
 * ```ts
 * const params = {
 *   'user.name': 'Alice',
 *   'user.email': 'alice@example.com',
 *   'preferences.theme': 'dark',
 *   'preferences.notifications': 'true',
 *   'items.0.id': '1001',
 *   'items.0.name': 'Widget',
 *   'items.1.id': '1002',
 *   'items.1.name': 'Gadget'
 * };
 *
 * const structured = structureByKeys(params);
 * // {
 * //   user: {
 * //     name: 'Alice',
 * //     email: 'alice@example.com'
 * //   },
 * //   preferences: {
 * //     theme: 'dark',
 * //     notifications: 'true'
 * //   },
 * //   items: [
 * //     { id: '1001', name: 'Widget' },
 * //     { id: '1002', name: 'Gadget' }
 * //   ]
 * // }
 * ```
 */
export declare function structureByKeys(obj: Record<string, any>, options?: {
    separator?: string;
    detectArrays?: boolean;
}): Record<string, any>;
/**
 * Transforms values at specific paths in an object
 *
 * Applies transform functions to values at the specified path(s),
 * supporting advanced path selectors including property paths, array indices,
 * wildcards, and filters. Supports transforming multiple paths in a single operation.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param paths - Path selector or array of path selectors to the values to transform
 * @param transformer - Function to transform the value
 * @param options - Additional options
 * @param options.transformAll - Whether to apply transformer to all paths or individually (default: false)
 * @returns A new object with the transformed value(s)
 *
 * @example
 * ```ts
 * const user = {
 *   id: 1,
 *   name: 'Alice Smith',
 *   profile: {
 *     email: 'alice@example.com',
 *     settings: {
 *       notifications: true
 *     }
 *   },
 *   posts: [
 *     { id: 101, title: 'Hello', likes: 5 },
 *     { id: 102, title: 'World', likes: 10 }
 *   ]
 * };
 *
 * // Transform a simple property
 * const result1 = transformPath(user, 'name', name => name.toUpperCase());
 * // user.name becomes 'ALICE SMITH'
 *
 * // Transform a nested property
 * const result2 = transformPath(user, 'profile.email', email => email.split('@')[0] + '@example.org');
 * // user.profile.email becomes 'alice@example.org'
 *
 * // Transform using wildcards
 * const result3 = transformPath(user, 'posts[*].likes', likes => likes * 2);
 * // All post likes are doubled
 *
 * // Transform multiple paths
 * const result4 = transformPath(
 *   user,
 *   ['name', 'profile.email', 'posts[*].likes'],
 *   value => {
 *     if (typeof value === 'string') return value.toUpperCase();
 *     if (typeof value === 'number') return value * 2;
 *     return value;
 *   }
 * );
 * // Transforms multiple properties at once
 *
 * // Use path-specific transformations
 * const result5 = transformPath(
 *   user,
 *   ['name', 'profile.email', 'posts[*].likes'],
 *   (value, path) => {
 *     if (path === 'name') return value.toUpperCase();
 *     if (path === 'profile.email') return value.split('@')[0] + '@example.org';
 *     if (path.includes('likes')) return value + 10;
 *     return value;
 *   },
 *   { transformAll: true }
 * );
 * ```
 */
export declare function transformPath<T>(obj: T, paths: string | string[], transformer: (value: any, path?: string, parent?: any) => any, options?: {
    transformAll?: boolean;
}): T;
/**
 * Maps values at specific paths in an object
 *
 * Similar to transformPath, but returns an array of transformed values
 * rather than modifying the object structure. Supports mapping multiple paths
 * in a single operation.
 *
 * @template T - The input object type
 * @template R - The output value type
 * @param obj - The source object
 * @param paths - Path selector or array of path selectors to the values to map
 * @param mapper - Function to transform each value
 * @param options - Additional options
 * @param options.flatten - Whether to flatten the results into a single array (default: true)
 * @returns An array of transformed values
 *
 * @example
 * ```ts
 * const data = {
 *   users: [
 *     { id: 1, name: 'Alice', age: 30 },
 *     { id: 2, name: 'Bob', age: 25 },
 *     { id: 3, name: 'Charlie', age: 35 }
 *   ]
 * };
 *
 * // Extract and transform user names
 * const names = mapPath(data, 'users[*].name', name => name.toUpperCase());
 * // ['ALICE', 'BOB', 'CHARLIE']
 *
 * // Filter and transform
 * const youngUsers = mapPath(data, 'users[?(@.age < 30)].name', (name, user) => ({
 *   name,
 *   greeting: `Hello, ${name}!`
 * }));
 * // [{ name: 'Bob', greeting: 'Hello, Bob!' }]
 *
 * // Map multiple paths
 * const info = mapPath(
 *   data,
 *   ['users[*].name', 'users[*].age'],
 *   value => typeof value === 'string' ? value.toUpperCase() : value
 * );
 * // ['ALICE', 'BOB', 'CHARLIE', 30, 25, 35]
 *
 * // Map multiple paths with path context
 * const info = mapPath(
 *   data,
 *   ['users[*].name', 'users[*].age'],
 *   (value, path) => {
 *     if (path.includes('name')) return `Name: ${value}`;
 *     if (path.includes('age')) return `Age: ${value}`;
 *     return value;
 *   }
 * );
 * // ['Name: Alice', 'Name: Bob', 'Name: Charlie', 'Age: 30', 'Age: 25', 'Age: 35']
 * ```
 */
export declare function mapPath<T, K extends SelectorFor<T> | SelectorFor<T>[], R>(obj: T, paths: K, mapper: (value: any, path?: string, parent?: any) => R, options?: {
    flatten?: boolean;
}): R[];
/**
 * Transforms keys at specific paths in an object
 *
 * Applies a transform function to keys at the specified path(s),
 * supporting advanced path selectors. Supports transforming keys at multiple paths
 * in a single operation.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param paths - Path selector or array of path selectors to the objects whose keys should be transformed
 * @param transformer - Function to transform each key
 * @param options - Additional options
 * @param options.recursive - Whether to recursively transform nested object keys (default: false)
 * @returns A new object with transformed keys at the specified path(s)
 *
 * @example
 * ```ts
 * const data = {
 *   user: {
 *     personal_info: {
 *       first_name: 'Alice',
 *       last_name: 'Smith',
 *       email_address: 'alice@example.com'
 *     },
 *     work_info: {
 *       job_title: 'Developer',
 *       department_name: 'Engineering'
 *     }
 *   }
 * };
 *
 * // Transform snake_case keys to camelCase at a single path
 * const result1 = transformKeysAtPath(data, 'user.personal_info', key =>
 *   key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
 * );
 *
 * // Transform keys at multiple paths
 * const result2 = transformKeysAtPath(
 *   data,
 *   ['user.personal_info', 'user.work_info'],
 *   key => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
 * );
 *
 * // Recursively transform all nested keys
 * const result3 = transformKeysAtPath(
 *   data,
 *   'user',
 *   key => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
 *   { recursive: true }
 * );
 *
 * // Result3:
 * // {
 * //   user: {
 * //     personalInfo: {
 * //       firstName: 'Alice',
 * //       lastName: 'Smith',
 * //       emailAddress: 'alice@example.com'
 * //     },
 * //     workInfo: {
 * //       jobTitle: 'Developer',
 * //       departmentName: 'Engineering'
 * //     }
 * //   }
 * // }
 * ```
 */
export declare function transformKeysAtPath<T>(obj: T, paths: string | string[], transformer: (key: string, value: any, path?: string) => string, options?: {
    recursive?: boolean;
}): T;
//# sourceMappingURL=transform.d.ts.map