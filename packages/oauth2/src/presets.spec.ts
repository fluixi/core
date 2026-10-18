/**
 * Provider presets.
 *
 * These encode facts that cost a live round trip each, so the tests assert the facts rather
 * than the shape. The ones that matter most are the two places a check moves instead of
 * disappearing: Keycloak and Okta put no `aud` on an access token, and `audience: false` on its
 * own would accept a token minted for any client of the same issuer.
 */
import { describe, expect, it } from 'vitest';
import { presets } from './presets.js';

describe('the agnostic path', () => {
  it('takes an issuer and nothing else', () => {
    const p = presets.oidc({ issuer: 'https://idp.test/' });

    // Trailing slash removed: an issuer comparison is exact, and a provider that publishes it
    // one way is rejected when pinned the other.
    expect(p.client.issuer).toBe('https://idp.test');
    expect(p.verifier('web').audience).toBe('web');
  });

  it('moves the check to azp when told there is no audience', () => {
    const v = presets.oidc({ issuer: 'https://idp.test', audience: false }).verifier('web');

    expect(v.audience).toBe(false);
    // Not dropped: `audience: false` alone accepts a token minted for another client.
    expect(v.authorizedParty).toBe('web');
  });

  it('covers a server with no discovery document', () => {
    const p = presets.oauth2({
      issuer: 'https://idp.test',
      endpoints: { authorization: 'https://idp.test/a', token: 'https://idp.test/t' },
    });

    expect(p.client.endpoints?.token).toBe('https://idp.test/t');
    expect(p.client.issuer).toBeUndefined();
  });
});

describe('Keycloak', () => {
  const p = presets.keycloak({ baseUrl: 'http://localhost:8080/', realm: 'acme' });

  it('builds the realm issuer', () => {
    expect(p.client.issuer).toBe('http://localhost:8080/realms/acme');
  });

  it('expects no aud, and checks azp instead', () => {
    const v = p.verifier('acme-admin');
    expect(v.audience).toBe(false);
    expect(v.authorizedParty).toBe('acme-admin');
  });

  it('reads realm roles', () => {
    expect(p.roles({ realm_access: { roles: ['admin'] } })).toEqual(['admin']);
  });

  it('says the audience mapper is the better end state', () => {
    expect(p.constraints.join(' ')).toMatch(/audience mapper/i);
  });
});

describe('Auth0', () => {
  it('keeps the trailing slash on the issuer', () => {
    // Auth0's issuer carries one, and a verifier pinned without it rejects every token.
    expect(presets.auth0({ domain: 'tenant.us.auth0.com' }).client.issuer).toBe(
      'https://tenant.us.auth0.com/',
    );
  });

  it('accepts a domain given with a scheme', () => {
    expect(presets.auth0({ domain: 'https://tenant.us.auth0.com/' }).client.issuer).toBe(
      'https://tenant.us.auth0.com/',
    );
  });

  it('sends the audience as an extra parameter, which is what makes the token a JWT', () => {
    const p = presets.auth0({ domain: 'tenant.us.auth0.com', audience: 'https://api.acme.com' });
    expect(p.client.extraParams).toEqual({ audience: 'https://api.acme.com' });
    expect(p.verifier('web').audience).toBe('https://api.acme.com');
  });

  it('expects an opaque token when no audience is given', () => {
    const v = presets.auth0({ domain: 'tenant.us.auth0.com' }).verifier('web');
    expect(v.audience).toBe(false);
    expect(v.authorizedParty).toBe('web');
  });

  it('records what a refresh token actually needs', () => {
    // Three settings, and a missing one is ignored silently rather than reported.
    expect(presets.auth0({ domain: 'x.auth0.com' }).constraints.join(' ')).toMatch(
      /offline_access.*Allow Offline Access.*Rotation/s,
    );
  });
});

describe('Okta', () => {
  it('defaults to the custom server, not the org', () => {
    expect(presets.okta({ domain: 'dev-1.okta.com' }).client.issuer).toBe(
      'https://dev-1.okta.com/oauth2/default',
    );
  });

  it('uses the bare domain for the org server', () => {
    expect(presets.okta({ domain: 'dev-1.okta.com', authorizationServer: null }).client.issuer).toBe(
      'https://dev-1.okta.com',
    );
  });

  it('turns DPoP on, because Okta does', () => {
    expect(presets.okta({ domain: 'dev-1.okta.com' }).client.dpop).toBe(true);
    expect(presets.okta({ domain: 'dev-1.okta.com', dpop: false }).client.dpop).toBe(false);
  });

  it('reads groups, and checks azp since an access token carries no client id', () => {
    const p = presets.okta({ domain: 'dev-1.okta.com' });
    expect(p.roles({ groups: ['admins'] })).toEqual(['admins']);
    expect(p.verifier('spa').authorizedParty).toBe('spa');
  });

  it('records that a public client cannot introspect', () => {
    expect(presets.okta({ domain: 'd.okta.com' }).constraints.join(' ')).toMatch(
      /public SPA cannot introspect/i,
    );
  });
});

describe('Google', () => {
  const p = presets.google();

  it('accepts both spellings of its issuer', () => {
    // Published two ways, and a service pinned to one rejects tokens carrying the other.
    expect(p.verifier('web').issuer).toEqual([
      'https://accounts.google.com',
      'accounts.google.com',
    ]);
  });

  it('checks the client id as the audience', () => {
    expect(p.verifier('web.apps.googleusercontent.com').audience).toBe(
      'web.apps.googleusercontent.com',
    );
  });

  it('records that browser mode cannot work', () => {
    expect(p.constraints.join(' ')).toMatch(/client_secret is missing/);
  });
});

describe('Dex', () => {
  it('records the CORS refusal, including that naming endpoints does not help', () => {
    const p = presets.dex({ baseUrl: 'http://localhost:5556/dex' });
    expect(p.client.issuer).toBe('http://localhost:5556/dex');
    expect(p.constraints.join(' ')).toMatch(/no CORS headers/i);
    expect(p.constraints.join(' ')).toMatch(/moves the failure/i);
  });
});

describe('every preset', () => {
  const all = [
    presets.oidc({ issuer: 'https://idp.test' }),
    presets.oauth2({ issuer: 'https://idp.test', endpoints: { authorization: 'a', token: 't' } }),
    presets.keycloak({ baseUrl: 'http://localhost:8080', realm: 'r' }),
    presets.auth0({ domain: 'x.auth0.com' }),
    presets.okta({ domain: 'x.okta.com' }),
    presets.google(),
    presets.dex({ baseUrl: 'http://localhost:5556/dex' }),
  ];

  it('names itself, reads roles, and shapes a verifier', () => {
    for (const p of all) {
      expect(p.label).toBeTruthy();
      expect(p.roles({})).toEqual([]);
      const v = p.verifier('client');
      expect(v.issuer).toBeTruthy();
      // Either an audience to check, or `azp` in its place. Never neither.
      expect(v.audience !== false || !!v.authorizedParty).toBe(true);
    }
  });
});
