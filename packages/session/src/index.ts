/**
 * @fluixi/session: the client session lifecycle + access control as reusable primitives.
 *
 * You provide a small backend ADAPTER (login / fetchUser / logout / optional refresh);
 * the framework owns token + user signals, a status state-machine, persistence (through
 * `@fluixi/storage`, nothing kept on the server), the hydrate-on-load flow, automatic refresh
 * before expiry, role/permission derivation, and an unauthorized (session-expiry) guard.
 * Apps stop rewriting the same ~150 lines of session glue. (The server-first auth engine , 
 * OAuth / MFA / orgs / cookies: is @fluixi/auth.)
 *
 * ── SECURITY BOUNDARY ─────────────────────────────────────────────────────────
 * `roles()`, `permissions()` and `can()` are a CLIENT-SIDE UI affordance: they decide what
 * to RENDER, never what is ALLOWED. A client can forge any role, so authorization MUST be
 * enforced by the backend on every request. Read `can(...)` as "should I show this button",
 * and let the server reject unauthorized calls regardless. The `unauthorized` guard below
 * exists precisely because the server: not the client, is the authority.
 */
import { createSignal, createMemo, type Accessor } from '@fluixi/reactive/signal';
import { isClient } from '@fluixi/core';
import { createSyncStorage, type TypedStorage } from '@fluixi/storage';
import { localStorageAdapter } from '@fluixi/storage/browser';

/** A token plus, optionally, its expiry as an epoch-ms timestamp. */
export interface TokenResult {
  token: string;
  expiresAt?: number;
}

/** The backend-specific bits you must (or may) provide. */
export interface SessionAdapter<U, C, R = unknown> {
  /** Authenticate credentials → a raw token string or a {token, expiresAt}. */
  login: (creds: C) => Promise<string | TokenResult>;
  /** Fetch the current user given the active token. */
  fetchUser: (token: string) => Promise<U>;
  /** Invalidate the session on the backend (optional). */
  logout?: () => Promise<void> | void;
  /** Register an account (optional). Return a token to auto-login, or void. */
  register?: (data: R) => Promise<string | TokenResult | void>;
  /** Exchange the current token for a fresh one (optional → enables auto-refresh). */
  refresh?: (token: string) => Promise<string | TokenResult>;
  /** Derive expiry (epoch ms) from a token, e.g. decode a JWT `exp` (optional). */
  getExpiry?: (token: string) => number | null;
}

// Access control (client-side RBAC)

export type Role = string;

/**
 * Declarative role → permission mapping. `P` is YOUR permission shape, a nested capability
 * object, a flat `Set`, a Better-Auth-style `{ resource: action[] }` statement, whatever you
 * check against. `Q` is the QUERY you pass to `can()`, by default a predicate `(p) => bool`,
 * but supply a `match` to use a declarative query instead (a `'resource:action'` string, an
 * object, a CASL ability, ...). The framework derives the active role(s), hands you the matching
 * permission set, and runs your matcher; it does not prescribe either shape.
 */
export interface AccessControl<U, P, Q = (p: P) => boolean> {
  /**
   * Derive the user's role(s) from ANY user field, `u => u?.metadata?.access` returns
   * whatever word lives there. Return one role, several, or null. Optional: omit it when
   * `permissions` is a resolver that reads the user directly.
   */
  getRole?: (user: U | null) => Role | Role[] | null | undefined;
  /**
   * Either a static role → permission map, OR a resolver that derives the permission set
   * straight from the user (when access isn't a fixed matrix, e.g. computed from user
   * flags / fields). The resolver also receives the derived roles.
   */
  permissions: Record<Role, P> | ((user: U | null, roles: Role[]) => P | undefined);
  /** Permissions for an unauthenticated / unknown-role user (default: undefined). */
  guest?: P;
  /** Combine permission sets when a user has multiple roles (default: last role wins). */
  merge?: (sets: P[]) => P;
  /**
   * Interpret a `can(query)` call. Default: the query IS a predicate, run as
   * `query(permissions)`. Override for declarative queries, `match: (perms, q: string) =>
   * perms.has(q)` → `can('products:edit')`. The `user` is passed too, so a check can read a
   * user field directly: `match: (_p, q, user) => user?.metadata?.access === q`.
   */
  match?: (permissions: P, query: Q, user: U | null) => boolean;
}

// Unauthorized guard (session expiry)

export interface FetchGuardOptions {
  /** The fetch to wrap (default: the global fetch). */
  fetch?: typeof fetch;
  /** Status that signals an expired/invalid session (default 401). */
  status?: number;
  /** Narrow which responses count as expiry: e.g. your API origin, minus the login route. */
  shouldHandle?: (url: string, response: Response) => boolean;
  /** Fired at most once until `reset()`: so one expired session isn't reported N times. */
  onUnauthorized: () => void;
}

export type GuardedFetch = typeof fetch & { reset: () => void };

const requestUrl = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);

/**
 * Wrap a fetch so a chosen status (401) trips `onUnauthorized` once. Returns a NEW fetch , 
 * pass it to your SDK / data layer. Nothing global is mutated: this is the standards-clean
 * way to react to an expired session. (For SDKs that only ever call the global `fetch`,
 * `installGlobalFetchGuard` is the explicit escape hatch.)
 */
export function createFetchGuard(opts: FetchGuardOptions): GuardedFetch {
  const base = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const status = opts.status ?? 401;
  let tripped = false;
  const guarded = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await base(input as any, init);
    if (res.status === status && !tripped) {
      if (!opts.shouldHandle || opts.shouldHandle(requestUrl(input), res)) {
        tripped = true;
        opts.onUnauthorized();
      }
    }
    return res;
  }) as GuardedFetch;
  guarded.reset = () => {
    tripped = false;
  };
  return guarded;
}

/**
 * Replace the GLOBAL `fetch` with a guarded one. A deliberate global side effect, use it
 * only when your SDK gives you no way to inject a custom fetch (e.g. Medusa's JS SDK).
 * No-op on the server. Returns an uninstaller that restores the original fetch.
 */
export function installGlobalFetchGuard(opts: FetchGuardOptions): () => void {
  if (!isClient) return () => {};
  const original = globalThis.fetch.bind(globalThis);
  const guarded = createFetchGuard({ ...opts, fetch: original });
  (globalThis as any).fetch = guarded;
  (installGlobalFetchGuard as any)._reset = guarded.reset;
  return () => {
    (globalThis as any).fetch = original;
  };
}

// Session

export type SessionOp = 'login' | 'register' | 'hydrate' | 'refresh';

/** The lifecycle state. Derived; read it instead of juggling isLoading + flags by hand. */
export type SessionStatus =
  | 'idle' // no token, not busy
  | 'authenticating' // a login/register/hydrate/refresh is in flight
  | 'authenticated' // a token is held
  | 'expired' // the unauthorized guard tripped (token rejected by the server)
  | 'error'; // the last op threw

export interface UnauthorizedOptions {
  /** Status that means "session expired" (default 401). */
  status?: number;
  /** Narrow which responses count: e.g. only your API, excluding the login endpoint. */
  shouldHandle?: (url: string, response: Response) => boolean;
  /**
   * Patch the GLOBAL fetch. Needed when your data layer always uses the global `fetch`
   * (Medusa's SDK). Default false: prefer wiring `session.guardedFetch` into your SDK.
   */
  installGlobal?: boolean;
  /** What to do when the session expires (default: mark expired + logout). */
  onExpiry?: () => void;
}

export interface SessionOptions<U, C, R = unknown, P = unknown, Q = (p: P) => boolean>
  extends SessionAdapter<U, C, R> {
  /**
   * Where the token, user and expiry are kept. Defaults to localStorage in the browser and to
   * nothing on the server, where one session object would otherwise be shared by every
   * request. `null` keeps them in memory only.
   */
  storage?: TypedStorage<any> | null;
  /** Keys in that storage (defaults: `fx_session_token` / `fx_session_user` / `fx_session_exp`). */
  storageKeys?: { token?: string; user?: string; expiry?: string };
  /** Refresh this many ms BEFORE expiry (default 60_000). */
  refreshSkewMs?: number;
  /** Client-side RBAC: see the security note at the top of this file. */
  access?: AccessControl<U, P, Q>;
  /** React to server "session expired" (401) responses. */
  unauthorized?: UnauthorizedOptions;
  onLogin?: (user: U) => void;
  onLogout?: () => void;
  onRefresh?: (token: string) => void;
  onExpired?: () => void;
  onError?: (err: unknown, op: SessionOp) => void;
}

export interface Session<U, C, R = unknown, P = unknown, Q = (p: P) => boolean> {
  user: Accessor<U | null>;
  token: Accessor<string | null>;
  isAuthenticated: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  error: Accessor<unknown | null>;
  /** Lifecycle state-machine value. */
  status: Accessor<SessionStatus>;
  /** True once the server rejected the token (401 via the unauthorized guard). */
  expired: Accessor<boolean>;
  /** The active user's role(s) (empty when unauthenticated / no `access`). */
  roles: Accessor<Role[]>;
  /** The active permission set (UI affordance only, see the security note). */
  permissions: Accessor<P | undefined>;
  /** Check the active permission set with your matcher (default: a predicate). `false` when there is none. */
  can: (query: Q) => boolean;
  login: (creds: C) => Promise<void>;
  register: (data: R) => Promise<void>;
  logout: () => Promise<void>;
  /** Restore a session from the stored token (call once on client load). */
  hydrate: () => Promise<void>;
  /**
   * Take on a session established elsewhere: a cookie the server set, a token another tab
   * obtained. Holds the token, fetches the user unless given one, and schedules the refresh.
   * Not a sign-in, so `onLogin` does not run.
   */
  adopt: (result: string | TokenResult, user?: U) => Promise<void>;
  /** Force a token refresh now (no-op without a `refresh` adapter). */
  refresh: () => Promise<void>;
  /** Update the cached user (e.g. after a profile edit). */
  updateUser: (user: U) => void;
  /** A 401-guarded fetch (present when `unauthorized` is configured) for SDKs that accept one. */
  guardedFetch?: GuardedFetch;
}

const normalize = (r: string | TokenResult): TokenResult =>
  typeof r === 'string' ? { token: r } : r;

export function createSession<
  U,
  C = { email: string; password: string },
  R = unknown,
  P = unknown,
  Q = (p: P) => boolean,
>(options: SessionOptions<U, C, R, P, Q>): Session<U, C, R, P, Q> {
  const TOKEN_KEY = options.storageKeys?.token ?? 'fx_session_token';
  const USER_KEY = options.storageKeys?.user ?? 'fx_session_user';
  const EXP_KEY = options.storageKeys?.expiry ?? 'fx_session_exp';
  const skew = options.refreshSkewMs ?? 60_000;
  const access = options.access;

  const store = options.storage === undefined ? (isClient() ? createSyncStorage({ adapter: localStorageAdapter() }) : null) : options.storage;
  // Persistence is best effort: an unreadable or blocked entry reads as absent, a failed write is dropped.
  const read = <T>(key: string): T | null => {
    try {
      return (store?.get(key) as T | null | undefined) ?? null;
    } catch {
      return null;
    }
  };
  const write = (key: string, value: unknown): void => {
    try {
      store?.set(key, value);
    } catch {
      /* quota, private mode */
    }
  };
  const drop = (key: string): void => {
    try {
      store?.remove(key);
    } catch {
      /* blocked storage */
    }
  };
  const readUser = (): U | null => read<U>(USER_KEY);

  const [user, setUser] = createSignal<U | null>(readUser(), { name: 'user' });
  const [token, setTokenSig] = createSignal<string | null>(read<string>(TOKEN_KEY), { name: 'token' });
  const [isLoading, setLoading] = createSignal(false, { name: 'isLoading' });
  const [error, setError] = createSignal<unknown | null>(null, { name: 'error' });
  const [expired, setExpired] = createSignal(false, { name: 'expired' });

  // ── Derived access control ──────────────────────────────────────────────────
  const roles = createMemo<Role[]>(() => {
    const r = access?.getRole?.(user());
    if (r == null) return [];
    return Array.isArray(r) ? r : [r];
  }, undefined, { name: 'roles' });
  const permissions = createMemo<P | undefined>(() => {
    if (!access) return undefined;
    const rs = roles();
    // Resolver form: derive the set straight from the user (no fixed matrix).
    if (typeof access.permissions === 'function') return access.permissions(user(), rs) ?? access.guest;
    // Record form: look the role(s) up in the matrix, merging when there are several.
    const map = access.permissions;
    const sets = rs.map((r) => map[r]).filter((s): s is P => s != null);
    if (sets.length === 0) return access.guest;
    if (sets.length === 1) return sets[0];
    return access.merge ? access.merge(sets) : sets[sets.length - 1];
  }, undefined, { name: 'permissions' });
  // Default matcher: the query IS a predicate. A custom `match` swaps in declarative queries.
  const matcher =
    access?.match ??
    ((p: P, q: Q): boolean => (typeof q === 'function' ? (q as (p: P) => boolean)(p) : false));
  const can = (query: Q): boolean => {
    const p = permissions();
    return p != null ? matcher(p, query, user()) : false;
  };

  const status = createMemo<SessionStatus>(() => {
    if (isLoading()) return 'authenticating';
    if (expired()) return 'expired';
    if (error()) return 'error';
    return token() ? 'authenticated' : 'idle';
  }, undefined, { name: 'status' });

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  // Schedule an automatic refresh `skew` ms before the token expires. Client-only , 
  // never run timers during SSR. No-op without a `refresh` adapter or a known expiry.
  const scheduleRefresh = (expiresAt?: number): void => {
    clearTimer();
    if (!isClient || !options.refresh || !expiresAt) return;
    const delay = expiresAt - Date.now() - skew;
    refreshTimer = setTimeout(() => void doRefresh(), Math.max(0, delay));
  };

  const persistToken = (t: TokenResult): void => {
    setTokenSig(t.token);
    write(TOKEN_KEY, t.token);
    const expiresAt = t.expiresAt ?? options.getExpiry?.(t.token) ?? undefined;
    if (expiresAt) write(EXP_KEY, expiresAt);
    else drop(EXP_KEY);
    scheduleRefresh(expiresAt);
  };

  const persistUser = (u: U): void => {
    setUser(() => u);
    write(USER_KEY, u);
  };

  const run = async <T>(op: SessionOp, fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      options.onError?.(err, op);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  async function doRefresh(): Promise<void> {
    const current = token();
    if (!options.refresh || !current) return;
    await run('refresh', async () => {
      const next = normalize(await options.refresh!(current));
      persistToken(next);
      options.onRefresh?.(next.token);
    });
  }

  // ── Unauthorized guard wiring ────────────────────────────────────────────────
  let guard: GuardedFetch | undefined;
  if (options.unauthorized) {
    const onExpiry =
      options.unauthorized.onExpiry ??
      (() => {
        void session.logout();
      });
    const handler = (): void => {
      setExpired(true);
      options.onExpired?.();
      onExpiry();
    };
    guard = createFetchGuard({
      status: options.unauthorized.status,
      shouldHandle: options.unauthorized.shouldHandle,
      onUnauthorized: handler,
    });
    if (options.unauthorized.installGlobal) {
      installGlobalFetchGuard({
        status: options.unauthorized.status,
        shouldHandle: options.unauthorized.shouldHandle,
        onUnauthorized: handler,
      });
    }
  }

  const session: Session<U, C, R, P, Q> = {
    user,
    token,
    isAuthenticated: () => token() !== null,
    isLoading,
    error,
    status,
    expired,
    roles,
    permissions,
    can,
    guardedFetch: guard,

    async login(creds: C): Promise<void> {
      await run('login', async () => {
        persistToken(normalize(await options.login(creds)));
        const u = await options.fetchUser(token()!);
        persistUser(u);
        setExpired(false);
        guard?.reset();
        options.onLogin?.(u);
      });
    },

    async register(data: R): Promise<void> {
      await run('register', async () => {
        const res = await options.register?.(data);
        if (res) {
          persistToken(normalize(res));
          const u = await options.fetchUser(token()!);
          persistUser(u);
          setExpired(false);
          guard?.reset();
          options.onLogin?.(u);
        }
      });
    },

    async logout(): Promise<void> {
      try {
        await options.logout?.();
      } catch {
        /* best-effort backend logout */
      }
      clearTimer();
      drop(TOKEN_KEY);
      drop(USER_KEY);
      drop(EXP_KEY);
      setTokenSig(null);
      setUser(null);
      guard?.reset();
      options.onLogout?.();
    },

    async hydrate(): Promise<void> {
      const stored = read<string>(TOKEN_KEY);
      if (!stored) return;
      if (!token()) setTokenSig(stored);
      scheduleRefresh(read<number>(EXP_KEY) ?? options.getExpiry?.(stored) ?? undefined);
      if (user()) return;
      try {
        persistUser(await run('hydrate', () => options.fetchUser(stored)));
      } catch {
        await session.logout(); // token invalid/expired → clear
      }
    },

    async adopt(result: string | TokenResult, known?: U): Promise<void> {
      await run('hydrate', async () => {
        persistToken(normalize(result));
        persistUser(known ?? (await options.fetchUser(token()!)));
        setExpired(false);
        guard?.reset();
      });
    },

    refresh: doRefresh,

    updateUser(u: U): void {
      persistUser(u);
    },
  };

  return session;
}
