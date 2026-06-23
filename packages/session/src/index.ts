/**
 * @fluixi/session — `createSession`: the client-side session lifecycle as a reusable
 * primitive. (The full server-first auth engine — OAuth/MFA/orgs/RBAC — is @fluixi/auth.)
 *
 * You provide a small backend ADAPTER (how to log in, fetch the user, log out, and —
 * optionally — refresh a token); the framework owns everything else: token/user
 * signals, `isAuthenticated`, loading/error state, persistence (via @fluixi/core's
 * universal `storage`, so it's SSR-safe), the hydrate-on-load flow, and automatic
 * token refresh before expiry. Apps stop rewriting the same ~100 lines of session glue.
 */
import { createSignal, type Accessor } from '@fluixi/reactive/signal';
import { storage, isClient } from '@fluixi/core';

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

export type SessionOp = 'login' | 'register' | 'hydrate' | 'refresh';

export interface SessionOptions<U, C, R = unknown> extends SessionAdapter<U, C, R> {
  /** localStorage keys (defaults: `fx_session_token` / `fx_session_user`). */
  storageKeys?: { token?: string; user?: string; expiry?: string };
  /** Refresh this many ms BEFORE expiry (default 60_000). */
  refreshSkewMs?: number;
  onLogin?: (user: U) => void;
  onLogout?: () => void;
  onRefresh?: (token: string) => void;
  onError?: (err: unknown, op: SessionOp) => void;
}

export interface Session<U, C, R = unknown> {
  user: Accessor<U | null>;
  token: Accessor<string | null>;
  isAuthenticated: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  error: Accessor<unknown | null>;
  login: (creds: C) => Promise<void>;
  register: (data: R) => Promise<void>;
  logout: () => Promise<void>;
  /** Restore a session from the stored token (call once on client load). */
  hydrate: () => Promise<void>;
  /** Force a token refresh now (no-op without a `refresh` adapter). */
  refresh: () => Promise<void>;
  /** Update the cached user (e.g. after a profile edit). */
  updateUser: (user: U) => void;
}

const normalize = (r: string | TokenResult): TokenResult =>
  typeof r === 'string' ? { token: r } : r;

export function createSession<U, C = { email: string; password: string }, R = unknown>(
  options: SessionOptions<U, C, R>,
): Session<U, C, R> {
  const TOKEN_KEY = options.storageKeys?.token ?? 'fx_session_token';
  const USER_KEY = options.storageKeys?.user ?? 'fx_session_user';
  const EXP_KEY = options.storageKeys?.expiry ?? 'fx_session_exp';
  const skew = options.refreshSkewMs ?? 60_000;

  const readUser = (): U | null => {
    try {
      return JSON.parse(storage.getItem(USER_KEY) ?? 'null') as U | null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = createSignal<U | null>(readUser());
  const [token, setTokenSig] = createSignal<string | null>(storage.getItem(TOKEN_KEY));
  const [isLoading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<unknown | null>(null);

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  // Schedule an automatic refresh `skew` ms before the token expires. Client-only —
  // never run timers during SSR. No-op without a `refresh` adapter or a known expiry.
  const scheduleRefresh = (expiresAt?: number): void => {
    clearTimer();
    if (!isClient || !options.refresh || !expiresAt) return;
    const delay = expiresAt - Date.now() - skew;
    refreshTimer = setTimeout(() => void doRefresh(), Math.max(0, delay));
  };

  const persistToken = (t: TokenResult): void => {
    setTokenSig(t.token);
    storage.setItem(TOKEN_KEY, t.token);
    const expiresAt = t.expiresAt ?? options.getExpiry?.(t.token) ?? undefined;
    if (expiresAt) storage.setItem(EXP_KEY, String(expiresAt));
    else storage.removeItem(EXP_KEY);
    scheduleRefresh(expiresAt);
  };

  const persistUser = (u: U): void => {
    setUser(() => u);
    storage.setItem(USER_KEY, JSON.stringify(u));
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

  const session: Session<U, C, R> = {
    user,
    token,
    isAuthenticated: () => token() !== null,
    isLoading,
    error,

    async login(creds: C): Promise<void> {
      await run('login', async () => {
        persistToken(normalize(await options.login(creds)));
        const u = await options.fetchUser(token()!);
        persistUser(u);
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
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
      storage.removeItem(EXP_KEY);
      setTokenSig(null);
      setUser(null);
      options.onLogout?.();
    },

    async hydrate(): Promise<void> {
      const stored = storage.getItem(TOKEN_KEY);
      if (!stored) return;
      if (!token()) setTokenSig(stored);
      const expStr = storage.getItem(EXP_KEY);
      scheduleRefresh(expStr ? Number(expStr) : options.getExpiry?.(stored) ?? undefined);
      if (user()) return;
      try {
        persistUser(await run('hydrate', () => options.fetchUser(stored)));
      } catch {
        await session.logout(); // token invalid/expired → clear
      }
    },

    refresh: doRefresh,

    updateUser(u: U): void {
      persistUser(u);
    },
  };

  return session;
}
