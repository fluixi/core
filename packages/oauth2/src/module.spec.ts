import { describe, expect, it } from 'vitest';
import { collectApp, defineApp } from '@fluixi/start/app';
import { authModule } from './module.js';
import { authServerModule } from './server.js';
import { AuthClientToken, AuthServiceToken } from './tokens.js';

describe('authModule', () => {
  it('registers the service and its client under their tokens', () => {
    const client = { kind: 'client' };
    const auth = { client } as never;
    const app = collectApp([defineApp({ imports: [authModule(auth)] })]);
    const byToken = new Map(app.providers.map((p: any) => [p.provide, p.useValue]));
    expect(byToken.get(AuthServiceToken)).toBe(auth);
    expect(byToken.get(AuthClientToken)).toBe(client);
    expect(app.middleware).toEqual([]);
  });
});

describe('authServerModule', () => {
  it('mounts the routes ahead of the session middleware, and nothing else', async () => {
    const mod = authServerModule({
      issuer: 'https://idp.test',
      clientId: 'app',
      redirectUri: 'https://app.test/auth/callback',
      cookieSecret: 'x'.repeat(32),
    } as never);
    const app = collectApp([defineApp({ imports: [mod] })]);
    expect(app.withMiddleware).toEqual(['oauth2-server']);
    expect(app.middleware).toHaveLength(2);
    expect(app.providers).toEqual([]);
    // A request that is not an auth route passes straight through both.
    let reached = false;
    const [routes] = app.middleware;
    await routes(new Request('https://app.test/somewhere'), async () => {
      reached = true;
      return new Response('ok');
    });
    expect(reached).toBe(true);
  });
});
