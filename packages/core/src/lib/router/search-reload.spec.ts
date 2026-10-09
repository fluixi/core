// @vitest-environment jsdom
/**
 * A navigation that changes only the query string: a loader that read the location loads
 * again for the new one; a loader that never looked at it is left alone.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComponent, insert, render } from '@fluixi/dom';
import { createMemo, createRoot, setResourceIdSource, setServerDataGetter } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, useNavigate, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());
afterEach(() => {
  setResourceIdSource(null);
  setServerDataGetter(null);
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const text = (tag: string, value: () => string) => {
  const node = document.createElement(tag);
  insert(node, value);
  return node;
};

type Args = { location: unknown };
const searchOf = (args: Args) =>
  new URLSearchParams(((typeof args.location === 'function' ? (args.location as () => { search: string })() : args.location) as { search: string }).search).get('q') ?? '';

describe('a query-only navigation', () => {
  it('loads a layer again when its loader read the location, and only that layer', async () => {
    const searched: string[] = [];
    let layoutLoads = 0;
    let go!: (to: string) => void;
    const Layout = () => {
      go = useNavigate();
      return Outlet();
    };
    const Users = () => {
      const data = useRouteData<string>();
      return text('p', () => `users ${data() ?? ''}`);
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        data: () => (layoutLoads++, Promise.resolve('shell')),
        children: [
          {
            path: '/users',
            component: Users,
            data: (args: Args) => {
              const q = searchOf(args);
              searched.push(q);
              return Promise.resolve(q || 'all');
            },
          },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/users') } as never)), container));
    await wait(30);
    expect(container.textContent).toBe('users all');

    go('/users?q=ada');
    await wait(30);
    expect(searched).toEqual(['', 'ada']);
    expect(container.textContent).toBe('users ada');
    // The layout's loader never read the location: the query is none of its business.
    expect(layoutLoads).toBe(1);

    // Only the hash moved: nothing to load.
    go('/users?q=ada#top');
    await wait(30);
    expect(searched).toEqual(['', 'ada']);
  });

  it('loads a page hydrated from the server again, though its loader never ran here', async () => {
    // The server rendered the page and sent its data: on the client the loader has not run,
    // so nothing has seen it read the location yet.
    let id = 0;
    setResourceIdSource(() => `r${id++}`);
    const seeded: Record<string, string> = { r0: 'all' };
    setServerDataGetter((key) => (key in seeded ? { value: seeded[key] } : undefined));
    const searched: string[] = [];
    let go!: (to: string) => void;
    const Users = () => {
      go = useNavigate();
      const data = useRouteData<string>();
      return text('p', () => `users ${data() ?? ''}`);
    };
    const routes = [
      {
        path: '/users',
        component: Users,
        data: (args: Args) => {
          const q = searchOf(args);
          searched.push(q);
          return Promise.resolve(q || 'all');
        },
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/users') } as never)), container));
    await wait(30);
    expect(searched).toEqual([]);
    expect(container.textContent).toBe('users all');

    go('/users?q=ada');
    await wait(30);
    expect(searched).toEqual(['ada']);
    expect(container.textContent).toBe('users ada');
  });
});
