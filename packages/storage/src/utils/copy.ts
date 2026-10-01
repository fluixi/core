import type { AsyncTypedStorage, StorageSchema, StorageSnapshot, TypedStorage } from '../core/types.js';

type CopyOptions = { keys?: string[]; overwrite?: boolean };

const isAsync = (storage: TypedStorage<any> | AsyncTypedStorage<any>): storage is AsyncTypedStorage<any> => 'encryption' in storage;

const pick = (snapshot: StorageSnapshot<any>, keys: string[] | undefined) => {
  const out = snapshot as Record<string, unknown>;
  if (keys) for (const key of Object.keys(out)) if (!keys.includes(key)) delete out[key];
  return out as StorageSnapshot<any>;
};

/**
 * Copies items from one storage to another, metadata included: moving data to a new adapter,
 * seeding a test, backing up a namespace. Existing keys in `to` are kept unless `overwrite`.
 * Returns how many items were written; a promise when either storage is asynchronous.
 *
 * Encrypted items are read decrypted and written encrypted again with `to`'s key, so `to` needs
 * encryption configured for them.
 */
export function copyStorage<S extends StorageSchema>(from: TypedStorage<S>, to: TypedStorage<S>, options?: CopyOptions): number;
export function copyStorage<S extends StorageSchema>(
  from: TypedStorage<S> | AsyncTypedStorage<S>,
  to: TypedStorage<S> | AsyncTypedStorage<S>,
  options?: CopyOptions,
): Promise<number>;
export function copyStorage<S extends StorageSchema>(
  from: TypedStorage<S> | AsyncTypedStorage<S>,
  to: TypedStorage<S> | AsyncTypedStorage<S>,
  options: CopyOptions = {},
): number | Promise<number> {
  const restore = { overwrite: options.overwrite };
  if (!isAsync(from) && !isAsync(to)) return (to as TypedStorage<S>).restore(pick((from as TypedStorage<S>).snapshot(), options.keys), restore);
  return (async () => to.restore(pick(await from.snapshot(), options.keys), restore))();
}
