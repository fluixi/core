// @vitest-environment jsdom
/** Each client navigation told to screen readers, as a page load would be. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Router, announce, createBrowserHistory, useNavigate, type AnnounceOptions } from './index.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
// The router announces a frame after the page is shown, as it scrolls.
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const node = (tag: string, children: unknown[]) => {
  const el = createNativeElement(tag);
  for (const child of children) insert(el, child as never);
  return el;
};
const region = () => document.querySelector('fluixi-route-announcer')?.shadowRoot?.querySelector('[aria-live]');

describe('route announcer', () => {
  let go!: (to: string) => void;
  let dispose!: () => void;

  const mount = (announceOption?: boolean | AnnounceOptions) => {
    const A = () => {
      go = useNavigate();
      return node('main', [node('h1', ['Home'])]);
    };
    const B = () => node('main', [node('h1', ['Orders'])]);
    const C = () => {
      document.title = 'Settings · Shop';
      return node('main', [node('p', ['no heading'])]);
    };
    const D = () => node('div', []);
    const E = () => {
      announce('Search results: 12 orders');
      return node('main', [node('h1', ['Search'])]);
    };
    const routes = [
      { path: '/a', component: A },
      { path: '/b', component: B },
      { path: '/c', component: C },
      { path: '/d', component: D },
      { path: '/e', component: E },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    dispose = createRoot((done) => {
      const props = { routes, history: createBrowserHistory(), ...(announceOption === undefined ? {} : { announce: announceOption }) };
      render(createMemo(() => createComponent(Router, props as never)), container);
      return () => (done(), container.remove());
    });
  };

  beforeEach(() => {
    ensureIntegration();
    history.replaceState(null, '', '/a');
    document.title = 'Shop';
  });
  afterEach(() => dispose());

  it('is a live region in its own host, outside the app, silent on the first page', async () => {
    mount();
    await frame();
    const host = document.querySelector('fluixi-route-announcer')!;
    expect(host.parentElement).toBe(document.body);
    expect(region()!.getAttribute('aria-live')).toBe('assertive');
    expect(region()!.textContent).toBe('');
  });

  it('announces the first h1, then a changed title, then the path', async () => {
    mount();
    await tick();
    go('/b');
    await frame();
    expect(region()!.textContent).toBe('Orders');
    go('/c');
    await frame();
    expect(region()!.textContent).toBe('Settings · Shop');
    document.title = 'Settings · Shop';
    go('/d');
    await frame();
    expect(region()!.textContent).toBe('/d');
  });

  it('moves focus to main, and not on a query change on the same page', async () => {
    mount();
    await tick();
    go('/b');
    await frame();
    const main = document.querySelector('main')!;
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');

    (document.activeElement as HTMLElement).blur();
    region()!.textContent = '';
    go('/b?tab=2');
    await frame();
    expect(region()!.textContent).toBe('');
    expect(document.activeElement).not.toBe(document.querySelector('main'));
  });

  it('says what a page asks for instead of its heading', async () => {
    mount();
    await tick();
    go('/e');
    await frame();
    expect(region()!.textContent).toBe('Search results: 12 orders');
    announce('Saved');
    expect(region()!.textContent).toBe('Saved');
  });

  it('can keep focus where it is, or be turned off', async () => {
    mount({ focus: false });
    await tick();
    go('/b');
    await frame();
    expect(region()!.textContent).toBe('Orders');
    expect(document.activeElement).toBe(document.body);
    dispose();

    history.replaceState(null, '', '/a');
    mount(false);
    await tick();
    expect(document.querySelector('fluixi-route-announcer')).toBeNull();
  });
});
