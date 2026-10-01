/**
 * Change notification shared by every storage over one adapter. `useStorage()` builds a new
 * storage per call, so without this a write through one never reached a listener on another.
 * It also holds the adapter's own `subscribe` (another tab) once per adapter, for as long as
 * anything listens, where each storage used to add one and never remove it.
 */
import type { AdapterChange, AsyncStorageAdapter, StorageAdapter, StorageEventType } from './types.js';

export interface BusSubscriber {
  /** The storage's key prefix; it hears keys under it, and clears of it or a parent. */
  prefix: string;
  /** A write made in this process, by any storage over the adapter. `key` is the full key. */
  local(type: StorageEventType, key: string | null, value: unknown): void;
  /** A write the adapter saw from elsewhere. */
  external(change: AdapterChange): void;
}

interface Bus {
  subscribers: Set<BusSubscriber>;
  stop?: () => void;
}

const buses = new WeakMap<object, Bus>();

export function joinBus(adapter: StorageAdapter | AsyncStorageAdapter, subscriber: BusSubscriber): () => void {
  let bus = buses.get(adapter);
  if (!bus) buses.set(adapter, (bus = { subscribers: new Set() }));
  const current = bus;
  current.subscribers.add(subscriber);
  if (current.subscribers.size === 1 && adapter.subscribe) {
    current.stop = adapter.subscribe((change) => {
      for (const s of [...current.subscribers]) s.external(change);
    });
  }
  return () => {
    current.subscribers.delete(subscriber);
    if (current.subscribers.size === 0) {
      current.stop?.();
      current.stop = undefined;
    }
  };
}

/** `key` is the full adapter key, or null for a clear of `prefix`. */
export function publish(
  adapter: StorageAdapter | AsyncStorageAdapter,
  type: StorageEventType,
  key: string | null,
  prefix: string,
  value?: unknown,
): void {
  const bus = buses.get(adapter);
  if (!bus) return;
  for (const s of [...bus.subscribers]) {
    if (key === null ? s.prefix.startsWith(prefix) : key.startsWith(s.prefix)) s.local(type, key, value);
  }
}
