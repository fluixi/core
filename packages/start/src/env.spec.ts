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
  asBoolean,
  asList,
  asNumber,
  asUrl,
  env,
  pickEnv,
  publicEnv,
  serverEnv,
  selectPublic,
  setBuildPublicEnv,
  setDeclaredPublicKeys,
  suspectPublicNames,
} from './env.js';

const saved = { ...process.env };

beforeEach(() => {
  setBuildPublicEnv(null);
});
afterEach(() => {
  process.env = { ...saved };
  setBuildPublicEnv(null);
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

  it('returns only what is public by its prefix when nothing declared a set', () => {
    // A server whose framework never saw the build or the config used to get every variable
    // here, and a page could render a secret through publicEnv().
    process.env.SESSION_SECRET = 'shh';
    process.env.VITE_FLAG = 'on';
    expect(publicEnv().SESSION_SECRET).toBeUndefined();
    expect(publicEnv().VITE_FLAG).toBe('on');
  });

  it('holds only VITE_ names when the app declared an empty set', () => {
    process.env.SESSION_SECRET = 'shh';
    process.env.VITE_FLAG = 'on';
    setDeclaredPublicKeys([]);
    expect(Object.keys(publicEnv())).toEqual(['VITE_FLAG']);
  });

  it("serves the build's values over the server's own environment", () => {
    // The browser bundle has what the build saw; a server reading its run-time value would
    // render one thing and hydrate into another.
    process.env.API_URL = 'https://changed-after-build.test';
    process.env.SESSION_SECRET = 'shh';
    setBuildPublicEnv({ keys: ['API_URL'], values: { API_URL: 'https://at-build.test' } });
    expect(publicEnv()).toEqual({ API_URL: 'https://at-build.test' });
    expect(env('API_URL')).toBe('https://at-build.test');
    // A server-only name is still read from the server's environment.
    expect(env('SESSION_SECRET')).toBe('shh');
  });

  it('shares the declared set across copies of the module', async () => {
    // The production handler and the app import this module through different built entries.
    setDeclaredPublicKeys(['AUTH_ISSUER']);
    process.env.AUTH_ISSUER = 'https://idp.test';
    process.env.OTHER = 'x';
    const copy = await import('./env.js?copy' as string);
    expect(copy.publicEnv()).toEqual({ AUTH_ISSUER: 'https://idp.test' });
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

describe('env(), one reader for both sides', () => {
  const g = globalThis as Record<string, unknown>;
  const inBrowser = (publicValues: Record<string, string>, declared: string[], run: () => void) => {
    Object.assign(g, { window: {}, document: {}, __FLUIXI_PUBLIC_ENV__: publicValues, __FLUIXI_PUBLIC_KEYS__: declared });
    try {
      run();
    } finally {
      for (const k of ['window', 'document', '__FLUIXI_PUBLIC_ENV__', '__FLUIXI_PUBLIC_KEYS__']) delete g[k];
    }
  };

  it('reads any variable on the server, secrets included', () => {
    process.env.SESSION_SECRET = 'shh';
    expect(env('SESSION_SECRET')).toBe('shh');
  });

  it('finds a name under its VITE_ spelling on the server, as publicEnv() does', () => {
    delete process.env.API_URL;
    process.env.VITE_API_URL = 'https://api.test';
    expect(env('API_URL')).toBe('https://api.test');
    process.env.API_URL = 'https://bare.test';
    expect(env('API_URL')).toBe('https://bare.test');
  });

  it('throws when required and unset, naming it, and treats empty as unset', () => {
    process.env.EMPTY = '';
    expect(env('EMPTY')).toBeUndefined();
    expect(() => env('MISSING_ONE', { required: true })).toThrow(/MISSING_ONE is not set/);
  });

  it('reads a declared name in the browser, set or not', () => {
    inBrowser({ API_URL: 'https://api.test' }, ['API_URL', 'APP_URL'], () => {
      expect(env('API_URL')).toBe('https://api.test');
      expect(env('APP_URL')).toBeUndefined();
      expect(env('VITE_LEGACY')).toBeUndefined();
    });
  });

  it('throws in the browser for a name that is not public, which is the check the build cannot always make', () => {
    inBrowser({ API_URL: 'https://api.test' }, ['API_URL'], () => {
      const key = ['SESSION', 'SECRET'].join('_'); // computed, as the build could not see it
      expect(() => env(key)).toThrow(/env\("SESSION_SECRET"\) ran in the browser, where only env.public exists/);
    });
  });
});

describe('pickEnv', () => {
  it('builds a frozen object from bare keys, defaults, optionals and parsers', () => {
    Object.assign(process.env, { API_URL: 'https://api.test/', PAGE_SIZE: '50', FLAGS: 'a, b c', DEBUG: 'yes' });
    delete process.env.AUTH_SERVICE_URL;
    delete process.env.SENTRY_DSN;
    const config = pickEnv({
      apiUrl: { key: 'API_URL', parse: asUrl },
      authServiceUrl: { key: 'AUTH_SERVICE_URL', default: '' },
      pageSize: { key: 'PAGE_SIZE', default: 20, parse: asNumber },
      flags: { key: 'FLAGS', parse: asList },
      debug: { key: 'DEBUG', parse: asBoolean },
      sentryDsn: { key: 'SENTRY_DSN', optional: true },
    });
    expect(config).toEqual({
      apiUrl: 'https://api.test',
      authServiceUrl: '',
      pageSize: 50,
      flags: ['a', 'b', 'c'],
      debug: true,
      sentryDsn: undefined,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('reports every missing and invalid variable in one error', () => {
    delete process.env.MISSING_A;
    delete process.env.MISSING_B;
    process.env.BAD_NUMBER = 'twelve';
    expect(() =>
      pickEnv({ a: 'MISSING_A', b: 'MISSING_B', n: { key: 'BAD_NUMBER', parse: asNumber } }),
    ).toThrow(/not set: MISSING_A, MISSING_B\n {2}invalid: BAD_NUMBER \("twelve" is not a number\)/);
  });

  it('parsers refuse what they cannot read', () => {
    expect(() => asNumber('')).toThrow();
    expect(() => asBoolean('maybe')).toThrow();
    expect(() => asUrl('/relative')).toThrow();
    expect(asBoolean('OFF')).toBe(false);
  });
});
