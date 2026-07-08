import { ClassType } from '@fluixi/utils/primitive';
import { AnyObject, RecordObject, SelectorSegment } from './types.js';

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
export const isObject = (value: unknown): value is RecordObject => {
  if (value == null) return false;
  if (Array.isArray(value)) return false;
  if (typeof value === 'function') return false;
  if (value instanceof Date) return false;
  if (value instanceof RegExp) return false;
  if (value instanceof Map) return false;
  if (value instanceof Set) return false;
  if (value instanceof Error) return false;
  return typeof value === 'object';
};

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
export function isPlainObject<
  T extends Record<string, any> = Record<string, any>
>(v: unknown): v is T {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

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
export function isClass(obj: unknown): obj is ClassType {
  return (
    typeof obj === 'function' &&
    /^class\s/.test(Function.prototype.toString.call(obj))
  );
}

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
export const isEmptyObject = (value: unknown): boolean => {
  if (!isObject(value)) return false;
  return Object.keys(value).length === 0;
};

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
export const traverseStructure = (
  current: any,
  segments: SelectorSegment[],
  depth: number,
  maxDepth: number
): any => {
  // console.log('traversing', current)
  // console.log('traversing segments', segments)
  if (depth > maxDepth) return undefined;
  if (segments.length === 0) return current;

  const segment = segments[0];
  const remaining = segments.slice(1);

  // Handle descendant selector
  if (segment.type === 'descendant') {
    // Collect all matching paths in structure
    const result = traverseStructure(current, remaining, depth + 1, maxDepth);
    if (result !== undefined) {
      return result;
    }

    // Recursively search in all properties
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        const arrResult: any[] = [];
        for (let i = 0; i < current.length; i++) {
          const itemResult = traverseStructure(
            current[i],
            segments,
            depth + 1,
            maxDepth
          );
          if (itemResult !== undefined) {
            arrResult[i] = itemResult;
          }
        }
        return arrResult.length > 0 ? arrResult : undefined;
      } else {
        const objResult: AnyObject = {};
        for (const key in current) {
          if (current.hasOwnProperty(key)) {
            const itemResult = traverseStructure(
              current[key],
              segments,
              depth + 1,
              maxDepth
            );
            if (itemResult !== undefined) {
              objResult[key] = itemResult;
            }
          }
        }
        return Object.keys(objResult).length > 0 ? objResult : undefined;
      }
    }
    return undefined;
  }
  // console.log('is wildcard', segment)

  // Handle different segment types
  switch (segment.type) {
    case 'property':
      if (
        isObject(current) &&
        segment.value &&
        String(segment.value) in current
      ) {
        const next = (current as any)[String(segment.value)];
        const result = traverseStructure(next, remaining, depth + 1, maxDepth);
        if (result !== undefined) {
          return { [String(segment.value)]: result };
        }
      }
      break;

    case 'index':
      if (Array.isArray(current)) {
        const index = segment.value as number;
        if (index >= 0 && index < current.length) {
          const result = traverseStructure(
            current[index],
            remaining,
            depth + 1,
            maxDepth
          );
          // console.log('res', result)
          if (result !== undefined) {
            const arr = new Array(current.length).filter(
              (a) => a !== undefined
            );
            arr[index] = result;
            return arr;
          }
        }
      } else if (current && typeof current === 'object') {
        const key = String(segment.value);
        if (key in current) {
          const result = traverseStructure(
            current[key],
            remaining,
            depth + 1,
            maxDepth
          );
          if (result !== undefined) {
            return { [key]: result };
          }
        }
      }
      break;

    case 'wildcard':
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          const arrResult: any[] = [];
          let hasResults = false;
          for (let i = 0; i < current.length; i++) {
            const result = traverseStructure(
              current[i],
              remaining,
              depth + 1,
              maxDepth
            );
            if (result !== undefined) {
              arrResult[i] = result;
              hasResults = true;
            }
          }
          return hasResults ? arrResult : undefined;
        } else {
          const objResult: AnyObject = {};
          let hasResults = false;
          for (const key in current) {
            if (current.hasOwnProperty(key)) {
              const result = traverseStructure(
                current[key],
                remaining,
                depth + 1,
                maxDepth
              );
              if (result !== undefined) {
                objResult[key] = result;
                hasResults = true;
              }
            }
          }
          return hasResults ? objResult : undefined;
        }
      }
      break;

    case 'slice':
      if (Array.isArray(current)) {
        const [start, end] = segment.value as [number, number];
        const actualStart = Math.max(0, start);
        const actualEnd = Math.min(
          current.length,
          end === Infinity ? current.length : end
        );
        const arrResult: any[] = [];
        let hasResults = false;

        for (let i = actualStart; i < actualEnd; i++) {
          const result = traverseStructure(
            current[i],
            remaining,
            depth + 1,
            maxDepth
          );
          if (result !== undefined) {
            arrResult[i] = result;
            hasResults = true;
          }
        }
        return hasResults ? arrResult : undefined;
      }
      break;

    case 'union':
      if (Array.isArray(current)) {
        const indices = segment.value as number[];
        const arrResult: any[] = [];
        let hasResults = false;

        for (const index of indices) {
          if (index >= 0 && index < current.length) {
            const result = traverseStructure(
              current[index],
              remaining,
              depth + 1,
              maxDepth
            );
            if (result !== undefined) {
              arrResult[index] = result;
              hasResults = true;
            }
          }
        }
        return hasResults ? arrResult : undefined;
      }
      break;

    case 'filter':
      if (Array.isArray(current)) {
        const filterFn = segment.value as (item: any) => boolean;
        const arrResult: any[] = [];
        let hasResults = false;

        for (let i = 0; i < current.length; i++) {
          if (filterFn(current[i])) {
            const result = traverseStructure(
              current[i],
              remaining,
              depth + 1,
              maxDepth
            );
            if (result !== undefined) {
              arrResult[i] = result;
              hasResults = true;
            }
          }
        }
        return hasResults ? arrResult : undefined;
      }
      break;
  }

  return undefined;
};

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
export function toJSONString(value: any, space = 0) {
  const seen = new WeakSet();
  const gap = (n: number) => (space ? ' '.repeat(n) : '');
  const nl = (n: number) => (space ? `\n${' '.repeat(n)}` : '');

  const esc = (s: string) =>
    s.replace(/[\u0000-\u001F"\\]/g, (c) => {
      switch (c) {
        case '"':
          return '\\"';
        case '\\':
          return '\\\\';
        case '\b':
          return '\\b';
        case '\f':
          return '\\f';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '\t':
          return '\\t';
        default:
          const code = c.charCodeAt(0).toString(16).padStart(4, '0');
          return `\\u${code}`;
      }
    });

  const ser = (v: any, indent: number): string => {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? String(v) : 'null';
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') {
      // if(v.startsWith('icons.')){
      //     return v
      // }else{
      //     return `"${esc(v)}"`
      // }
    }
    if (t === 'bigint') return `"${String(v)}"`;
    if (t === 'function' || t === 'undefined' || t === 'symbol')
      return undefined as any;

    if (Array.isArray(v)) {
      if (seen.has(v))
        throw new TypeError('Converting circular structure to JSON');
      seen.add(v);
      const next = indent + space;
      const parts = v.map((x) => {
        const s = ser(x, next);
        return s === undefined ? 'null' : s;
      });
      seen.delete(v);
      if (!space) return `[${parts.join(',')}]`;
      return `[${nl(next)}${parts.join(`,${nl(next)}`)}${nl(indent)}]`;
    }

    if (t === 'object') {
      if (seen.has(v))
        throw new TypeError('Converting circular structure to JSON');
      seen.add(v);
      const keys = Object.keys(v);
      const next = indent + space;
      const parts: string[] = [];
      // const valueOrEsc = (str: string)=>{
      //     if(str.startsWith('icon.')){
      //         return str
      //     }
      //     return
      // }
      for (const k of keys) {
        const s = ser(v[k], next);
        if (s !== undefined) {
          if (!space) parts.push(`"${esc(k)}":${s}`);
          else parts.push(`${gap(next)}"${esc(k)}": ${s}`);
        }
      }
      seen.delete(v);
      if (!space) return `{${parts.join(',')}}`;
      return `{\n${parts.join(',\n')}\n${gap(indent)}}`;
    }
    return undefined as any;
  };

  const out = ser(value, 0);
  return out === undefined ? undefined : out;
}
