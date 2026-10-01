import type { StorageSchema, TypedStorage } from '../core/types.js';

/**
 * Copies items from one storage to another, metadata included: moving data to a new adapter,
 * seeding a test, backing up a namespace. Existing keys in `to` are kept unless `overwrite`.
 * Returns how many items were written.
 */
export function copyStorage<S extends StorageSchema>(
  from: TypedStorage<S>,
  to: TypedStorage<S>,
  options: { keys?: string[]; overwrite?: boolean } = {},
): number {
  const snapshot = from.snapshot() as Record<string, unknown>;
  if (options.keys) for (const key of Object.keys(snapshot)) if (!options.keys.includes(key)) delete snapshot[key];
  return to.restore(snapshot as never, { overwrite: options.overwrite });
}
