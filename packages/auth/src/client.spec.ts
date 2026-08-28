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
    const { createSignal } = await import('fluixi');
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

describe('@fluixi/auth/client — RBAC surface', () => {
  type Perms = { products: { edit: boolean } };

  function rbacSession(role: string | null) {
    const perms: Record<string, Perms> = {
      admin: { products: { edit: true } },
      viewer: { products: { edit: false } },
    };
    return {
      user: () => (role ? { id: 'u1', role } : null),
      roles: () => (role ? [role] : []),
      permissions: () => (role ? perms[role] : undefined),
      can: (check: (p: Perms) => boolean) => (role ? check(perms[role]) : false),
    };
  }

  it('usePermissions / useCan reflect the session permission set', () => {
    const { usePermissions, useCan } = createAuthHooks<any, Perms>({ session: rbacSession('viewer') });
    expect(usePermissions()()).toEqual({ products: { edit: false } });
    expect(useCan()((p) => p.products.edit)).toBe(false);
  });

  it('Can renders children only when the permission holds', () => {
    const { Can } = createAuthHooks<any, Perms>({ session: rbacSession('admin') });
    expect((Can({ perform: (p) => p.products.edit, children: 'EDIT' }) as any)()).toBe('EDIT');
    expect((Can({ perform: (p) => !p.products.edit, children: 'X', fallback: 'NO' }) as any)()).toBe('NO');
  });

  it('protectedRoute gates on a permission and on roles[]', () => {
    const navigate = vi.fn();
    const hooks = createAuthHooks<any, Perms>({ session: rbacSession('viewer'), navigate });
    expect(hooks.protectedRoute(() => 'ok', { permission: (p) => p.products.edit })({})).toBeNull();
    expect(hooks.protectedRoute(() => 'ok', { roles: ['admin', 'viewer'] })({})).toBe('ok');
    expect(navigate).toHaveBeenCalledWith('/403');
  });

  it('Protect hides a section when the user lacks the permission', () => {
    const { Protect } = createAuthHooks<any, Perms>({ session: rbacSession('viewer') });
    expect((Protect({ permission: (p) => p.products.edit, children: 'panel', fallback: null }) as any)()).toBeNull();
    expect((Protect({ role: 'viewer', children: 'panel' }) as any)()).toBe('panel');
  });
});
