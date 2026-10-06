/**
 * The bridge from a given session into the hooks waits for `ready`.
 *
 * In a page the server rendered signed in, the hooks start from the server's user. A session
 * that has not asked anyone yet reports nobody, and copying that over at once is what blanked
 * a signed-in header right after hydration. Until the session says it is ready, the hooks keep
 * what they started from.
 */
import { describe, expect, it } from 'vitest';
import { createSignal, flush } from '@fluixi/reactive/signal';
import { createAuthHooks } from './client.js';

interface User {
  name: string;
}

const sessionOf = (user: () => User | null) => ({ user, roles: () => [], can: () => false });

describe('a session that is not ready yet', () => {
  it('is not copied into the hooks until it is', async () => {
    const [user] = createSignal<User | null>({ name: 'ada' });
    const [ready, setReady] = createSignal(false);
    const hooks = createAuthHooks<User>({ session: sessionOf(user), ready });
    expect(hooks.useUser()()).toBeNull();

    setReady(true);
    await flush();
    expect(hooks.useUser()()).toEqual({ name: 'ada' });
  });

  it('is copied at once when no `ready` is given, as before', () => {
    const [user] = createSignal<User | null>({ name: 'bo' });
    const hooks = createAuthHooks<User>({ session: sessionOf(user) });
    expect(hooks.useUser()()).toEqual({ name: 'bo' });
  });
});
