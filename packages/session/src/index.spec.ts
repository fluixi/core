// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession } from './index.js';

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
    expect(localStorage.getItem('fx_session_token')).toBe('tok-1');
  });

  it('seeds token + user from storage at creation', async () => {
    localStorage.setItem('fx_session_token', 'persisted');
    localStorage.setItem('fx_session_user', JSON.stringify({ id: 'u9', name: 'Grace' }));
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
    localStorage.setItem('fx_session_token', 'tok-h');
    const fetchUser = vi.fn(async () => ({ id: 'uh', name: 'Hyd' }));
    const session = createSession<User>(makeAdapter({ fetchUser }));

    await session.hydrate();

    expect(fetchUser).toHaveBeenCalledWith('tok-h');
    expect(session.user()).toEqual({ id: 'uh', name: 'Hyd' });
  });

  it('hydrate logs out when the stored token is invalid (fetchUser throws)', async () => {
    localStorage.setItem('fx_session_token', 'bad');
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
