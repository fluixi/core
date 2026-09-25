// @vitest-environment jsdom
/**
 * The redirect-URI route.
 *
 * What these pin is timing. Every bug this replaced came from doing browser work while
 * rendering rather than after mounting, and they all looked the same from outside: a page that
 * appeared and then ignored the URL it was standing on.
 *
 * Each test uses its own `code`. The single-use guard is module scoped on purpose, so a shared
 * code would make a later test silently skip its exchange.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, flush } from '@fluixi/testing';
import { useOAuthCallback, OAuthCallback } from './callback.js';

let codeSeq = 0;

/**
 * One `location` stub for the file, pointed at a new URL per test.
 *
 * Defined once: redefining the property per test leaves jsdom with stale accessors and the
 * run stops making progress.
 */
const replaced: string[] = [];
const loc = {
  href: 'http://localhost:3000/callback',
  search: '',
  replace: (url: string) => replaced.push(url),
};
Object.defineProperty(window, 'location', { configurable: true, value: loc });

/** Points the stub at a callback URL and clears what was recorded. */
function at(query: string): string[] {
  loc.href = `http://localhost:3000/callback?${query}`;
  loc.search = `?${query}`;
  replaced.length = 0;
  return replaced;
}

/** A code no other test has used. */
const freshCode = () => `code-${++codeSeq}`;

/** A stand-in service, with `complete` recorded. */
function service(outcome: 'ok' | 'fail' = 'ok', destination = '/dashboard') {
  const complete = vi.fn(async () => {
    if (outcome === 'fail') throw new Error('The callback state did not match.');
    return destination;
  });
  return { complete, service: { complete } as never };
}

/** Lets the mount effect and the exchange promise both settle. */
async function settle() {
  await flush();
  // A macrotask as well: the exchange rejects on its own microtask, and the render that
  // reports it is scheduled after that.
  await new Promise((r) => setTimeout(r, 0));
  await flush();
}

describe('the hook', () => {
  it('does nothing while rendering, and exchanges once mounted', async () => {
    const replaced = at(`code=${freshCode()}&state=xyz`);
    const made = service('ok', '/reports');

    let duringRender = -1;
    const view = render(() => {
      useOAuthCallback({ service: made.service });
      // An exchange started here would run during a server render too.
      duringRender = made.complete.mock.calls.length;
      return () => 'rendered';
    });

    expect(duringRender).toBe(0);
    await settle();

    expect(made.complete).toHaveBeenCalledTimes(1);
    // A document navigation, so the page arrives with the session established and no router
    // hook to resolve while rendering.
    expect(replaced).toEqual(['/reports']);
    view.unmount();
  });

  it('exchanges a code only once, however often the body runs', async () => {
    at(`code=${freshCode()}`);
    const made = service();

    const first = render(() => {
      useOAuthCallback({ service: made.service });
      return () => 'rendered';
    });
    await settle();

    const second = render(() => {
      useOAuthCallback({ service: made.service });
      return () => 'again';
    });
    await settle();

    // The code and its verifier are spent. A second attempt reports a state mismatch for a
    // flow that actually worked.
    expect(made.complete).toHaveBeenCalledTimes(1);
    first.unmount();
    second.unmount();
  });

  it('hands the destination to onSignedIn instead of navigating', async () => {
    const replaced = at(`code=${freshCode()}`);
    const made = service('ok', '/reports');
    const seen: string[] = [];

    const view = render(() => {
      useOAuthCallback({ service: made.service, onSignedIn: (d) => seen.push(d) });
      return () => 'rendered';
    });
    await settle();

    expect(seen).toEqual(['/reports']);
    expect(replaced).toEqual([]);
    view.unmount();
  });

  it('reports a refusal on the URL without exchanging', async () => {
    at('error=access_denied&error_description=User%20said%20no');
    const made = service();

    let state!: ReturnType<typeof useOAuthCallback>;
    const view = render(() => {
      state = useOAuthCallback({ service: made.service });
      return () => 'rendered';
    });
    await settle();

    expect(made.complete).not.toHaveBeenCalled();
    expect(state.stage()).toBe('failed');
    expect(state.error()).toContain('access_denied');
    expect(state.error()).toContain('User said no');
    view.unmount();
  });

  it('reports why the exchange failed', async () => {
    at(`code=${freshCode()}`);
    const made = service('fail');

    let state!: ReturnType<typeof useOAuthCallback>;
    const view = render(() => {
      state = useOAuthCallback({ service: made.service });
      return () => 'rendered';
    });
    await settle();

    expect(state.stage()).toBe('failed');
    expect(state.error()).toContain('did not match');
    view.unmount();
  });

  it('does not exchange when disabled, but still reports the URL', async () => {
    at(`code=${freshCode()}&state=xyz`);
    const made = service();

    let state!: ReturnType<typeof useOAuthCallback>;
    const view = render(() => {
      state = useOAuthCallback({ service: made.service, enabled: () => false });
      return () => 'rendered';
    });
    await settle();

    // Server mode: the middleware owns the callback, and an exchange here would report a
    // state mismatch that describes nothing real.
    expect(made.complete).not.toHaveBeenCalled();
    expect(Object.keys(state.params()).sort()).toEqual(['code', 'state']);
    // Nothing went wrong, so nothing is reported: the page says why itself.
    expect(state.stage()).toBe('waiting');
    expect(state.error()).toBeNull();
    view.unmount();
  });
});

describe('the component', () => {
  /**
   * The child closure is captured and called directly rather than read out of the DOM.
   * `render` here inserts what the root returns without tracking it, so the DOM shows the
   * first pass only; calling the child is what actually exercises the choice between the two
   * pieces of markup.
   */
  function mount(props: Parameters<typeof OAuthCallback>[0]) {
    let child!: () => unknown;
    const view = render(() => {
      child = OAuthCallback(props)() as () => unknown;
      return () => 'mounted';
    });
    return { child: () => String(child()), unmount: view.unmount };
  }

  it('shows the pending markup while it works', () => {
    at(`code=${freshCode()}`);
    const made = service();

    const view = mount({ service: made.service, pending: () => 'signing in' });
    expect(view.child()).toContain('signing in');
    view.unmount();
  });

  it('shows the failure markup with the reason', async () => {
    at(`code=${freshCode()}`);
    const made = service('fail');

    const view = mount({
      service: made.service,
      pending: () => 'signing in',
      failed: (reason) => `stopped: ${reason}`,
    });
    await settle();

    expect(view.child()).toContain('stopped:');
    expect(view.child()).toContain('did not match');
    view.unmount();
  });

  it('falls back to the bare reason when no failed markup is given', async () => {
    at(`code=${freshCode()}`);
    const made = service('fail');

    const view = mount({ service: made.service, pending: () => 'signing in' });
    await settle();

    // Better than nothing, and the JSDoc says to fill it in.
    expect(view.child()).toContain('did not match');
    view.unmount();
  });
});
