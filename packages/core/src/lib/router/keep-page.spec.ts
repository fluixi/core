// @vitest-environment jsdom
/** A navigation keeps the current page on screen until the next route's data has loaded. */
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Router, createMemoryHistory, useNavigate, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());

const tick = () => new Promise((r) => setTimeout(r, 0));
const text = (tag: string, value: unknown) => {
  const node = createNativeElement(tag);
  insert(node, value as never);
  return node;
};

describe('a navigation to a route with data', () => {
  it('keeps the current page until the data arrives, then swaps', async () => {
    let finish!: (value: string) => void;
    let go!: (to: string) => void;
    const Home = () => {
      go = useNavigate();
      return text('h1', 'Home');
    };
    const Report = () => {
      const data = useRouteData<string>();
      return text('h1', () => `Report ${data()}`);
    };
    const routes = [
      { path: '/', component: Home },
      { path: '/report', component: Report, data: () => new Promise<string>((resolve) => (finish = resolve)) },
    ];
    const container = document.createElement('div');
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never));
      render(view, container);
    });
    await tick();
    expect(container.textContent).toBe('Home');

    go('/report');
    await tick();
    expect(container.textContent).toBe('Home');

    finish('ready');
    await tick();
    expect(container.textContent).toBe('Report ready');
  });
});

describe('a navigation that changes only the params', () => {
  it('loads the route data again for the new params, on the page already mounted', async () => {
    const pending = new Map<string, (value: string) => void>();
    let go!: (to: string) => void;
    let mounts = 0;
    const Doc = () => {
      mounts++;
      go = useNavigate();
      const data = useRouteData<string>();
      return text('h1', () => `Doc ${data()}`);
    };
    const routes = [
      {
        path: '/doc/:slug',
        component: Doc,
        data: ({ params }: { params: () => Record<string, string> }) =>
          new Promise<string>((resolve) => pending.set(params().slug!, resolve)),
      },
    ];
    const container = document.createElement('div');
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/doc/a') } as never));
      render(view, container);
    });
    await tick();
    pending.get('a')!('a');
    await tick();
    expect(container.textContent).toBe('Doc a');

    go('/doc/b');
    await tick();
    // The page keeps its data until the new data arrives.
    expect(container.textContent).toBe('Doc a');
    pending.get('b')!('b');
    await tick();
    expect(container.textContent).toBe('Doc b');
    expect(mounts).toBe(1);
  });
});

describe('a navigation to another route', () => {
  it('does not load the leaving page again with the next route\'s params', async () => {
    const calls: string[] = [];
    let go!: (to: string) => void;
    let finish!: (value: string) => void;
    const Doc = () => {
      go = useNavigate();
      const data = useRouteData<string>();
      return text('h1', () => `Doc ${data()}`);
    };
    const User = () => text('h1', () => `User ${useRouteData<string>()()}`);
    const routes = [
      { path: '/doc/:slug', component: Doc, data: ({ params }: { params: () => Record<string, string> }) => (calls.push(`doc ${params().slug}`), Promise.resolve(params().slug!)) },
      { path: '/user/:id', component: User, data: () => new Promise<string>((resolve) => (finish = resolve)) },
    ];
    const container = document.createElement('div');
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/doc/a') } as never));
      render(view, container);
    });
    await tick();
    go('/user/7');
    await tick();
    expect(container.textContent).toBe('Doc a');
    finish('7');
    await tick();
    expect(container.textContent).toBe('User 7');
    expect(calls).toEqual(['doc a']);
  });
});
