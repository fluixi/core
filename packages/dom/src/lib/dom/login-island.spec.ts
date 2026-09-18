// "Test island hydration on the login page", a login form as an <Island>: the static page
// is server-rendered, only the form hydrates, and a value that must be fetched SERVER-side
// (e.g. behind an API key) is read by a resource inside the island -> seeded into __FX_DATA__
// and reused on the client with NO refetch, while the form stays interactive.
//
// Own spec file so vitest isolates it: the island resource-transport id counter is
// module-global, so sharing a file with other island renders would offset the ids.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createSignal, createResource, flush } from '@fluixi/reactive/signal';
import {
  createNativeElement,
  insert,
  renderToStringAsync,
  setRequestStore,
  Island,
  hydrateIslands,
} from '@fluixi/dom';

beforeAll(() => setRequestStore(new AsyncLocalStorage()));
afterAll(() => setRequestStore(null));

describe('login-form island', () => {
  it('server-seeded data + interactive after hydration, no client refetch', async () => {
    let serverConfigFetches = 0;
    const LoginForm = (_props: { brand?: string }) => {
      const [email, setEmail] = createSignal('');
      // The "API-key" data: fetched once on the server, seeded for the client.
      const [cfg] = createResource(() => {
        serverConfigFetches++;
        return Promise.resolve({ domain: 'leuzma.com' });
      });

      const form = createNativeElement('form') as any;
      const input = createNativeElement('input') as any;
      if (typeof input.addEventListener === 'function')
        input.addEventListener('input', (e: any) => setEmail(e.target.value));
      const echo = createNativeElement('p') as any;
      insert(echo, () => email(), null);
      const hint = createNativeElement('small') as any;
      insert(hint, () => (cfg.loading ? '...' : `@${cfg.latest?.domain ?? ''}`), null);
      insert(form, input, null);
      insert(form, echo, null);
      insert(form, hint, null);
      return form;
    };

    // Server: render the page with the form as an island; its resource resolves + serializes.
    const Page = () => Island({ name: 'LoginForm', component: LoginForm, props: { brand: 'Leuzma' } });
    const html = await renderToStringAsync(Page);
    expect(serverConfigFetches).toBe(1); // fetched once, on the server
    expect(html).toContain('name="LoginForm"');
    expect(html).toContain('@leuzma.com'); // seeded value server-rendered

    const m = html.match(/<script type="application\/json" id="__FX_DATA__">(\{.*?\})<\/script>/);
    const seeded = JSON.parse(m![1]);
    expect(seeded).toEqual({ 'LoginForm#0:r0': { domain: 'leuzma.com' } });
    (window as any).__FX_DATA__ = seeded;

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html.replace(/<script[^>]*>.*?<\/script>/g, '');

    hydrateIslands({ LoginForm });
    await flush();

    const input = container.querySelector('fluixi-island input') as HTMLInputElement;
    const echo = container.querySelector('fluixi-island p') as HTMLParagraphElement;
    expect(serverConfigFetches).toBe(1); // NOT refetched on the client (seeded)
    expect(container.querySelector('fluixi-island small')!.textContent).toBe('@leuzma.com');

    input.value = 'ada@leuzma.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(echo.textContent).toBe('ada@leuzma.com'); // interactive after hydration

    delete (window as any).__FX_DATA__;
  });
});
