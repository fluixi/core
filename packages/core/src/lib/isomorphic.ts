/**
 * Isomorphic request state — the generic form of "ensureInit + transfer".
 *
 * A value that is resolved ONCE on the server (per request, before the app renders),
 * serialized into the page, and seeded SYNCHRONOUSLY on the client so the first client
 * render matches the server (no hydration mismatch) and nothing refetches.
 *
 * - Server: @fluixi/server's `preloadServerState(event)` walks the registry below,
 *   runs each `server(event)` resolver, sets the signal, and stashes the value for
 *   serialization (it lands in `window.__FX_DATA__['__iso:<key>']`).
 * - Client: `createIsomorphicState` reads that seed at creation and starts there.
 *
 * This module is client-safe (no node imports) so app stores can call it on both sides.
 * It talks to @fluixi/server only through a `globalThis` registry — no import edge.
 *
 * NOTE (prototype): the signal is module-scoped, so concurrent SSR requests share it.
 * That is fine for a single default value; per-user, per-request isolation wants the
 * request-scoped (AsyncLocalStorage) store — a follow-up.
 */
import { createSignal, type Accessor } from '@fluixi/reactive/signal';

const REGISTRY_KEY = '__fluixi_iso_states__';
const SEED_PREFIX = '__iso:';

interface IsoEntry {
  server: (event: any) => any;
  set: (v: any) => void;
}

function registry(): Map<string, IsoEntry> {
  return ((globalThis as any)[REGISTRY_KEY] ??= new Map<string, IsoEntry>());
}

export interface IsomorphicState<T> {
  /** Reactive accessor for the current value (a real signal — safe in JSX/control flow). */
  value: Accessor<T | undefined>;
  /** Update the value (client-side preference changes, optimistic updates). */
  set: (v: T | undefined) => void;
  /** Stable serialization key. */
  key: string;
}

export interface IsomorphicOptions<T> {
  /** Resolve the value on the server for THIS request (receives the RequestEvent). */
  server: (event: any) => T | Promise<T>;
  /** Optional client-only initial value when there is no server seed (pure SPA load). */
  client?: () => T | undefined;
  /** Value before resolution. */
  fallback?: T;
}

/** The server seed for `key`, if the page was server-rendered. */
function readSeed<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  const data = (window as any).__FX_DATA__;
  return data ? (data[SEED_PREFIX + key] as T | undefined) : undefined;
}

export function createIsomorphicState<T>(
  key: string,
  options: IsomorphicOptions<T>,
): IsomorphicState<T> {
  const seed = readSeed<T>(key);
  const initial =
    seed !== undefined
      ? seed
      : typeof window !== 'undefined' && options.client
        ? options.client()
        : options.fallback;

  const [value, set] = createSignal<T | undefined>(initial);
  registry().set(key, { server: options.server, set: set as (v: any) => void });

  return { value, set: set as (v: T | undefined) => void, key };
}
