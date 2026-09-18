// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { isServer as domIsServer, setServerMode } from '@fluixi/dom';
import { isServer as fromServerEntry, isClient as clientFromServerEntry } from './index.js';
import { isServerEnvironment, isClientEnvironment } from './hydration.js';
import { isServer as fromRootEntry } from '../env/index.js';

/**
 * `@fluixi/core` and `@fluixi/core/server` both export `isServer`, and they used to
 * disagree. The subpath defined its own `typeof window === 'undefined'` while the root
 * entry re-exported the realm flag from `@fluixi/dom`, so a server render inside a jsdom
 * process was reported as a client render by one of the two.
 *
 * That is the shape of the alpha.83 SSR bug, where four copies of the same test each
 * read a different module's idea of the answer. One source now, and this holds it there:
 * the tests run under jsdom, so `window` exists and a local test would answer false
 * while the renderer is in server mode.
 */
afterEach(() => setServerMode(false));

describe('one isServer for the whole package', () => {
  it('every exported predicate follows the renderer, not the presence of window', () => {
    expect(typeof window).not.toBe('undefined'); // the test environment has one

    setServerMode(true);
    expect(domIsServer()).toBe(true);
    expect(fromServerEntry()).toBe(true);
    expect(isServerEnvironment()).toBe(true);
    expect(fromRootEntry()).toBe(true);

    setServerMode(false);
    expect(fromServerEntry()).toBe(false);
    expect(isServerEnvironment()).toBe(false);
    expect(fromRootEntry()).toBe(false);
  });

  it('the client predicates are the exact negation', () => {
    setServerMode(true);
    expect(clientFromServerEntry()).toBe(false);
    expect(isClientEnvironment()).toBe(false);

    setServerMode(false);
    expect(clientFromServerEntry()).toBe(true);
    expect(isClientEnvironment()).toBe(true);
  });

  it('the root entry and the server subpath are the same function', () => {
    // Not merely equal answers. A second implementation is how they drifted before.
    expect(fromServerEntry).toBe(domIsServer);
    expect(fromRootEntry).toBe(domIsServer);
  });
});
