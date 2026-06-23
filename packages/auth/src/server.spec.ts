// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext, getRequestLocals } from '@fluixi/server';
import {
  defineAuth,
  authMiddleware,
  requireUser,
  optionalUser,
  requireRole,
  requirePermission,
} from './server.js';

function mockAuth(session: { user: unknown; session: unknown } | null) {
  return defineAuth({
    handler: async () => new Response('ok'),
    api: { getSession: async () => session },
  });
}

describe('@fluixi/auth/server', () => {
  it('authMiddleware resolves the session and writes locals.auth, then calls next', async () => {
    mockAuth({ user: { id: 'u1', role: 'admin' }, session: { id: 's1' } });
    const request = new Request('http://x/');
    let nextCalled = false;
    await authMiddleware()(request, async () => {
      nextCalled = true;
      return new Response('rendered');
    });
    expect(nextCalled).toBe(true);
    expect(getRequestLocals(request).auth).toEqual({
      user: { id: 'u1', role: 'admin' },
      session: { id: 's1' },
    });
  });

  it('requireUser / optionalUser read the user from the request context', async () => {
    mockAuth(null);
    const request = new Request('http://x/');
    getRequestLocals(request).auth = { user: { id: 'u1' } as any, session: null };
    await runWithRequestContext(createRequestContext({ url: '/', request }), async () => {
      expect(await requireUser()).toEqual({ id: 'u1' });
      expect(await optionalUser()).toEqual({ id: 'u1' });
    });
  });

  it('requireUser throws AuthError(401, /login) when unauthenticated', async () => {
    mockAuth(null);
    await runWithRequestContext(createRequestContext({ url: '/' }), async () => {
      await expect(requireUser()).rejects.toMatchObject({ status: 401, redirectTo: '/login' });
      expect(await optionalUser()).toBeNull();
    });
  });

  it('requireRole enforces the role (403 on mismatch, returns user on match)', async () => {
    mockAuth(null);
    const member = new Request('http://x/');
    getRequestLocals(member).auth = { user: { id: 'u1', role: 'member' } as any, session: null };
    await runWithRequestContext(createRequestContext({ url: '/', request: member }), async () => {
      await expect(requireRole('admin')).rejects.toMatchObject({ status: 403 });
    });

    const admin = new Request('http://x/');
    getRequestLocals(admin).auth = { user: { id: 'u2', role: 'admin' } as any, session: null };
    await runWithRequestContext(createRequestContext({ url: '/', request: admin }), async () => {
      expect(await requireRole('admin')).toMatchObject({ role: 'admin' });
    });
  });

  it('requirePermission throws 403 when false, passes when true', async () => {
    mockAuth(null);
    const request = new Request('http://x/');
    getRequestLocals(request).auth = { user: { id: 'u1' } as any, session: null };
    await runWithRequestContext(createRequestContext({ url: '/', request }), async () => {
      await expect(requirePermission(false)).rejects.toMatchObject({ status: 403 });
      await expect(requirePermission(() => true)).resolves.toBeUndefined();
    });
  });
});
