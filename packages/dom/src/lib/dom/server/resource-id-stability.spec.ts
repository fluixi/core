import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createResource } from '@fluixi/reactive/signal';
import { createNativeElement, insert, renderToStringAsync, setRequestStore } from '@fluixi/dom';

/**
 * Resource ids are positions in a per-render sequence; the client re-derives them
 * by counting resources in the same order. So an id must not depend on anything
 * that survives between requests.
 *
 * `lazy()` used to break that: its module-load resource is created on the cold
 * path only, and on the server the module stays loaded after the first request.
 * The first visitor after a restart got `{"r1": …}` for the page's own resource
 * and everyone after them got `{"r0": …}` — while the client, which preloads
 * routes before hydrating, always counted from r0. One of the two had to be
 * wrong, so either the first visitor or all the rest were served data their
 * client would never find.
 *
 * Reproduced here without the router: a resource that exists on the first render
 * and not on later ones is exactly the shape of the bug.
 */
beforeAll(() => setRequestStore(new AsyncLocalStorage()));
afterAll(() => setRequestStore(null));

const tick = <T,>(v: T, ms = 5) => new Promise<T>((r) => setTimeout(() => r(v), ms));

describe('resource ids do not depend on cross-request state', () => {
  it('renders the same payload on the first request and the next', async () => {
    // Stands in for a lazy module: created once, cached for every later render.
    let cached: unknown;

    const App = () => {
      if (!cached) {
        // Opted out of the transport, so it must not consume an id either. Not read
        // here: reading an unresolved resource outside a Suspense boundary suspends,
        // and what is under test is the id it does or does not take.
        createResource(() => tick('module').then((m) => (cached = m)), { transport: false });
      }
      const [data] = createResource(() => tick('PAGE'));
      const div = createNativeElement('div') as any;
      insert(div, () => data() ?? '…', null);
      return div;
    };

    const first = await renderToStringAsync(() => App());
    const second = await renderToStringAsync(() => App());

    expect(first).toContain('PAGE');
    expect(second).toContain('PAGE');
    // The id the client will look for — identical across the two.
    expect(first).toContain('"r0"');
    expect(second).toContain('"r0"');
    expect(first).toEqual(second);
  });

  it('a transport:false resource is never serialized', async () => {
    const App = () => {
      const [hidden] = createResource(() => tick('SECRET'), { transport: false });
      const div = createNativeElement('div') as any;
      insert(div, () => (hidden() ? 'ready' : '…'), null);
      return div;
    };
    const html = await renderToStringAsync(() => App());
    expect(html).toContain('ready');
    expect(html).not.toContain('SECRET');
    expect(html).not.toContain('__FX_DATA__');
  });
});
