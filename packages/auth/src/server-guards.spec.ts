/**
 * The `@fluixi/api` guards: `signedIn()` and `member()`. They read the session the middleware
 * resolved, and ask Better Auth's organization plugin for the membership.
 */
import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext, getRequestLocals } from '@fluixi/server';
import { defineAuth, member, signedIn, type ActiveMember } from './server.js';

const user = { id: 'u1' };

function setup(options: {
  session: Record<string, unknown> | null;
  membership?: ActiveMember | null;
  allowed?: boolean;
  plugin?: boolean;
}) {
  const asked: unknown[] = [];
  const api: Record<string, unknown> = {
    getSession: async () => (options.session ? { user, session: options.session } : null),
  };
  if (options.plugin !== false) {
    api.getActiveMember = async () => options.membership ?? null;
    api.hasPermission = async (ctx: { body: unknown }) => {
      asked.push(ctx.body);
      return { success: options.allowed ?? false };
    };
  }
  defineAuth({ handler: async () => new Response('ok'), api: api as never });
  return asked;
}

const run = <T>(fn: (request: Request) => Promise<T>, withMiddlewareSession?: unknown) => {
  const request = new Request('http://x/api/v1/x');
  if (withMiddlewareSession) getRequestLocals(request).auth = withMiddlewareSession;
  return runWithRequestContext(createRequestContext({ url: '/api/v1/x', request }), () => fn(request));
};

const owner: ActiveMember = { id: 'm1', organizationId: 'o1', userId: 'u1', role: 'owner' };

describe('signedIn()', () => {
  it('hands over the user and session, resolving them when no middleware did', async () => {
    setup({ session: { id: 's1' } });
    expect(await run((r) => signedIn().check(r))).toEqual({ user, session: { id: 's1' } });
  });

  it('reads what the middleware resolved without asking again', async () => {
    setup({ session: null });
    const resolved = { user: { id: 'u2' }, session: { id: 's2' } };
    expect(await run((r) => signedIn().check(r), resolved)).toEqual(resolved);
  });

  it('refuses a caller with no session with 401', async () => {
    setup({ session: null });
    await expect(run((r) => signedIn().check(r))).rejects.toMatchObject({ status: 401 });
  });

  it('describes the session cookie, or the scheme given', () => {
    expect(signedIn().security).toMatchObject({ name: 'session', scheme: { in: 'cookie', name: 'better-auth.session_token' } });
    expect(signedIn({ scheme: { type: 'http', scheme: 'bearer' } }).security.scheme).toEqual({ type: 'http', scheme: 'bearer' });
  });
});

describe('member()', () => {
  it('hands over the membership of the active organisation', async () => {
    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: { ...owner, extra: 'dropped' } as ActiveMember });
    const auth = await run((r) => member().check(r));
    expect(auth.member).toEqual(owner);
    expect(auth.user).toEqual(user);
  });

  it('refuses without an active organisation, naming why', async () => {
    setup({ session: { id: 's1', activeOrganizationId: null } });
    await expect(run((r) => member().check(r))).rejects.toMatchObject({ status: 403, code: 'no_active_organization' });
  });

  it('refuses when the membership is gone', async () => {
    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: null });
    await expect(run((r) => member().check(r))).rejects.toMatchObject({ status: 403, code: 'not_a_member' });
  });

  it('checks roles, including several held at once', async () => {
    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: { ...owner, role: 'member' } });
    await expect(run((r) => member({ roles: ['owner', 'admin'] }).check(r))).rejects.toMatchObject({ status: 403 });

    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: { ...owner, role: 'member, admin' } });
    expect((await run((r) => member({ roles: ['admin'] }).check(r))).member.role).toBe('member, admin');
  });

  it('asks Better Auth for permissions, and refuses when it says no', async () => {
    const permissions = { project: ['delete'] };
    const asked = setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: owner, allowed: false });
    await expect(run((r) => member({ permissions }).check(r))).rejects.toMatchObject({ status: 403 });
    expect(asked).toEqual([{ permissions }]);

    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, membership: owner, allowed: true });
    expect((await run((r) => member({ permissions }).check(r))).member).toEqual(owner);
  });

  it('says what is missing when the organization plugin is off', async () => {
    setup({ session: { id: 's1', activeOrganizationId: 'o1' }, plugin: false });
    await expect(run((r) => member().check(r))).rejects.toThrow(/organization\(\) plugin/);
  });

  it('answers 401 and 403, for the API description', () => {
    expect(member().refuses).toEqual([401, 403]);
    expect(signedIn().refuses).toEqual([401]);
  });
});
