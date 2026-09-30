// @vitest-environment jsdom
/** `useIsRouting` covers a navigation from its start until the new route's data has loaded. */
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponent, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Router, createMemoryHistory, useIsRouting, useNavigate } from './index.js';

beforeEach(() => ensureIntegration());

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('useIsRouting', () => {
  it('is true while the next route loads its data, false once it has', async () => {
    let finish!: (value: string) => void;
    let routing!: () => boolean;
    let go!: (to: string) => void;

    const Home = () => {
      routing = useIsRouting();
      go = useNavigate();
      return null;
    };
    const Slow = () => null;
    const routes = [
      { path: '/', component: Home },
      { path: '/slow', component: Slow, data: () => new Promise<string>((resolve) => (finish = resolve)) },
    ];
    const container = document.createElement('div');
    // Mounted as startClient mounts an app: one memo around the component, so a change in
    // what it renders does not rebuild the router.
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never));
      render(view, container);
    });
    await tick();
    expect(routing()).toBe(false);

    go('/slow');
    await tick();
    expect(routing()).toBe(true);

    finish('done');
    await tick();
    expect(routing()).toBe(false);
  });

  it('with a delay, stays false for a navigation shorter than it', async () => {
    let finish!: (value: string) => void;
    let routing!: () => boolean;
    let go!: (to: string) => void;
    const Home = () => {
      routing = useIsRouting({ delay: 50 });
      go = useNavigate();
      return null;
    };
    const routes = [
      { path: '/', component: Home },
      { path: '/slow', component: () => null, data: () => new Promise<string>((resolve) => (finish = resolve)) },
    ];
    const container = document.createElement('div');
    createRoot(() => {
      const view = createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never));
      render(view, container);
    });
    await tick();

    go('/slow');
    await tick();
    expect(routing()).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(routing()).toBe(true);
    finish('done');
    await tick();
    expect(routing()).toBe(false);
  });
});
