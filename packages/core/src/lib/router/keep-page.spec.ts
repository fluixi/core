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
