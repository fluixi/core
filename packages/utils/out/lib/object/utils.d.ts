import { ClassType } from '@fluixi/utils/primitive';
import { RecordObject, SelectorSegment } from './types.js';
/**
 * Checks if a value is an object (not array, function, date, etc.)
 *
 * This function determines if a value is a plain JavaScript object by excluding
 * arrays, functions, and built-in object types like Date, RegExp, Map, etc.
 *
 * @param value - The value to check
 * @returns `true` if value is a plain object; `false` otherwise
 *
 * @example
 * ```ts
 * isObject({});              // true
 * isObject({ key: 'value' }); // true
 *
 * isObject([]);              // false
 * isObject(null);            // false
 * isObject(undefined);       // false
 * isObject(new Date());      // false
 * isObject(() => {});        // false
 * isObject(new Map());       // false
 * ```
 *
 * @category Type Checking
 * @see isPlainObject - For stricter object type checking
 */
export declare const isObject: (value: unknown) => value is RecordObject;
/**
 * Checks if a value is a plain object (only Object.prototype or null in prototype chain)
 *
 * Unlike {@link isObject}, this function performs a stricter check to ensure the value
 * is a "plain" object - created via object literal `{}` or `Object.create(null)`.
 * This excludes objects created with custom constructors.
 *
 * @template T - The expected object type
 * @param v - The value to check
 * @returns `true` if value is a plain object; `false` otherwise
 *
 * @example
 * ```ts
 * isPlainObject({});                   // true
 * isPlainObject(Object.create(null));  // true
 *
 * class Custom {}
 * isPlainObject(new Custom());         // false
 * isPlainObject([]);                   // false
 * isPlainObject(null);                 // false
 * ```
 *
 * @category Type Checking
 */
export declare function isPlainObject<T extends Record<string, any> = Record<string, any>>(v: unknown): v is T;
/**
 * Checks if a value is a class constructor
 *
 * This function determines if a value is a class constructor by checking
 * if it's a function and if its string representation starts with the "class" keyword.
 *
 * @param obj - The value to check
 * @returns `true` if value is a class constructor; `false` otherwise
 *
 * @example
 * ```ts
 * class Example {}
 * isClass(Example);           // true
 *
 * function regularFn() {}
 * isClass(regularFn);         // false
 *
 * const arrowFn = () => {};
 * isClass(arrowFn);           // false
 * ```
 *
 * @category Type Checking
 */
export declare function isClass(obj: unknown): obj is ClassType;
/**
 * Checks if a value is an empty object
 *
 * This function determines if a value is an object with no enumerable properties.
 * It first checks if the value is an object using {@link isObject} and then
 * checks if it has any enumerable properties.
 *
 * @param value - The value to check
 * @returns `true` if value is an object with no properties; `false` otherwise
 *
 * @example
 * ```ts
 * isEmptyObject({});               // true
 * isEmptyObject(Object.create(null)); // true
 *
 * isEmptyObject({a: 1});           // false
 * isEmptyObject(null);             // false
 * isEmptyObject([]);               // false (arrays are not objects in this context)
 * ```
 *
 * @category Type Checking
 * @see isObject - Used internally for type checking
 */
export declare const isEmptyObject: (value: unknown) => boolean;
/**
 * Traverses an object structure based on selector segments
 *
 * This advanced utility function traverses a data structure (object or array) based on
 * a series of selector segments. It preserves the structure of the original data while
 * navigating through it. The function supports various selector types including property access,
 * array indexing, wildcards, slices, unions, filters, and recursive descent.
 *
 * @param current - The current object/array being traversed
 * @param segments - An array of selector segments that define the traversal path
 * @param depth - The current traversal depth (for recursion limits)
 * @param maxDepth - The maximum depth to traverse (prevents infinite recursion)
 * @returns The traversed structure or undefined if no match found
 *
 * @example
 * ```ts
 * // Access nested property with a simple path
 * const data = { users: [{ name: 'Alice', age: 30 }] };
 * const segments = [
 *   { type: 'property', value: 'users' },
 *   { type: 'index', value: 0 },
 *   { type: 'property', value: 'name' }
 * ];
 * traverseStructure(data, segments, 0, 10); // { users: [{ name: 'Alice' }] }
 * ```
 *
 * @internal
 * @category Object Traversal
 */
export declare const traverseStructure: (current: any, segments: SelectorSegment[], depth: number, maxDepth: number) => any;
/**
 * Converts a value to a JSON string with improved handling of special cases
 *
 * This function converts a JavaScript value to a JSON string, similar to `JSON.stringify`,
 * but with improved handling of circular references and special character escaping.
 *
 * @param value - The value to convert to a JSON string
 * @param space - The number of spaces to use for indentation (0 for no formatting)
 * @returns The JSON string representation of the value or undefined for unsupported types
 *
 * @example
 * ```ts
 * // Basic usage
 * toJSONString({ name: 'Alice', age: 30 });
 * // '{"name":"Alice","age":30}'
 *
 * // With formatting
 * toJSONString({ name: 'Alice', age: 30 }, 2);
 * // '{
 * //   "name": "Alice",
 * //   "age": 30
 * // }'
 *
 * // Handles circular references safely
 * const circular = { self: null };
 * circular.self = circular;
 * toJSONString(circular); // throws TypeError (circular structure)
 * ```
 *
 * @throws {TypeError} When encountering circular references
 * @category Serialization
 */
export declare function toJSONString(value: any, space?: number): string | undefined;
//# sourceMappingURL=utils.d.ts.map