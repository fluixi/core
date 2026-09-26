/**
 * The declared-public env model.
 *
 * Two properties carry it. A variable the app did not name must not be readable through the
 * public accessor, on either side, because a server render that can see more than the browser
 * renders one thing and hydrates into another. And `serverEnv` in a browser must throw rather
 * than return undefined: a secret read as undefined becomes a request sent without credentials,
 * failing somewhere else with a stack that points at the request.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  publicEnv,
  serverEnv,
  selectPublic,
  setDeclaredPublicKeys,
  suspectPublicNames,
} from './env.js';

const saved = { ...process.env };

beforeEach(() => {
  setDeclaredPublicKeys(null);
});
afterEach(() => {
  process.env = { ...saved };
  setDeclaredPublicKeys(null);
  // Remove the browser jsdom-ish globals a test may have installed.
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
});

/** Makes `inBrowser()` true, which is what the accessors branch on. */
function pretendBrowser() {
  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).document = {};
}

describe('choosing what is public', () => {
  it('keeps only what was declared', () => {
    const picked = selectPublic(
      { AUTH_ISSUER: 'https://idp.test', OIDC_CLIENT_SECRET: 'shh', API_URL: 'https://api.test' },
      ['AUTH_ISSUER', 'API_URL'],
    );

    expect(picked).toEqual({ AUTH_ISSUER: 'https://idp.test', API_URL: 'https://api.test' });
    // The whole point: a secret is excluded by not being named, not by being spotted.
    expect(picked.OIDC_CLIENT_SECRET).toBeUndefined();
  });

  it('accepts the prefixed spelling for a declared name', () => {
    // So an app migrates one variable at a time instead of renaming everything at once.
    const picked = selectPublic({ VITE_AUTH_ISSUER: 'https://idp.test' }, ['AUTH_ISSUER']);
    expect(picked.AUTH_ISSUER).toBe('https://idp.test');
  });

  it('prefers the bare name when both are set', () => {
    const picked = selectPublic(
      { AUTH_ISSUER: 'bare', VITE_AUTH_ISSUER: 'prefixed' },
      ['AUTH_ISSUER'],
    );
    expect(picked.AUTH_ISSUER).toBe('bare');
  });

  it('keeps every prefixed variable public, because it already was', () => {
    // Dropping these would break an app mid-migration, and they are in the bundle regardless.
    const picked = selectPublic({ VITE_OLD_THING: 'x', SERVER_ONLY: 'y' }, []);
    expect(picked).toEqual({ VITE_OLD_THING: 'x' });
  });

  it('treats an empty value as absent', () => {
    expect(selectPublic({ AUTH_ISSUER: '' }, ['AUTH_ISSUER'])).toEqual({});
  });

  it('omits a declared name that is not set', () => {
    expect(selectPublic({}, ['AUTH_ISSUER'])).toEqual({});
  });
});

describe('reading the public set on a server', () => {
  it('narrows to the declared keys, so both sides see the same thing', () => {
    process.env.AUTH_ISSUER = 'https://idp.test';
    process.env.OIDC_CLIENT_SECRET = 'shh';
    setDeclaredPublicKeys(['AUTH_ISSUER']);

    const env = publicEnv();
    expect(env.AUTH_ISSUER).toBe('https://idp.test');
    // Present in process.env and still not public: the browser cannot see it, so neither can a
    // server render that has to match.
    expect(env.OIDC_CLIENT_SECRET).toBeUndefined();
  });

  it('is frozen, since it describes a build rather than a state', () => {
    process.env.AUTH_ISSUER = 'https://idp.test';
    setDeclaredPublicKeys(['AUTH_ISSUER']);

    const env = publicEnv();
    expect(Object.isFrozen(env)).toBe(true);
    expect(() => {
      (env as Record<string, string>).AUTH_ISSUER = 'tampered';
    }).toThrow();
  });

  it('returns everything when no build declared a set, which is a test or a script', () => {
    process.env.SOMETHING = 'here';
    expect(publicEnv().SOMETHING).toBe('here');
  });

  it('finds a declared name under its VITE_ spelling, as the build did', () => {
    process.env.VITE_AUTH_CLIENT_ID = 'admin-app';
    setDeclaredPublicKeys(['AUTH_CLIENT_ID']);
    expect(publicEnv().AUTH_CLIENT_ID).toBe('admin-app');
  });

  it('answers the bare name at run time, where no build declared a set', () => {
    // A published @fluixi/start is imported from node_modules on the server, so the defined
    // literal never reaches it and the declared list was set in another process. An app whose
    // .env still says VITE_AUTH_CLIENT_ID must read AUTH_CLIENT_ID all the same.
    process.env.VITE_AUTH_CLIENT_ID = 'admin-app';
    delete process.env.AUTH_CLIENT_ID;
    expect(publicEnv().AUTH_CLIENT_ID).toBe('admin-app');
  });

  it('prefers the bare name when both are set', () => {
    process.env.AUTH_CLIENT_ID = 'bare';
    process.env.VITE_AUTH_CLIENT_ID = 'prefixed';
    expect(publicEnv().AUTH_CLIENT_ID).toBe('bare');
  });
});

describe('a server-only variable', () => {
  it('is readable on a server', () => {
    process.env.OIDC_CLIENT_SECRET = 'shh';
    expect(serverEnv('OIDC_CLIENT_SECRET')).toBe('shh');
  });

  it('is undefined rather than empty when unset', () => {
    process.env.NOT_SET_AT_ALL = '';
    expect(serverEnv('NOT_SET_AT_ALL')).toBeUndefined();
  });

  it('throws when required and missing, naming where it belongs', () => {
    expect(() => serverEnv('OIDC_CLIENT_SECRET', { required: true })).toThrow(/server-only/);
  });

  it('throws in a browser instead of answering undefined', () => {
    pretendBrowser();
    // Undefined here becomes a request sent without credentials, which fails elsewhere.
    expect(() => serverEnv('OIDC_CLIENT_SECRET')).toThrow(/called in a browser/);
  });

  it('says what to do about it', () => {
    pretendBrowser();
    expect(() => serverEnv('OIDC_CLIENT_SECRET')).toThrow(/env\.public.*publicEnv/s);
  });
});

describe('a name that reads like a secret', () => {
  it('is spotted in a declared list', () => {
    expect(suspectPublicNames(['AUTH_ISSUER', 'OIDC_CLIENT_SECRET', 'DB_PASSWORD'])).toEqual([
      'OIDC_CLIENT_SECRET',
      'DB_PASSWORD',
    ]);
  });

  it('leaves a token endpoint alone, which is a URL', () => {
    // A list that cries wolf gets suppressed wholesale, so `TOKEN` is not one of the words.
    expect(suspectPublicNames(['TOKEN_ENDPOINT', 'AUTH_ISSUER'])).toEqual([]);
  });
});
