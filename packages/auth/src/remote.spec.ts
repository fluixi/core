import { describe, it, expect } from 'vitest';
import { remoteAuth } from './remote.js';
import { defineAuth } from './server.js';

const user = { id: 'u1', email: 'a@example.test' };
const calls: Request[] = [];
const api: typeof fetch = async (input, init) => {
  const request = new Request(input as URL, init);
  calls.push(request);
  if (new URL(request.url).pathname === '/api/auth/get-session') {
    return request.headers.get('cookie') === 'session=ok'
      ? Response.json({ user, session: { id: 's1', activeOrganizationId: 'o1' } })
      : Response.json(null);
  }
  return Response.json({ path: new URL(request.url).pathname, method: request.method });
};

describe('remoteAuth', () => {
  const auth = defineAuth(remoteAuth({ url: 'http://api.test', fetch: api }));

  it('reads the session from the API with the visitor cookie', async () => {
    const session = await auth.getSession(new Request('http://web.test/', { headers: { cookie: 'session=ok' } }));
    expect(session).toEqual({ user, session: { id: 's1', activeOrganizationId: 'o1' } });
    expect(calls.at(-1)!.url).toBe('http://api.test/api/auth/get-session');
  });

  it('is signed out for an unknown cookie', async () => {
    expect(await auth.getSession(new Request('http://web.test/', { headers: { cookie: 'session=old' } }))).toEqual({ user: null, session: null });
  });

  it('asks nothing when there is no cookie', async () => {
    const before = calls.length;
    expect(await auth.getSession(new Request('http://web.test/'))).toEqual({ user: null, session: null });
    expect(calls.length).toBe(before);
  });

  it('passes auth routes on to the API', async () => {
    const res = await auth.handler(new Request('http://web.test/api/auth/sign-out', { method: 'POST', body: '{}' }));
    expect(await res.json()).toEqual({ path: '/api/auth/sign-out', method: 'POST' });
  });
});
