// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, createFetchGuard } from './index.js';

// Values are stored in the @fluixi/storage envelope.
const put = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify({ v: 1, value, createdAt: 1 }));
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')?.value ?? null;

interface User {
  id: string;
  name: string;
}

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

function makeAdapter(over: Partial<Parameters<typeof createSession<User>>[0]> = {}) {
  return {
    login: vi.fn(async () => 'tok-1'),
    fetchUser: vi.fn(async () => ({ id: 'u1', name: 'Ada' })),
    logout: vi.fn(async () => {}),
    ...over,
  };
}

describe('createSession', () => {
  it('login stores the token, fetches + persists the user, fires onLogin', async () => {
    const onLogin = vi.fn();
    const session = createSession<User>({ ...makeAdapter(), onLogin });
    expect(session.isAuthenticated()).toBe(false);

    await session.login({ email: 'a@b.c', password: 'x' });

    expect(session.token()).toBe('tok-1');
    expect(session.user()).toEqual({ id: 'u1', name: 'Ada' });
    expect(session.isAuthenticated()).toBe(true);
    expect(onLogin).toHaveBeenCalledWith({ id: 'u1', name: 'Ada' });
    expect(stored('fx_session_token')).toBe('tok-1');
  });

  it('seeds token + user from storage at creation', async () => {
    put('fx_session_token', 'persisted');
    put('fx_session_user', { id: 'u9', name: 'Grace' });
    const session = createSession<User>(makeAdapter());
    expect(session.token()).toBe('persisted');
    expect(session.user()).toEqual({ id: 'u9', name: 'Grace' });
  });

  it('logout clears token, user, storage, and fires onLogout', async () => {
    const onLogout = vi.fn();
    const session = createSession<User>({ ...makeAdapter(), onLogout });
    await session.login({ email: 'a@b.c', password: 'x' });

    await session.logout();

    expect(session.token()).toBeNull();
    expect(session.user()).toBeNull();
    expect(localStorage.getItem('fx_session_token')).toBeNull();
    expect(onLogout).toHaveBeenCalled();
  });

  it('hydrate restores the user from a stored token', async () => {
    put('fx_session_token', 'tok-h');
    const fetchUser = vi.fn(async () => ({ id: 'uh', name: 'Hyd' }));
    const session = createSession<User>(makeAdapter({ fetchUser }));

    await session.hydrate();

    expect(fetchUser).toHaveBeenCalledWith('tok-h');
    expect(session.user()).toEqual({ id: 'uh', name: 'Hyd' });
  });

  it('hydrate logs out when the stored token is invalid (fetchUser throws)', async () => {
    put('fx_session_token', 'bad');
    const session = createSession<User>(
      makeAdapter({ fetchUser: vi.fn(async () => { throw new Error('401'); }) }),
    );
    await session.hydrate();
    expect(session.token()).toBeNull();
    expect(localStorage.getItem('fx_session_token')).toBeNull();
  });

  it('surfaces errors via error() + onError and rejects', async () => {
    const onError = vi.fn();
    const session = createSession<User>({
      ...makeAdapter({ login: vi.fn(async () => { throw new Error('bad creds'); }) }),
      onError,
    });
    await expect(session.login({ email: '', password: '' })).rejects.toThrow('bad creds');
    expect(session.error()).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'login');
    expect(session.isLoading()).toBe(false);
  });

  it('refresh exchanges the token and fires onRefresh', async () => {
    const onRefresh = vi.fn();
    const refresh = vi.fn(async () => ({ token: 'tok-2', expiresAt: Date.now() + 1_000_000 }));
    const session = createSession<User>({ ...makeAdapter(), refresh, onRefresh });
    await session.login({ email: 'a@b.c', password: 'x' });

    await session.refresh();

    expect(refresh).toHaveBeenCalledWith('tok-1');
    expect(session.token()).toBe('tok-2');
    expect(onRefresh).toHaveBeenCalledWith('tok-2');
  });

  it('auto-schedules a refresh before expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const refresh = vi.fn(async () => ({ token: 'tok-2', expiresAt: 200_000 }));
    const session = createSession<User>({
      ...makeAdapter({ login: vi.fn(async () => ({ token: 'tok-1', expiresAt: 100_000 })) }),
      refresh,
      refreshSkewMs: 10_000,
    });
    await session.login({ email: 'a@b.c', password: 'x' });
    // expiry 100_000, skew 10_000 → fires at ~90_000ms
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(90_001);
    expect(refresh).toHaveBeenCalledWith('tok-1');
  });
});

type Perms = { products: { view: boolean; edit: boolean } };

describe('createSession — access control', () => {
  const permissions: Record<string, Perms> = {
    admin: { products: { view: true, edit: true } },
    viewer: { products: { view: true, edit: false } },
  };

  it('derives role + permissions from the user, and can() checks them', async () => {
    const session = createSession<any, any, unknown, Perms>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({ id: 'u1', metadata: { role: 'viewer' } })),
      access: { getRole: (u) => u?.metadata?.role ?? null, permissions },
    });
    await session.login({ email: 'a@b.c', password: 'x' });

    expect(session.roles()).toEqual(['viewer']);
    expect(session.can((p) => p.products.view)).toBe(true);
    expect(session.can((p) => p.products.edit)).toBe(false);
  });

  it('no role / unauthenticated → guest permissions (or none)', () => {
    const session = createSession<any, any, unknown, Perms>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({})),
      access: { getRole: () => null, permissions, guest: { products: { view: false, edit: false } } },
    });
    expect(session.roles()).toEqual([]);
    expect(session.can((p) => p.products.view)).toBe(false);
  });

  it('derives permissions straight from a user field (resolver form, no matrix)', async () => {
    const session = createSession<any, any, unknown, Perms>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({ metadata: { access: 'admin' } })),
      access: {
        // no getRole, no matrix: compute the set from the user field directly
        permissions: (u) =>
          u?.metadata?.access === 'admin'
            ? { products: { view: true, edit: true } }
            : { products: { view: true, edit: false } },
      },
    });
    await session.login({ email: 'a@b.c', password: 'x' });
    expect(session.can((p) => p.products.edit)).toBe(true);
  });

  it('matcher can read a user field directly via its third arg', async () => {
    const session = createSession<any, any, unknown, Perms, string>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({ metadata: { access: 'admin' } })),
      access: {
        permissions: () => ({ products: { view: true, edit: false } }), // any non-null set
        match: (_p, q, user) => user?.metadata?.access === q,
      },
    });
    await session.login({ email: 'a@b.c', password: 'x' });
    expect(session.can('admin')).toBe(true);
    expect(session.can('viewer')).toBe(false);
  });

  it('supports a custom matcher for declarative `resource:action` queries', async () => {
    const grants: Record<string, Set<string>> = {
      admin: new Set(['products:view', 'products:edit']),
      viewer: new Set(['products:view']),
    };
    const session = createSession<any, any, unknown, Set<string>, string>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({ metadata: { role: 'viewer' } })),
      access: {
        getRole: (u) => u?.metadata?.role ?? null,
        permissions: grants,
        match: (set, q) => set.has(q),
      },
    });
    await session.login({ email: 'a@b.c', password: 'x' });
    expect(session.can('products:view')).toBe(true);
    expect(session.can('products:edit')).toBe(false);
  });

  it('merges permission sets for a multi-role user', async () => {
    const session = createSession<any, any, unknown, Perms>({
      login: vi.fn(async () => 'tok'),
      fetchUser: vi.fn(async () => ({ metadata: { roles: ['viewer', 'admin'] } })),
      access: {
        getRole: (u) => u?.metadata?.roles ?? null,
        permissions,
        merge: (sets) => ({ products: { view: sets.some((s) => s.products.view), edit: sets.some((s) => s.products.edit) } }),
      },
    });
    await session.login({ email: 'a@b.c', password: 'x' });
    expect(session.roles()).toEqual(['viewer', 'admin']);
    expect(session.can((p) => p.products.edit)).toBe(true); // admin grants edit
  });
});

describe('createSession — unauthorized guard + status', () => {
  it('createFetchGuard trips onUnauthorized once on a 401, until reset', async () => {
    const onUnauthorized = vi.fn();
    const base = vi.fn(async () => new Response(null, { status: 401 }));
    const guard = createFetchGuard({ fetch: base as any, onUnauthorized });

    await guard('https://api.test/admin/me');
    await guard('https://api.test/admin/me');
    expect(onUnauthorized).toHaveBeenCalledTimes(1); // de-duped

    guard.reset();
    await guard('https://api.test/admin/me');
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('shouldHandle narrows which 401s count', async () => {
    const onUnauthorized = vi.fn();
    const base = vi.fn(async () => new Response(null, { status: 401 }));
    const guard = createFetchGuard({
      fetch: base as any,
      onUnauthorized,
      shouldHandle: (url) => url.includes('/admin/') && !url.includes('/auth/'),
    });
    await guard('https://api.test/auth/login'); // ignored
    expect(onUnauthorized).not.toHaveBeenCalled();
    await guard('https://api.test/admin/me'); // counts
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('a server 401 expires the session (status → expired, logout)', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 })) as any;
    try {
      const onExpired = vi.fn();
      const session = createSession<User>({
        login: vi.fn(async () => 'tok-1'),
        fetchUser: vi.fn(async () => ({ id: 'u1', name: 'Ada' })),
        logout: vi.fn(async () => {}),
        unauthorized: { shouldHandle: (url) => url.includes('/admin/') },
        onExpired,
      });
      await session.login({ email: 'a@b.c', password: 'x' });
      expect(session.status()).toBe('authenticated');

      await session.guardedFetch!('https://api.test/admin/me');
      expect(onExpired).toHaveBeenCalledTimes(1);
      expect(session.expired()).toBe(true);
      expect(session.status()).toBe('expired');
      expect(session.token()).toBeNull(); // default onExpiry = logout
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('login clears a prior expired state', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 })) as any;
    try {
      const session = createSession<User>({
        login: vi.fn(async () => 'tok-1'),
        fetchUser: vi.fn(async () => ({ id: 'u1', name: 'Ada' })),
        unauthorized: { onExpiry: () => {} }, // don't auto-logout, just flag
      });
      await session.guardedFetch!('https://api.test/admin/me');
      expect(session.expired()).toBe(true);

      await session.login({ email: 'a@b.c', password: 'x' });
      expect(session.expired()).toBe(false);
      expect(session.status()).toBe('authenticated');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
