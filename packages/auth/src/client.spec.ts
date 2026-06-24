// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthHooks } from './client.js';

function mockClient(user: unknown = null) {
  return {
    getSession: vi.fn(async () => ({ data: user ? { user, session: { id: 's' } } : null })),
    signIn: { email: vi.fn(async () => ({})) },
    signOut: vi.fn(async () => ({})),
  };
}

beforeEach(() => {
  delete (window as any).__FX_DATA__;
  (globalThis as any).__fluixi_iso_states__ = new Map();
});

describe('@fluixi/auth/client', () => {
  it('useUser seeds from the SSR transfer (window.__FX_DATA__) — no flash', () => {
    (window as any).__FX_DATA__ = { '__iso:auth': { user: { id: 'srv' }, session: null } };
    const { useUser } = createAuthHooks({ client: mockClient() });
    expect(useUser()()).toEqual({ id: 'srv' });
  });

  it('signIn calls the Better Auth client then refreshes the user', async () => {
    const client = mockClient({ id: 'u1' });
    const { useSignIn, useUser } = createAuthHooks({ client });
    await useSignIn()({ email: 'a@b.c', password: 'x' });
    expect(client.signIn.email).toHaveBeenCalledWith({ email: 'a@b.c', password: 'x' });
    expect(useUser()()).toEqual({ id: 'u1' });
  });

  it('signOut calls the client and clears the user', async () => {
    (window as any).__FX_DATA__ = { '__iso:auth': { user: { id: 'srv' }, session: null } };
    const client = mockClient();
    const { useSignOut, useUser } = createAuthHooks({ client });
    await useSignOut()();
    expect(client.signOut).toHaveBeenCalled();
    expect(useUser()()).toBeNull();
  });

  it('protectedRoute redirects unauthenticated users to /login and renders nothing', () => {
    const navigate = vi.fn();
    const { protectedRoute } = createAuthHooks({ client: mockClient(), navigate });
    const out = protectedRoute(() => 'secret')({});
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(out).toBeNull();
  });

  it('protectedRoute renders for authed/role-matched; guestOnly redirects an authed user', () => {
    (window as any).__FX_DATA__ = { '__iso:auth': { user: { id: 'u1', role: 'admin' }, session: null } };
    const navigate = vi.fn();
    const { protectedRoute } = createAuthHooks({ client: mockClient(), navigate });
    expect(protectedRoute(() => 'ok')({})).toBe('ok');
    expect(protectedRoute(() => 'ok', { role: 'admin' })({})).toBe('ok');
    expect(protectedRoute(() => 'ok', { role: 'editor' })({})).toBeNull(); // wrong role
    expect(protectedRoute(() => 'login', { guestOnly: true })({})).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(navigate).toHaveBeenCalledWith('/403');
  });
});

describe('@fluixi/auth/client — { session } overload', () => {
  it('drives useUser from a reactive session and syncs reactively', async () => {
    const { createSignal } = await import('@fluixi/core');
    const [user, setUser] = createSignal<{ id: string } | null>(null);
    const login = vi.fn(async () => {});
    const { useUser, useSignIn, protectedRoute } = createAuthHooks({
      session: { user, login },
      navigate: () => {},
    });
    expect(useUser()()).toBeNull();
    setUser({ id: 'u1' });
    expect(useUser()()).toEqual({ id: 'u1' }); // framework-owned sync, no app effect
    await useSignIn()('a@b.c', 'pw');
    expect(login).toHaveBeenCalledWith('a@b.c', 'pw'); // passthrough signature
    expect(protectedRoute(() => 'ok')({})).toBe('ok');
  });
});
