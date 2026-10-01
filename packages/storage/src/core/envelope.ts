/** The stored form and the pieces the sync and async storages share. */
import type { EncryptedPayload } from '../encryption/seal.js';
import { StorageDeserializationError, StorageError, StorageSerializationError } from './errors.js';
import type { StorageEntry, StorageQuery, StorageSchema, StorageSerializer, StoredItem } from './types.js';

/**
 * `v` is the envelope format, so a later format can read this one. A plaintext entry has
 * `value`; an encrypted one has `enc` instead, with the value serialized inside it.
 */
export interface Envelope {
  v: 1;
  value?: unknown;
  enc?: EncryptedPayload;
  createdAt: number;
  expiresAt?: number;
  version?: number;
}

export type Migrations = Record<string, Record<number, (value: unknown) => unknown> | undefined>;

function isEnvelope(x: unknown): x is Envelope {
  return !!x && typeof x === 'object' && (x as Envelope).v === 1 && ('value' in x || 'enc' in x) && typeof (x as Envelope).createdAt === 'number';
}

export function serializeOrThrow(serializer: StorageSerializer, key: string, value: unknown): string {
  try {
    return serializer.serialize(value);
  } catch (error) {
    if (error instanceof StorageError) throw Object.assign(error, { key });
    throw new StorageSerializationError(`The value of ${key} could not be serialized.`, { key, cause: error });
  }
}

export function deserializeOrThrow(serializer: StorageSerializer, key: string, text: string): unknown {
  try {
    return serializer.deserialize(text);
  } catch (error) {
    throw new StorageDeserializationError(`The stored value of ${key} could not be read.`, { key, cause: error });
  }
}

export function decodeEnvelope(serializer: StorageSerializer, key: string, text: string): Envelope {
  const parsed = deserializeOrThrow(serializer, key, text);
  // Written by something else, without metadata: the value as it is.
  return isEnvelope(parsed) ? parsed : { v: 1, value: parsed, createdAt: 0 };
}

export const isExpired = (envelope: Envelope, now: number) => envelope.expiresAt !== undefined && envelope.expiresAt <= now;

/** The newest version a key's migrations reach, or undefined without migrations. */
export function latestVersion(steps: Record<number, unknown> | undefined): number | undefined {
  if (!steps) return undefined;
  const versions = Object.keys(steps).map(Number).filter(Number.isFinite);
  return versions.length ? Math.max(...versions) : undefined;
}

/** The value brought up to the latest version, or undefined when it is already there. */
export function migrate(steps: Record<number, (value: unknown) => unknown> | undefined, from: number | undefined, value: unknown) {
  const latest = latestVersion(steps);
  if (!steps || latest === undefined || (from ?? 0) >= latest) return undefined;
  for (const version of Object.keys(steps).map(Number).sort((a, b) => a - b)) {
    if (version > (from ?? 0)) value = steps[version]!(value);
  }
  return { value, version: latest };
}

/** Envelope metadata for a new write. */
export function metaFor(createdAt: number, ttl: number | undefined, version: number | undefined) {
  const meta: { createdAt: number; expiresAt?: number; version?: number } = { createdAt };
  if (ttl !== undefined) meta.expiresAt = createdAt + ttl;
  if (version !== undefined) meta.version = version;
  return meta;
}

export function toEntry(envelope: Envelope, value: unknown): StorageEntry<unknown> {
  const entry: StorageEntry<unknown> = { value, createdAt: envelope.createdAt };
  if (envelope.expiresAt !== undefined) entry.expiresAt = envelope.expiresAt;
  if (envelope.version !== undefined) entry.version = envelope.version;
  if (envelope.enc) entry.encrypted = true;
  return entry;
}

/** `draft:*` style: `*` any run, `?` one character, everything else literal. */
export const globToRegExp = (glob: string) =>
  new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

export function selectItems<S extends StorageSchema>(items: StoredItem<S>[], query: StorageQuery<S>): StoredItem<S>[] {
  const pattern = typeof query.match === 'string' ? globToRegExp(query.match) : query.match;
  const out: StoredItem<S>[] = [];
  for (const item of items) {
    if (query.prefix !== undefined && !item.key.startsWith(query.prefix)) continue;
    if (pattern && !pattern.test(item.key)) continue;
    if (query.where && !query.where(item)) continue;
    out.push(item);
    if (query.limit !== undefined && out.length >= query.limit) break;
  }
  return out;
}
