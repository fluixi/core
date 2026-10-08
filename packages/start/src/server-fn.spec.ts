import { describe, it, expect } from 'vitest';
import {
  $$createServerReference,
  $$registerServerFn,
  ServerFunctionError,
  setServerFnFetch,
  isServerFnRequest,
  handleServerFn,
  setServerFnContextRunner,
  SERVER_FN_ENDPOINT,
} from './server-fn.js';

const rpc = (id: string, args: any[], headers: Record<string, string> = {}) =>
  new Request('http://localhost' + SERVER_FN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-fluixi-server-fn': id, ...headers },
    body: JSON.stringify(args),
  });

describe('@fluixi/start server functions', () => {
  it('isServerFnRequest detects the RPC call', () => {
    expect(isServerFnRequest(rpc('x', []))).toBe(true);
    expect(isServerFnRequest(new Request('http://localhost/'))).toBe(false);
  });

  it('registers and dispatches a function with its args', async () => {
    $$registerServerFn('add:0', (a: number, b: number) => a + b);
    const res = await handleServerFn(rpc('add:0', [2, 3]));
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(5);
  });

  it('awaits async functions', async () => {
    $$registerServerFn('user:0', async (id: number) => ({ id, name: 'Ada' }));
    const res = await handleServerFn(rpc('user:0', [7]));
    expect(await res.json()).toEqual({ id: 7, name: 'Ada' });
  });

  it('404 for an unknown id', async () => {
    expect((await handleServerFn(rpc('nope:9', []))).status).toBe(404);
  });

  it('answers a thrown 401 or 403 with that status, not a 500', async () => {
    $$registerServerFn('secret:0', () => {
      throw Object.assign(new Error('Unauthorized'), { status: 401, redirectTo: '/login' });
    });
    const res = await handleServerFn(rpc('secret:0', []));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized', redirectTo: '/login' });
  });

  it('answers any thrown 4xx refusal with its status, code and details', async () => {
    $$registerServerFn('member:0', () => {
      throw Object.assign(new Error('no_such_account'), { status: 422, code: 'no_such_account', details: { email: 'x' } });
    });
    const res = await handleServerFn(rpc('member:0', []));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'refused', code: 'no_such_account', details: { email: 'x' } });
  });

  it('rejects in the browser with the refusal: status, code and details', async () => {
    $$registerServerFn('member:1', () => {
      throw Object.assign(new Error('no'), { status: 409, code: 'already_member', details: { email: 'a@b.c' } });
    });
    // The browser's fetch, answered by the server half.
    setServerFnFetch(((_: RequestInfo, init?: RequestInit) =>
      handleServerFn(rpc(String((init?.headers as Record<string, string>)['x-fluixi-server-fn']), JSON.parse(String(init?.body))))) as typeof fetch);
    try {
      const failure = await (($$createServerReference('member:1') as () => Promise<unknown>)()).catch((e: unknown) => e);
      expect(failure).toBeInstanceOf(ServerFunctionError);
      expect(failure).toMatchObject({ status: 409, code: 'already_member', details: { email: 'a@b.c' } });
      expect((failure as Error).message).toBe('server function "member:1" failed: 409 already_member');
    } finally {
      setServerFnFetch((...a) => fetch(...a));
    }
  });

  it('500 when the function throws', async () => {
    $$registerServerFn('boom:0', () => { throw new Error('nope'); });
    expect((await handleServerFn(rpc('boom:0', []))).status).toBe(500);
  });

  it('403 on cross-origin (CSRF)', async () => {
    $$registerServerFn('csrf:0', () => 1);
    const res = await handleServerFn(rpc('csrf:0', [], { origin: 'http://evil.com' }));
    expect(res.status).toBe(403);
  });

  it('allows same-origin', async () => {
    $$registerServerFn('same:0', () => 'ok');
    const res = await handleServerFn(rpc('same:0', [], { origin: 'http://localhost' }));
    expect(res.status).toBe(200);
  });

  it('runs the fn through the injected context runner + applies response headers', async () => {
    let sawRequest: Request | undefined;
    setServerFnContextRunner((request, run) => {
      sawRequest = request;
      return { result: Promise.resolve(run()), responseHeaders: { 'set-cookie': 'sid=1' } };
    });
    $$registerServerFn('ctx:0', () => 'hi');
    const res = await handleServerFn(rpc('ctx:0', []));
    expect(sawRequest).toBeInstanceOf(Request); // fn ran inside the runner
    expect(res.headers.get('set-cookie')).toBe('sid=1'); // header propagated to the response
    expect(await res.json()).toBe('hi');
    setServerFnContextRunner(null); // reset for other tests
  });
});
