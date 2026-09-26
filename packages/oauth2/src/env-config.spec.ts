/**
 * Reading auth configuration out of the environment.
 *
 * The case worth being strict about is a secret arriving through a client-prefixed variable.
 * Vite inlines every `VITE_` value into the browser bundle whether code reads it or not, so
 * naming one `VITE_AUTH_CLIENT_SECRET` publishes it and nothing in the app looks wrong. That
 * has to fail loudly rather than work.
 */
import { describe, expect, it } from 'vitest';
import { authFromEnv } from './env-config.js';

const base = { VITE_AUTH_CLIENT_ID: 'web' };

describe('a secret that would ship', () => {
  it('is refused, and named', () => {
    expect(() =>
      authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://idp.test', VITE_AUTH_CLIENT_SECRET: 'shh' }),
    ).toThrow(/VITE_AUTH_CLIENT_SECRET/);
  });

  it('is refused under any of the words that mean secret', () => {
    for (const name of [
      'VITE_AUTH_SECRET',
      'VITE_DB_PASSWORD',
      'VITE_SIGNING_PRIVATE_KEY',
      'VITE_SERVICE_CREDENTIALS',
    ]) {
      expect(() =>
        authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://idp.test', [name]: 'x' }),
      ).toThrow(/inlines the value/);
    }
  });

  it('says where the value belongs instead', () => {
    expect(() =>
      authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://idp.test', VITE_AUTH_CLIENT_SECRET: 'shh' }),
    ).toThrow(/credentialsFromEnv/);
  });

  it('leaves an unprefixed secret alone, since it stays on the server', () => {
    expect(() =>
      authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://idp.test', AUTH_CLIENT_SECRET: 'shh' }),
    ).not.toThrow();
  });

  it('does not look for a prefix that is not there', () => {
    // Reading `process.env` on a server: nothing is prefixed and nothing is published.
    expect(() =>
      authFromEnv(
        { AUTH_CLIENT_ID: 'web', AUTH_ISSUER: 'https://idp.test', AUTH_CLIENT_SECRET: 'shh' },
        { clientPrefix: '' },
      ),
    ).not.toThrow();
  });
});

describe('the default, which is any OIDC provider', () => {
  it('needs only an issuer and a client id', () => {
    const auth = authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://idp.test' });

    expect(auth.providerName).toBe('oidc');
    expect(auth.clientId).toBe('web');
    expect(auth.tokens).toBe('browser');
    expect(auth.client.issuer).toBe('https://idp.test');
  });

  it('is ready to spread into a client', () => {
    const auth = authFromEnv({
      ...base,
      VITE_AUTH_ISSUER: 'https://idp.test',
      VITE_AUTH_REDIRECT_URI: 'https://app.test/callback',
      VITE_AUTH_TOKENS: 'server',
    });

    expect(auth.client).toMatchObject({
      clientId: 'web',
      tokens: 'server',
      redirectUri: 'https://app.test/callback',
      issuer: 'https://idp.test',
    });
  });

  it('moves the audience check to azp when told there is none', () => {
    const auth = authFromEnv({
      ...base,
      VITE_AUTH_ISSUER: 'https://idp.test',
      VITE_AUTH_NO_AUDIENCE: 'true',
    });
    const v = auth.provider.verifier('web');

    expect(v.audience).toBe(false);
    expect(v.authorizedParty).toBe('web');
  });

  it('reads scopes written either way', () => {
    const spaces = authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://i.test', VITE_AUTH_SCOPES: 'openid profile' });
    const commas = authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://i.test', VITE_AUTH_SCOPES: 'openid, profile' });

    expect(spaces.client.scopes).toEqual(['openid', 'profile']);
    expect(commas.client.scopes).toEqual(['openid', 'profile']);
  });
});

describe('the named providers', () => {
  it('builds Keycloak from a base URL and a realm', () => {
    const auth = authFromEnv({
      ...base,
      VITE_AUTH_PROVIDER: 'keycloak',
      VITE_AUTH_BASE_URL: 'http://localhost:8080',
      VITE_AUTH_REALM: 'adafri',
    });

    expect(auth.client.issuer).toBe('http://localhost:8080/realms/adafri');
    expect(auth.provider.roles({ realm_access: { roles: ['admin'] } })).toEqual(['admin']);
  });

  it('builds Auth0, sending the audience that makes the token a JWT', () => {
    const auth = authFromEnv({
      ...base,
      VITE_AUTH_PROVIDER: 'auth0',
      VITE_AUTH_DOMAIN: 'tenant.us.auth0.com',
      VITE_AUTH_AUDIENCE: 'https://api.adafri.com',
    });

    expect(auth.client.issuer).toBe('https://tenant.us.auth0.com/');
    expect(auth.client.extraParams).toEqual({ audience: 'https://api.adafri.com' });
  });

  it('builds Okta, and takes `org` as the org server', () => {
    const custom = authFromEnv({ ...base, VITE_AUTH_PROVIDER: 'okta', VITE_AUTH_DOMAIN: 'd.okta.com' });
    const org = authFromEnv({
      ...base,
      VITE_AUTH_PROVIDER: 'okta',
      VITE_AUTH_DOMAIN: 'd.okta.com',
      VITE_AUTH_AUTH_SERVER: 'org',
    });

    expect(custom.client.issuer).toBe('https://d.okta.com/oauth2/default');
    expect(org.client.issuer).toBe('https://d.okta.com');
  });

  it('turns DPoP off for a provider that has it on by default', () => {
    const on = authFromEnv({ ...base, VITE_AUTH_PROVIDER: 'okta', VITE_AUTH_DOMAIN: 'd.okta.com' });
    const off = authFromEnv({
      ...base,
      VITE_AUTH_PROVIDER: 'okta',
      VITE_AUTH_DOMAIN: 'd.okta.com',
      VITE_AUTH_DPOP: 'false',
    });

    expect(on.client.dpop).toBe(true);
    expect(off.client.dpop).toBe(false);
  });

  it('builds a plain OAuth2 server from its endpoints', () => {
    const auth = authFromEnv({
      ...base,
      VITE_AUTH_PROVIDER: 'oauth2',
      VITE_AUTH_ISSUER: 'https://idp.test',
      VITE_AUTH_AUTHORIZATION_ENDPOINT: 'https://idp.test/a',
      VITE_AUTH_TOKEN_ENDPOINT: 'https://idp.test/t',
    });

    expect(auth.client.endpoints?.token).toBe('https://idp.test/t');
  });
});

describe('one app, several providers', () => {
  it('prefers the specific prefix and falls back to the general one', () => {
    const source = {
      VITE_AUTH_TOKENS: 'server',
      VITE_OKTA_CLIENT_ID: 'okta-spa',
      VITE_OKTA_PROVIDER: 'okta',
      VITE_OKTA_DOMAIN: 'd.okta.com',
    };
    const auth = authFromEnv(source, { prefix: 'okta' });

    expect(auth.clientId).toBe('okta-spa');
    // Not set on the specific prefix, so the shared value applies.
    expect(auth.tokens).toBe('server');
  });
});

describe('what it refuses to guess', () => {
  it('says which variable to set for a missing client id', () => {
    expect(() => authFromEnv({ VITE_AUTH_ISSUER: 'https://idp.test' })).toThrow(
      /VITE_AUTH_CLIENT_ID/,
    );
  });

  it('names the variable a preset needs', () => {
    expect(() => authFromEnv({ ...base, VITE_AUTH_PROVIDER: 'keycloak' })).toThrow(
      /VITE_AUTH_BASE_URL/,
    );
  });

  it('lists the presets when given a name that is not one', () => {
    expect(() => authFromEnv({ ...base, VITE_AUTH_PROVIDER: 'onelogin' })).toThrow(/keycloak/);
  });

  it('refuses a tokens value that is neither', () => {
    expect(() =>
      authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://i.test', VITE_AUTH_TOKENS: 'cookie' }),
    ).toThrow(/browser.*server/);
  });

  it('treats an empty value as absent rather than as a value', () => {
    // A `.env` with `VITE_AUTH_SCOPES=` should not mean an empty scope list.
    const auth = authFromEnv({ ...base, VITE_AUTH_ISSUER: 'https://i.test', VITE_AUTH_SCOPES: '' });
    expect(auth.client.scopes).toBeUndefined();
  });
});
