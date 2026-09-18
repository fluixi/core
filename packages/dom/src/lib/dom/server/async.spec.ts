import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createResource } from '@fluixi/reactive/signal';
import { createNativeElement, insert, renderToStringAsync, setRequestStore } from '@fluixi/dom';

// Async SSR needs the request context to survive awaits (so waterfall fetches
// route to the right request), that's what the ALS store provides. @fluixi/server
// injects it in production; inject one here to exercise the same path.
beforeAll(() => setRequestStore(new AsyncLocalStorage()));
afterAll(() => setRequestStore(null));

const tick = (v: string, ms = 5) => new Promise<string>((r) => setTimeout(() => r(v), ms));

describe('renderToStringAsync: resources', () => {
  it('awaits a resource and renders its resolved value', async () => {
    const App = () => {
      const [data] = createResource(() => tick('LOADED'));
      const div = createNativeElement('div') as any;
      insert(div, () => data() ?? 'loading...', null);
      return div;
    };
    const html = await renderToStringAsync(() => App());
    expect(html).toContain('<div>LOADED</div>');
    // resolved data is also serialized for client hydration, as a non-executable JSON block
    expect(html).toContain('<script type="application/json" id="__FX_DATA__">');
  });

  it('resolves a waterfall of two dependent resources', async () => {
    const App = () => {
      const [a] = createResource(() => tick('A'));
      // b depends on a, only fetches once a has resolved (source gates it)
      const [b] = createResource(a, (av) => tick(`${av}B`));
      const div = createNativeElement('div') as any;
      insert(div, () => b() ?? '...', null);
      return div;
    };
    expect(await renderToStringAsync(() => App())).toContain('<div>AB</div>');
  });

  it('renders loader-free content too (no pending -> resolves immediately)', async () => {
    const App = () => {
      const div = createNativeElement('div') as any;
      insert(div, 'static', null);
      return div;
    };
    expect(await renderToStringAsync(() => App())).toBe('<div>static</div>');
  });
});
