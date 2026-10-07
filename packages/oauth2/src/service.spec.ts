// @vitest-environment jsdom
/**
 * The service, against a stub client.
 *
 * What matters here is the mapping onto `@fluixi/session`: that finishing a callback
 * produces a signed-in session, that the return destination survives the round trip, and
 * that a logout clears what the session held. The protocol itself is covered in
 * `browser.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService, paramsFromUrl } from './service.js';
import { OAuthError, type AuthClient, type Tokens } from './types.js';

interface User {
  sub: string;
  roles: string[];
}

/** A client that answers without a network or a redirect. */
function stubClient(over: Partial<AuthClient> = {}): AuthClient {
  const tokens: Tokens = { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 60_000 };
  return {
    login: vi.fn(async () => undefined),
    handleCallback: vi.fn(async () => tokens),
    refresh: vi.fn(async () => ({ ...tokens, accessToken: 'at2' })),
    fetchUser: vi.fn(async () => ({ sub: 'u1', roles: ['admin'] }) as never),
    logout: vi.fn(async () => undefined),
    consumeReturnTo: vi.fn(() => '/reports'),
    ...over,
  };
}

const service = (client: AuthClient, over = {}) =>
  createAuthService<User>({
    config: { tokens: 'browser', clientId: 'x', redirectUri: 'http://localhost:3000/callback' },
    client,
    ...over,
  });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('reading the callback URL', () => {
  it('picks out what the flow returns', () => {
    const params = paramsFromUrl('http://localhost:3000/callback?code=abc&state=xyz');
    expect(params).toEqual({ code: 'abc', state: 'xyz', error: undefined, errorDescription: undefined });
  });

  it('picks out an error', () => {
    const params = paramsFromUrl(
      'http://localhost:3000/callback?error=access_denied&error_description=No',
    );
    expect(params.error).toBe('access_denied');
    expect(params.errorDescription).toBe('No');
  });
});

describe('signing in', () => {
  it('hands the redirect to the client', async () => {
    const client = stubClient();
    await service(client).signIn({ returnTo: '/reports' });
    expect(client.login).toHaveBeenCalledWith({ returnTo: '/reports' });
  });
});

describe('completing a login', () => {
  it('exchanges the code and leaves the session authenticated', async () => {
    const client = stubClient();
    const auth = service(client);

    const destination = await auth.complete({ code: 'c', state: 's' });

    expect(client.handleCallback).toHaveBeenCalledWith({ code: 'c', state: 's' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()).toEqual({ sub: 'u1', roles: ['admin'] });
    expect(auth.token()).toBe('at');
    // Where `signIn` said to go, not a guess.
    expect(destination).toBe('/reports');
  });

  it('falls back to the root when nothing was recorded', async () => {
    const client = stubClient({ consumeReturnTo: () => null });
    expect(await service(client).complete({ code: 'c', state: 's' })).toBe('/');
  });

  it('reads the current URL when given no parameters', async () => {
    const client = stubClient();
    window.history.replaceState(null, '', '/callback?code=fromurl&state=s');
    await service(client).complete();
    expect(client.handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'fromurl' }),
    );
  });

  it('leaves the session signed out when the exchange fails', async () => {
    const client = stubClient({
      handleCallback: vi.fn(async () => {
        throw new OAuthError('bad code', 'invalid_grant');
      }),
    });
    const auth = service(client);

    await expect(auth.complete({ code: 'c', state: 's' })).rejects.toThrow();
    expect(auth.isAuthenticated()).toBe(false);
  });
});

describe('the app supplying its own user', () => {
  it('is used instead of the provider userinfo', async () => {
    const client = stubClient();
    const fetchUser = vi.fn(async () => ({ sub: 'own', roles: ['editor'] }));
    const auth = service(client, { fetchUser });

    await auth.complete({ code: 'c', state: 's' });

    expect(fetchUser).toHaveBeenCalledWith('at');
    expect(client.fetchUser).not.toHaveBeenCalled();
    expect(auth.user()).toEqual({ sub: 'own', roles: ['editor'] });
  });
});

describe('logging out', () => {
  it('clears the session and tells the client', async () => {
    const client = stubClient();
    const auth = service(client);
    await auth.complete({ code: 'c', state: 's' });

    await auth.logout();

    expect(client.logout).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });
});

describe('what the hooks need', () => {
  it('satisfies the session shape createAuthHooks takes', async () => {
    const auth = service(stubClient(), {
      // `getRole` derives the roles; `permissions` maps them to what the UI may show.
      access: {
        getRole: (u: User | null) => u?.roles ?? null,
        permissions: { admin: { manage: true } },
      },
    });
    await auth.complete({ code: 'c', state: 's' });

    // `createAuthHooks({ session })` reads exactly these.
    expect(typeof auth.user).toBe('function');
    expect(typeof auth.logout).toBe('function');
    expect(auth.roles()).toEqual(['admin']);
  });
});

describe('a session the server holds', () => {
  const serverService = (client: AuthClient) =>
    createAuthService<User>({
      config: { tokens: 'server', redirectUri: 'http://localhost:3000/auth/callback' },
      client,
    });

  it('is picked up in the browser from the user the server answers with', async () => {
    const client = stubClient();
    const auth = serverService(client);
    await vi.waitFor(() => expect(auth.user()).toEqual({ sub: 'u1', roles: ['admin'] }));
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.useUser()()).toEqual({ sub: 'u1', roles: ['admin'] });
    expect(client.fetchUser).toHaveBeenCalledTimes(1);
    expect(client.handleCallback).not.toHaveBeenCalled();
  });

  it('does not ask when the page the server rendered says nobody is signed in', async () => {
    // What the server sends with a signed-out page: the auth store's seed, user null.
    (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__ = { '__iso:auth': { user: null, session: null } };
    try {
      const client = stubClient();
      const auth = serverService(client);
      await new Promise((r) => setTimeout(r, 0));
      expect(client.fetchUser).not.toHaveBeenCalled();
      expect(auth.useUser()()).toBeNull();
    } finally {
      delete (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__;
    }
  });

  it('stays signed out when the server no longer accepts the cookie', async () => {
    const client = stubClient({ fetchUser: vi.fn(async () => Promise.reject(new OAuthError('no', 'me_failed'))) });
    const auth = serverService(client);
    await vi.waitFor(() => expect(client.fetchUser).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.useUser()()).toBeNull();
  });
});
