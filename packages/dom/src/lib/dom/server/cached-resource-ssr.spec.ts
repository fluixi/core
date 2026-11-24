import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { cachedResource } from '@fluixi/reactive/cached-resource';
import { createMemo } from '@fluixi/reactive/signal';
import { renderToStringAsync, createNativeElement, insert, createComponent, registerCreateComponent, setRequestStore, type Children } from '@fluixi/dom';

beforeAll(() => {
  registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
  // What @fluixi/server injects: without it two async renders share one request context.
  setRequestStore(new AsyncLocalStorage() as never);
});
afterAll(() => setRequestStore(null));

const el = (tag: string, child: Children) => {
  const node = createNativeElement(tag) as any;
  insert(node, child, null);
  return node;
};

describe('cachedResource during server renders', () => {
  it('keeps each request to its own entries, even when they run at once', async () => {
    let calls = 0;
    const app = (user: string) => () =>
      createMemo(() =>
        createComponent((() => {
          const me = cachedResource(async () => {
            calls++;
            await new Promise((r) => setTimeout(r, user === 'ann' ? 20 : 0));
            return user;
          }, { name: 'me' });
          return el('p', () => me());
        }) as any, {} as any),
      );
    const [ann, bob] = await Promise.all([
      renderToStringAsync(app('ann'), { hydrationKeys: false }),
      renderToStringAsync(app('bob'), { hydrationKeys: false }),
    ]);
    expect(ann).toContain('<p>ann</p>');
    expect(bob).toContain('<p>bob</p>');
    expect(calls).toBe(2);
  });
});
