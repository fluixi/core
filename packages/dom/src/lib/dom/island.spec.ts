import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createSignal, createResource, flush } from '@fluixi/reactive/signal';
import {
  createNativeElement,
  insert,
  renderToString,
  renderToStringAsync,
  setRequestStore,
  Island,
  hydrateIslands,
} from '@fluixi/dom';

// Async SSR (renderToStringAsync) needs the request context to survive awaits so
// resolved resource data routes to the right request — inject the ALS store the
// way @fluixi/server does in production.
beforeAll(() => setRequestStore(new AsyncLocalStorage()));
afterAll(() => setRequestStore(null));

const Counter = (props: { start?: number }) => {
  const [n, setN] = createSignal(props.start ?? 0);
  const b = createNativeElement('button') as any;
  insert(b, () => n(), null);
  if (typeof b.addEventListener === 'function') b.addEventListener('click', () => setN(n() + 1));
  return b;
};

describe('Island', () => {
  it('server: wraps the component in a <fluixi-island> boundary with name + serialized props', () => {
    const html = renderToString(() => Island({ name: 'Counter', component: Counter, props: { start: 5 } }));
    expect(html).toContain('<fluixi-island');
    expect(html).toContain('name="Counter"');
    expect(html).toContain('&quot;start&quot;:5'); // props JSON, attr-escaped
    expect(html).toContain('>5</button>');          // static content server-rendered
  });

  it('client: hydrateIslands hydrates only the island subtree in place + it stays interactive', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => Island({ name: 'Counter', component: Counter, props: { start: 5 } }));
    container.insertAdjacentHTML('afterbegin', '<header>static</header>');

    const before = container.querySelector('fluixi-island button')!;
    hydrateIslands({ Counter });

    const btn = container.querySelector('fluixi-island button') as HTMLButtonElement;
    expect(btn).toBe(before);          // reused the server node (hydrated, not recreated)
    expect(btn.textContent).toBe('5');
    btn.click();
    await flush();
    expect(btn.textContent).toBe('6'); // reactive after hydration
    expect(container.querySelector('header')!.textContent).toBe('static'); // rest untouched
  });

  it('per-island resource seeding: each island seeds its own data, no refetch, no cross-talk', async () => {
    // Count fetches per key so we can prove the client doesn't refetch a seeded island.
    const fetches: Record<string, number> = {};
    // One component used by two islands with different props/data.
    const Widget = (props: { k: string; v: string }) => {
      const [data] = createResource(() => {
        fetches[props.k] = (fetches[props.k] ?? 0) + 1;
        return Promise.resolve(props.v);
      });
      const el = createNativeElement('span') as any;
      insert(el, () => (data.loading ? '...' : (data.latest ?? '')), null);
      return el;
    };
    const Page = () => [
      Island({ name: 'W', component: Widget, props: { k: 'a', v: 'Alpha' } }),
      Island({ name: 'W', component: Widget, props: { k: 'b', v: 'Beta' } }),
    ];

    // Server: async render resolves both resources and serializes their data.
    const html = await renderToStringAsync(Page);
    expect(fetches).toEqual({ a: 1, b: 1 }); // each fetched once on the server
    expect(html).toContain('>Alpha</span>');
    expect(html).toContain('>Beta</span>');

    // Extract the seeded data the server emitted and expose it like a real page would.
    const m = html.match(/<script type="application\/json" id="__FX_DATA__">(\{.*?\})<\/script>/);
    expect(m).toBeTruthy();
    const seeded = JSON.parse(m![1]);
    // Namespaced per island instance (render order), counter restarts per island.
    expect(seeded).toEqual({ 'W#0:r0': 'Alpha', 'W#1:r0': 'Beta' });
    (window as any).__FX_DATA__ = seeded;

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html.replace(/<script[^>]*>.*?<\/script>/g, '');

    hydrateIslands({ W: Widget });
    await flush();

    const spans = container.querySelectorAll('fluixi-island span');
    expect(spans[0].textContent).toBe('Alpha'); // first island seeded its OWN data
    expect(spans[1].textContent).toBe('Beta');  // second island seeded its OWN data
    // No refetch on the client — counts unchanged from the server render.
    expect(fetches).toEqual({ a: 1, b: 1 });

    delete (window as any).__FX_DATA__;
  });

  it('client: leaves an unknown island static (no throw)', () => {
    const c = document.createElement('div');
    c.innerHTML = `<fluixi-island name="Nope" props="{}"><span>x</span></fluixi-island>`;
    document.body.appendChild(c);
    expect(() => hydrateIslands({})).not.toThrow();
    expect(c.querySelector('fluixi-island span')!.textContent).toBe('x');
  });
});
