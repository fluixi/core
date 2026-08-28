import { describe, it, expect } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { createNativeElement, insert } from '@fluixi/dom';
import { renderRequestAsync, preloadServerState } from './index.js';

// createIsomorphicState (in fluixi) registers on this globalThis map; we register
// directly here to test the server half (preload → resolve → render reads → serialize)
// without an import edge from @fluixi/server to fluixi.
function register(key: string, server: (e: any) => any) {
  const [value, set] = createSignal<any>(undefined);
  const reg = ((globalThis as any).__fluixi_iso_states__ ??= new Map());
  reg.set(key, { server, set });
  return value;
}

describe('@fluixi/server — isomorphic request state', () => {
  it('resolves on the server before render, the render reads it, and it serializes for the client', async () => {
    const region = register('region', (event) => ({ id: 'reg_SERVER', url: event?.url }));

    const App = ({ url }: { url: string }) => {
      const div = createNativeElement('div') as any;
      insert(div, () => (region() ? `${region().id}@${url}` : 'none'), null);
      return div;
    };

    const html = await renderRequestAsync(App, { url: '/femme' });

    // The render saw the server-resolved value (not the fallback)…
    expect(html).toContain('reg_SERVER@/femme');
    // …and it was serialized under the iso key so the client seeds the SAME value.
    expect(html).toContain('__iso:region');
    expect(html).toContain('reg_SERVER');
  });

  it('preloadServerState is a no-op when nothing is registered', async () => {
    delete (globalThis as any).__fluixi_iso_states__;
    await expect(preloadServerState({ url: '/' })).resolves.toBeUndefined();
  });

  it('a failing resolver (backend down) does NOT abort — render still resolves', async () => {
    (globalThis as any).__fluixi_iso_states__ = new Map();
    register('ok', () => 'fine');
    (globalThis as any).__fluixi_iso_states__.set('boom', {
      server: () => Promise.reject(new Error('backend down')),
      set: () => {},
    });
    // preload swallows the rejection…
    await expect(preloadServerState({ url: '/' })).resolves.toBeUndefined();
    // …and a render that depends on the registry still produces output.
    const App = () => {
      const div = createNativeElement('div') as any;
      insert(div, () => 'still here', null);
      return div;
    };
    const html = await renderRequestAsync(App, { url: '/' });
    expect(html).toContain('still here');
  });
});

describe('@fluixi/server — streaming SSR resilience', () => {
  it('renderToBodyStream degrades to an empty body (no stream error) when the render throws', async () => {
    const { renderToBodyStream } = await import('./index.js');
    const Boom = () => {
      throw new Error('render blew up (e.g. a rejected resource on a dead backend)');
    };
    const stream = renderToBodyStream(Boom as any, { url: '/' });
    // Must NOT reject/error the stream — it closes cleanly so the client renders CSR.
    const reader = stream.getReader();
    let errored = false;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      errored = true;
    }
    expect(errored).toBe(false);
  });
});
