import type { StorageSerializer } from '../core/types.js';

/** A serializer from two functions. */
export function createSerializer(
  serialize: (value: unknown) => string,
  deserialize: <T = unknown>(text: string) => T,
): StorageSerializer {
  return { serialize, deserialize };
}
