import { AnyObject, SelectorSegment } from './types.js';
import { isObject } from './utils.js';
import { deletePath, get, set } from './getter-setter.js';
import { parseSelector } from './selector.js';
import { deepMerge } from './merge.js';

/**
 * Omits specified properties from an object
 *
 * Creates a new object without the specified keys. This is a shallow operation -
 * nested objects are copied by reference.
 *
 * @template T - The input object type
 * @template K - The keys to omit from the object
 * @param obj - The source object
 * @param keys - The keys to omit
 * @returns A new object without the omitted keys
 *
 * @example
 * ```ts
 * const user = { id: 1, name: 'Alice', password: 'secret' };
 * const safeUser = omit(user, ['password']);
 * // { id: 1, name: 'Alice' }
 * ```
 *
 * @example
 * ```ts
 * const config = { server: 'localhost', port: 8080, timeout: 5000, retries: 3 };
 * const essentialConfig = omit(config, ['timeout', 'retries']);
 * // { server: 'localhost', port: 8080 }
 * ```
 */
export function omit<T extends AnyObject, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  if (!isObject(obj)) {
    return {} as Omit<T, K>;
  }

  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result as Omit<T, K>;
}

/**
 * Deeply omits specified properties at any level of an object or array
 *
 * Recursively removes the specified keys from an object and all nested objects.
 * Creates a new deep copy of the object with the keys removed at every level.
 *
 * @template T - The input object type
 * @param obj - The source object or array
 * @param keys - Keys to omit at any level
 * @returns A new deep copy with the keys omitted at every level
 *
 * @example
 * ```ts
 * const user = {
 *   id: 1,
 *   name: 'Alice',
 *   meta: {
 *     password: 'secret',
 *     tokens: {
 *       refresh: 'abc',
 *       password: '123'
 *     }
 *   }
 * };
 *
 * const safeUser = deepOmit(user, ['password']);
 * // {
 * //   id: 1,
 * //   name: 'Alice',
 * //   meta: {
 * //     tokens: {
 * //       refresh: 'abc'
 * //     }
 * //   }
 * // }
 * ```
 */
export function deepOmit<T>(obj: T, keys: string[]): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepOmit(item, keys)) as unknown as T;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (!keys.includes(key)) {
      result[key] = deepOmit(value, keys);
    }
  }

  return result as T;
}

/**
 * Creates a function that omits specific properties from objects
 *
 * Returns a reusable function that will omit the specified keys from any object passed to it.
 * This is useful when you need to omit the same keys from multiple objects.
 *
 * @template K - The keys to omit
 * @param keys - The keys to omit from objects
 * @returns A function that omits the specified keys from objects
 *
 * @example
 * ```ts
 * const removeSensitiveData = createOmitter(['password', 'ssn', 'creditCard']);
 *
 * const user1 = { id: 1, name: 'Alice', password: 'secret', ssn: '123-45-6789' };
 * const user2 = { id: 2, name: 'Bob', password: 'p@ssword', creditCard: '4111-1111-1111-1111' };
 *
 * const safeUser1 = removeSensitiveData(user1);
 * // { id: 1, name: 'Alice' }
 *
 * const safeUser2 = removeSensitiveData(user2);
 * // { id: 2, name: 'Bob' }
 * ```
 */
export function createOmitter<K extends string>(keys: K[]) {
  return <T extends Record<string, any>>(obj: T): Omit<T, K> => {
    if (!isObject(obj)) {
      return {} as Omit<T, K>;
    }

    const result = { ...obj };

    for (const key of keys) {
      if (key in result) {
        delete result[key as keyof typeof result];
      }
    }

    return result as Omit<T, K>;
  };
}

/**
 * Omits keys from an object based on a predicate function
 *
 * Creates a new object excluding properties for which the predicate returns true.
 * The predicate is called with each property's value, key, and the original object.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param predicate - Function to test each property
 * @returns A new object with filtered properties
 *
 * @example
 * ```ts
 * const data = { a: 1, b: null, c: 3, d: undefined, e: 5 };
 *
 * // Remove null and undefined values
 * const cleaned = omitBy(data, value => value == null);
 * // { a: 1, c: 3, e: 5 }
 * ```
 *
 * @example
 * ```ts
 * const user = { name: 'Alice', admin: true, lastLogin: Date.now() };
 *
 * // Remove boolean properties
 * const withoutBooleans = omitBy(user, value => typeof value === 'boolean');
 * // { name: 'Alice', lastLogin: 1636271340081 }
 * ```
 */
export function omitBy<T extends AnyObject>(
  obj: T,
  predicate: (value: any, key: string, obj: T) => boolean
): Partial<T> {
  if (!isObject(obj)) {
    return {} as Partial<T>;
  }

  const result: Partial<T> = {};

  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      !predicate(obj[key], key, obj)
    ) {
      result[key as keyof T] = obj[key];
    }
  }

  return result;
}

/**
 * Removes null and undefined values from an object
 *
 * Creates a new object excluding properties that have null or undefined values.
 * This is a common use case for cleaning up objects before serialization or API requests.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @returns A new object without null or undefined properties
 *
 * @example
 * ```ts
 * const data = {
 *   name: 'Alice',
 *   age: 30,
 *   address: null,
 *   phone: undefined,
 *   email: 'alice@example.com'
 * };
 *
 * const cleaned = omitNil(data);
 * // { name: 'Alice', age: 30, email: 'alice@example.com' }
 * ```
 */
export function omitNil<T extends AnyObject>(obj: T): Partial<T> {
  return omitBy(obj, (value) => value === null || value === undefined);
}

/**
 * Extracts a subset of properties from an object
 *
 * Creates a new object with only the specified keys.
 * This is the opposite of omit - instead of saying what to exclude, you specify what to include.
 *
 * @template T - The input object type
 * @template K - The keys to pick from the object
 * @param obj - The source object
 * @param keys - The keys to include in the result
 * @returns A new object with only the picked keys
 *
 * @example
 * ```ts
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' };
 *
 * const credentials = pick(user, ['name', 'email']);
 * // { name: 'Alice', email: 'alice@example.com' }
 * ```
 */
export function pick<T extends AnyObject, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  if (!isObject(obj)) {
    return {} as Pick<T, K>;
  }

  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Extracts properties from an object based on a predicate function
 *
 * Creates a new object with only the properties for which the predicate returns true.
 * The predicate is called with each property's value, key, and the original object.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param predicate - Function to test each property
 * @returns A new object with only the properties that pass the predicate
 *
 * @example
 * ```ts
 * const data = { a: 1, b: 2, c: 3, d: 4, e: 5 };
 *
 * // Keep only even numbers
 * const evens = pickBy(data, value => value % 2 === 0);
 * // { b: 2, d: 4 }
 * ```
 *
 * @example
 * ```ts
 * const user = { name: 'Alice', age: 30, admin: true, banned: false };
 *
 * // Keep only boolean properties
 * const flags = pickBy(user, value => typeof value === 'boolean');
 * // { admin: true, banned: false }
 * ```
 */
export function pickBy<T extends AnyObject>(
  obj: T,
  predicate: (value: any, key: string, obj: T) => boolean
): Partial<T> {
  if (!isObject(obj)) {
    return {} as Partial<T>;
  }

  const result: Partial<T> = {};

  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      predicate(obj[key], key, obj)
    ) {
      result[key as keyof T] = obj[key];
    }
  }

  return result;
}

/**
 * Omits properties from an object based on path selectors with optional transformation
 *
 * Creates a new object excluding properties at the specified path(s). Supports
 * advanced path selectors including property paths, array indices, wildcards, and filters.
 * Optionally accepts a transformation function for more granular control.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param paths - Path selector or array of path selectors to the properties to omit
 * @param transform - Optional function to control or transform properties
 * @returns A new object with properties omitted or transformed
 *
 * @example
 * ```ts
 * const user = {
 *   id: 1,
 *   name: 'Alice',
 *   profile: {
 *     email: 'alice@example.com',
 *     password: 'secret',
 *     settings: {
 *       theme: 'dark',
 *       notifications: true
 *     }
 *   }
 * };
 *
 * // Omit nested property
 * const safeUser = omitPath(user, 'profile.password');
 * // Result: user object without the password field
 *
 * // Omit multiple paths
 * const publicUser = omitPath(user, ['profile.password', 'profile.email']);
 * // Result: user object without password and email fields
 *
 * // Omit with wildcard
 * const data = {
 *   users: [
 *     { id: 1, name: 'Alice', password: 'secret1' },
 *     { id: 2, name: 'Bob', password: 'secret2' }
 *   ]
 * };
 * const safeData = omitPath(data, 'users[*].password');
 * // Result: data with password removed from all users
 *
 * // With transformation function
 * const transformedUser = omitPath(user, 'profile.email', (value, path) => {
 *   // Return true to omit the property
 *   // Return false to keep the property intact
 *   // Return a value to transform the property
 *   if (path === 'profile.email') {
 *     return value.split('@')[0] + '@example.org'; // Transform email
 *   }
 *   return false; // Keep other properties
 * });
 * ```
 */
export function omitPath<T>(
  obj: T,
  paths: string | string[],
  transform?: (value: any, path: string, obj: any) => any | boolean
): T {
  if (!isObject(obj)) {
    // return obj;
    return {} as T;
  }

  // Make a deep clone to avoid modifying original
  const result = JSON.parse(JSON.stringify(obj));
  const pathArray = Array.isArray(paths) ? paths : [paths];

  // Process each path
  for (let i = 0; i < pathArray.length; i++) {
    const path = pathArray[i];
    const nextPath = pathArray[i + 1];
    if (!path || path === '') continue;

    const segments = parseSelector(path);

    // Handle wildcards and complex paths
    if (path.includes('*') || path.includes('[') || segments.length > 1) {
      // Get all matching paths
      const value = get(result, path, { preserveStructure: true });

      if (value === undefined) {
        continue; // Path doesn't exist, continue to next path
      }

      // For each matching path, remove or transform the property
      const pathsToProcess: Array<{
        fullPath: string;
        segments: any[];
      }> = [];

      // Collect all paths to process
      function collectPaths(obj: any, currentPath: string = '') {
        if (!isObject(obj)) return;

        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            collectPaths(
              item,
              currentPath ? `${currentPath}[${index}]` : `[${index}]`
            );
          });
          return;
        }

        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const fullPath = currentPath ? `${currentPath}.${key}` : key;
            pathsToProcess.push({
              fullPath,
              segments: parseSelector(fullPath),
            });
            collectPaths(obj[key], fullPath);
          }
        }
      }

      collectPaths(value);

      // Process each path
      for (const { fullPath, segments: pathSegments } of pathsToProcess) {
        const pathSegmentsCopy = [...pathSegments];
        const lastSegment = pathSegmentsCopy.pop();

        if (!lastSegment) continue;

        const parentPath = pathSegmentsCopy
          .map((s) => {
            if (s.type === 'index') return `[${s.value}]`;
            return s.value;
          })
          .join('.')
          .replace(/\.\[/g, '[');

        const fg = get(result, parentPath.length > 0 ? parentPath : fullPath, {
          preserveStructure: true,
        });
        let parent = parentPath ? fg : result;

        // Check if parent exists and is an object
        if (!parent) {
          continue;
        }

        const propertyKey = String(lastSegment.value);
        const currentValue = parent[propertyKey];

        if (transform) {
          // Apply transform function if provided
          const transformResult = transform(currentValue, fullPath, result);

          if (transformResult === true) {
            // Remove property if transform returns true
            if (lastSegment.type === 'index' && Array.isArray(parent)) {
              const index = lastSegment.value as number;
              if (index >= 0 && index < parent.length) {
                parent.splice(index, 1);
              }
            } else {
              // delete parent[propertyKey];
              deletePath(result, pathArray[i]);
            }
          } else if (transformResult !== false) {
            // Update with transformed value if not false
            parent[propertyKey] = transformResult;
          }
          // If false, keep property as is
        } else {
          // Default behavior: remove property
          if (lastSegment.type === 'index' && Array.isArray(parent)) {
            const index = lastSegment.value as number;
            if (index >= 0 && index < parent.length) {
              parent.splice(index, 1);
            }
          } else {
            // delete parent[propertyKey];
            deletePath(result, pathArray[i]);
          }
        }
      }
    } else {
      // Simple case - direct property
      const key = path as keyof typeof result;
      if (typeof key === 'string' && key in result) {
        if (transform) {
          // Apply transform function if provided
          const transformResult = transform(result[key], path, result);

          if (transformResult === true) {
            // Remove property if transform returns true
            delete result[key];
          } else if (transformResult !== false) {
            // Update with transformed value if not false
            result[key] = transformResult;
          }
          // If false, keep property as is
        } else {
          // Default behavior: remove property
          // delete result[key];
          deletePath(result, pathArray[i]);
        }
      }
    }
  }

  return result;
}

/**
 * Picks properties from an object based on a path selector
 *
 * Creates a new object with only the properties at the specified path. Supports
 * advanced path selectors including property paths, array indices, wildcards, and filters.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param paths - Path selector or array of path selectors to the properties to pick
 * @param transform - Optional function to transform picked properties
 * @returns A new object with only the properties at the specified path
 *
 * @example
 * ```ts
 * const user = {
 *   id: 1,
 *   name: 'Alice',
 *   profile: {
 *     email: 'alice@example.com',
 *     settings: {
 *       theme: 'dark',
 *       notifications: true
 *     }
 *   },
 *   posts: [
 *     { id: 101, title: 'Hello', content: 'World' },
 *     { id: 102, title: 'Foo', content: 'Bar' }
 *   ]
 * };
 *
 * // Pick nested property
 * const userEmail = pickPath(user, 'profile.email');
 * // Result: { profile: { email: 'alice@example.com' } }
 *
 * // Pick multiple paths
 * const basicInfo = pickPath(user, ['id', 'name', 'profile.email']);
 * // Result: { id: 1, name: 'Alice', profile: { email: 'alice@example.com' } }
 *
 * // Pick with wildcard
 * const postTitles = pickPath(user, 'posts[*].title');
 * // Result: { posts: [{ title: 'Hello' }, { title: 'Foo' }] }
 *
 * // With transformation function
 * const transformed = pickPath(user, ['name', 'profile.email'], (value, path) => {
 *   if (path === 'name') {
 *     return value.toUpperCase();
 *   }
 *   if (path === 'profile.email') {
 *     return value.split('@')[0] + '@example.org';
 *   }
 *   return value;
 * });
 * ```
 */
export function pickPath<T>(
  obj: T,
  paths: string | string[],
  transform?: (value: any, path: string, parent: any) => any
): any {
  if (!isObject(obj)) {
    return {};
  }

  // Handle array of paths
  if (Array.isArray(paths)) {
    // Create a merged result from all paths
    const result: Record<string, any> = {};

    for (const path of paths) {
      const pathValue = get(obj, path as any, { preserveStructure: true });

      if (pathValue === undefined) {
        continue;
      }

      if (transform) {
        // Apply transformation to the leaf values
        const transformValue = (value: any, currentPath: string): any => {
          if (isObject(value)) {
            if (Array.isArray(value)) {
              return value.map((item, index) =>
                transformValue(item, `${currentPath}[${index}]`)
              );
            }

            const result: Record<string, any> = {};
            for (const key in value) {
              if (Object.prototype.hasOwnProperty.call(value, key)) {
                const nestedPath = currentPath ? `${currentPath}.${key}` : key;
                result[key] = transformValue(value[key], nestedPath);
              }
            }
            return result;
          }

          return transform(value, currentPath, obj);
        };

        const transformedValue = transformValue(pathValue, path);
        // Merge into the result
        deepMerge(result, transformedValue);
      } else {
        // Merge without transformation
        Object.assign(result, deepMerge(result, pathValue));
      }
    }

    return result;
  }

  // Single path processing
  const pathString = Array.isArray(paths) ? paths[0] : paths;
  const value = get(obj, pathString as any, { preserveStructure: true });

  if (value === undefined) {
    return {};
  }

  if (transform) {
    // Apply transformation to the leaf values
    const transformValue = (value: any, currentPath: string): any => {
      if (isObject(value)) {
        if (Array.isArray(value)) {
          return value.map((item, index) =>
            transformValue(item, `${currentPath}[${index}]`)
          );
        }

        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            const nestedPath = currentPath ? `${currentPath}.${key}` : key;
            result[key] = transformValue(value[key], nestedPath);
          }
        }
        return result;
      }

      return transform(value, currentPath, obj);
    };

    return transformValue(value, pathString);
  }

  return value;
}

/**
 * Deeply omits properties matching a predicate at all levels of an object
 *
 * Recursively traverses an object and omits properties for which the predicate returns true.
 * This applies at every level of the object, not just the top level.
 *
 * @template T - The input object type
 * @param obj - The source object
 * @param predicate - Function to test each property
 * @returns A new object with properties omitted at all levels
 *
 * @example
 * ```ts
 * const data = {
 *   id: 1,
 *   name: 'Alice',
 *   password: 'secret',
 *   profile: {
 *     email: 'alice@example.com',
 *     password: 'another-secret',
 *     settings: {
 *       token: 'abc123',
 *       theme: 'dark'
 *     }
 *   },
 *   posts: [
 *     { id: 101, private: true, content: 'Hello' },
 *     { id: 102, private: false, content: 'World' }
 *   ]
 * };
 *
 * // Omit all sensitive fields
 * const sanitized = deepOmitBy(data, (value, key) =>
 *   ['password', 'token', 'private'].includes(key)
 * );
 * // Result: Object with password, token and private fields removed at all levels
 * ```
 */
export function deepOmitBy<T>(
  obj: T,
  predicate: (value: any, key: string, parent: any) => boolean
): T {
  if (!isObject(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepOmitBy(item, predicate)) as unknown as T;
  }

  const result: Record<string, any> = {};

  for (const key in obj as Record<string, any>) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const value = (obj as Record<string, any>)[key];

    if (predicate(value, key, obj)) {
      continue; // Skip this property
    }

    // Recursively process object and array values
    if (isObject(value)) {
      result[key] = deepOmitBy(value, predicate);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => deepOmitBy(item, predicate));
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
