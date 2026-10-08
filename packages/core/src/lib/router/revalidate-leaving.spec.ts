// @vitest-environment jsdom
/**
 * A revalidation while a page is on its way out: the page keeps its data, and its loader is
 * not run again with the params of the page replacing it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponent, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { revalidate } from './data.js';
import { Router, createMemoryHistory, useNavigate, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('revalidating while a page is replaced', () => {
  it("does not load the leaving page again with the next page's params", async () => {
    const loaded: (string | undefined)[] = [];
    let go!: (to: string) => void;
    const Item = () => {
      go = useNavigate();
      const data = useRouteData<string>();
      return () => `item ${data() ?? ''}`;
    };
    const List = () => {
      const data = useRouteData<string>();
      return () => `list ${data() ?? ''}`;
    };
    const paramsOf = (args: { params: unknown }) =>
      (typeof args.params === 'function' ? (args.params as () => Record<string, string>)() : args.params) as Record<string, string>;
    const routes = [
      {
        path: '/items/:id',
        component: Item,
        data: (args: { params: unknown }) => {
          const id = paramsOf(args).id;
          loaded.push(id);
          return Promise.resolve(id);
        },
      },
      // The list takes a moment, so the item stays on screen while it loads.
      { path: '/items', component: List, data: () => wait(60).then(() => 'all') },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/items/7') } as never)), container));
    await wait(30);
    expect(container.textContent).toBe('item 7');

    go('/items');
    // An action finished meanwhile and dropped some cached data.
    revalidate('something');
    await wait(150);

    expect(loaded).toEqual(['7']);
    expect(container.textContent).toBe('list all');
  });

  it('gives a load the params it started with, even when it reads them late', async () => {
    // A lazy route reads its params once its module has loaded. A reload started just before
    // a navigation then read the next page's params.
    const loaded: (string | undefined)[] = [];
    let go!: (to: string) => void;
    const Item = () => {
      go = useNavigate();
      const data = useRouteData<string>();
      return () => `item ${data() ?? ''}`;
    };
    const paramsOf = (args: { params: unknown }) =>
      (typeof args.params === 'function' ? (args.params as () => Record<string, string>)() : args.params) as Record<string, string>;
    const routes = [
      {
        path: '/items/:id',
        component: Item,
        data: (args: { params: unknown }) =>
          Promise.resolve().then(() => {
            const id = paramsOf(args).id;
            loaded.push(id);
            return id;
          }),
      },
      { path: '/items', component: () => 'list', data: () => wait(60).then(() => 'all') },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/items/7') } as never)), container));
    await wait(30);

    revalidate('something');
    go('/items');
    await wait(150);

    expect(loaded).toEqual(['7', '7']);
  });
});
