// @vitest-environment jsdom
/** The window's scroll across client navigations, as a full page load would leave it. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Router, createBrowserHistory, useNavigate, useRouteData } from './index.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
// The router scrolls a frame after the page is shown.
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const text = (tag: string, value: unknown, id?: string) => {
  const node = createNativeElement(tag);
  if (id) node.id = id;
  insert(node, value as never);
  return node;
};

describe('scroll across navigations', () => {
  let y = 0;
  let go!: (to: string, options?: { replace?: boolean }) => void;
  let finish!: (value: string) => void;
  let dispose!: () => void;
  const intoView = vi.fn();

  beforeEach(() => {
    ensureIntegration();
    sessionStorage.clear();
    history.replaceState(null, '', '/a');
    y = 0;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
    window.scrollTo = ((options: ScrollToOptions) => (y = options.top ?? y)) as typeof window.scrollTo;
    Element.prototype.scrollIntoView = intoView;
    intoView.mockClear();
    const A = () => {
      go = useNavigate();
      return text('h1', 'A');
    };
    const B = () => text('h1', () => `B ${useRouteData<string>()()}`);
    const C = () => text('h2', 'Section', 'part');
    const routes = [
      { path: '/a', component: A },
      { path: '/b', component: B, data: () => new Promise<string>((resolve) => (finish = resolve)) },
      { path: '/c', component: C },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    dispose = createRoot((done) => {
      const view = createMemo(() => createComponent(Router, { routes, history: createBrowserHistory() } as never));
      render(view, container);
      return () => (done(), container.remove());
    });
  });
  afterEach(() => dispose());

  it('starts a new page at the top once it is shown, and back returns to where the reader was', async () => {
    await tick();
    y = 640;
    go('/b');
    await frame();
    // B is still loading, A is on screen: the reader stays where they are.
    expect(y).toBe(640);
    finish('ready');
    await frame();
    expect(y).toBe(0);

    y = 120;
    history.back();
    await new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    await frame();
    expect(location.pathname).toBe('/a');
    expect(y).toBe(640);
  });

  it('lands on the #hash a new page names', async () => {
    await tick();
    y = 300;
    go('/c#part');
    await frame();
    expect(intoView).toHaveBeenCalledTimes(1);
    expect((intoView.mock.contexts[0] as Element).id).toBe('part');
  });

  it('leaves the reader in place for a replace on the same page', async () => {
    await tick();
    y = 450;
    go('/a?sort=name', { replace: true });
    await frame();
    expect(y).toBe(450);
  });
});
