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
