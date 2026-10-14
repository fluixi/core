import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createNativeElement, insert } from '@fluixi/dom';
import {
  renderToString,
  setRequestStore,
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  getRequestEvent,
} from './index.js';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => setRequestStore(null)); // restore the default sync store

describe('request context: basic access', () => {
  it('exposes the request event to the app during render', () => {
    const html = renderToString(
      () => {
        const div = createNativeElement('div');
        insert(div, () => getRequestEvent()?.url ?? '', null);
        return div;
      },
      { hydrationKeys: false, event: { url: '/dashboard' } },
    );
    expect(html).toBe('<div>/dashboard</div>');
  });

  it('gives each render a fresh, independent context (sync)', () => {
    renderToString(() => {
      getRequestContext()!.routeData.set('hit', 1);
      return createNativeElement('div');
    }, { hydrationKeys: false });
    // a second render must not see the first render's routeData
    let leaked: unknown;
    renderToString(() => {
      leaked = getRequestContext()!.routeData.get('hit');
      return createNativeElement('div');
    }, { hydrationKeys: false });
    expect(leaked).toBeUndefined();
  });

  it('per-request id counter is monotonic and starts fresh each request', () => {
    const ids1 = renderToString(() => {
      const c = getRequestContext()!;
      return createTextHolder(`${c.nextId()},${c.nextId()}`);
    }, { hydrationKeys: false });
    const ids2 = renderToString(() => {
      const c = getRequestContext()!;
      return createTextHolder(`${c.nextId()}`);
    }, { hydrationKeys: false });
    expect(ids1).toBe('<i>s0,s1</i>');
    expect(ids2).toBe('<i>s0</i>'); // counter reset for the new request
  });
});

describe('request context: concurrency isolation (the P0 #4 fix)', () => {
  it('interleaved async renders do not bleed state when an ALS store is injected', async () => {
    setRequestStore(new AsyncLocalStorage());

    async function flow(tag: string, ms: number): Promise<string> {
      const ctx = createRequestContext({ url: `/${tag}` });
      return runWithRequestContext(ctx, async () => {
        getRequestContext()!.routeData.set('user', tag);
        await delay(ms); // yield, the other flow runs in between
        const seen = getRequestContext()!;
        return `${seen.event.url}:${seen.routeData.get('user')}:${seen.nextId()}`;
      });
    }

    const [a, b] = await Promise.all([flow('alice', 20), flow('bob', 5)]);
    expect(a).toBe('/alice:alice:s0');
    expect(b).toBe('/bob:bob:s0');
  });
});

function createTextHolder(s: string) {
  const el = createNativeElement('i');
  insert(el, s, null);
  return el;
}

describe('request context: one store across module copies', () => {
  // A server bundle inlines its own copy of this module while packages loaded from
  // node_modules (an auth library reading locals, say) use another. Both must see the
  // context the request runs in, as they already see the same locals bag.
  const twoCopies = async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const a = await import('./request-context.js');
    vi.resetModules();
    const b = await import('./request-context.js');
    return { a, b };
  };

  it('a context entered through one copy is the current one in the other', async () => {
    const { a, b } = await twoCopies();
    a.setRequestStore(new AsyncLocalStorage());
    const ctx = a.createRequestContext({ url: '/x' });
    const seen = await a.runWithRequestContext(ctx, async () => {
      await delay(1);
      return b.getRequestContext();
    });
    expect(seen).toBe(ctx);
    a.setRequestStore(null);
  });

  it('holds with the default synchronous store too', async () => {
    const { a, b } = await twoCopies();
    const ctx = a.createRequestContext({ url: '/y', locals: { auth: 'someone' } });
    expect(a.runWithRequestContext(ctx, () => b.getLocals())).toEqual({ auth: 'someone' });
  });
});

describe('request context: a second copy loading mid-request', () => {
  it('keeps the store already installed, so the running request keeps its context', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const a = await import('./request-context.js');
    a.setRequestStoreIfUnset(new AsyncLocalStorage());
    const ctx = a.createRequestContext({ url: '/z' });
    const seen = await a.runWithRequestContext(ctx, async () => {
      // What @fluixi/server does when another copy of it is first imported.
      vi.resetModules();
      const b = await import('./request-context.js');
      b.setRequestStoreIfUnset(new AsyncLocalStorage());
      await delay(1);
      return b.getRequestContext();
    });
    expect(seen).toBe(ctx);
    a.setRequestStore(null);
  });
});
