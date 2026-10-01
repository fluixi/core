/**
 * Strict JSON. JSON.stringify drops a function, turns NaN into null and a Date into a string
 * that reads back as a string, all without a word. This refuses them instead, naming where:
 * convert first (a Date to its ISO string), and the value reads back as it was written.
 */
import { StorageSerializationError } from '../core/errors.js';
import type { StorageSerializer } from '../core/types.js';

function assertJson(value: unknown, path: string, seen: Set<object>): void {
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return;
    case 'number':
      if (!Number.isFinite(value)) throw new StorageSerializationError(`${path} is ${value}, which JSON cannot hold.`);
      return;
    case 'object':
      break;
    default:
      throw new StorageSerializationError(`${path} is a ${typeof value}, which JSON cannot hold.`);
  }
  if (value === null) return;
  if (seen.has(value)) throw new StorageSerializationError(`${path} refers back to itself.`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertJson(item, `${path}[${i}]`, seen));
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      const name = (value as object).constructor?.name ?? 'an object with a prototype';
      throw new StorageSerializationError(`${path} is ${name}, which does not survive JSON. Convert it to plain data first.`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) throw new StorageSerializationError(`${path}.${key} is undefined, which JSON drops. Omit the key or use null.`);
      assertJson(item, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

export const jsonSerializer: StorageSerializer = {
  serialize(value) {
    assertJson(value, 'value', new Set());
    return JSON.stringify(value);
  },
  deserialize<T>(text: string): T {
    return JSON.parse(text) as T;
  },
};
