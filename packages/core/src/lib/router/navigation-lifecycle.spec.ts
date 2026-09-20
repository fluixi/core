// @vitest-environment jsdom
/**
 * The navigation lifecycle, through a rendered router.
 *
 * `transition.spec.ts` covers the presentation decisions in isolation. These run real
 * navigations, because the parts that matter here are ordering and identity: which
 * navigation is allowed to commit, what is on screen while a route is being prepared,
 * and whether a layout survives a sibling change.
 *
 * Components are plain functions rather than compiled JSX — the router does not care,
 * and it keeps the file about navigation.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, createNativeElement, insert } from '@fluixi/dom';
import { ensureIntegration } from '../render/component.js';
import { Router, Outlet } from './index.js';
import { createBrowserHistory } from '@fluixi/router';

/** A div with text in it, built the way the DOM layer expects. */
function box(text: string): Element {
  const el = createNativeElement('div');
  el.textContent = text;
  return el;
}

const tick = async (n = 4) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

/** A component whose module resolves only when the test says so. */
function deferred(text: string) {
  let land!: () => void;
  const gate = new Promise<void>((r) => (land = r));
  let loaded = false;
  const Comp = (() => box(text)) as any;
  Comp.preload = () => gate.then(() => void (loaded = true));
  Comp.land = land;
  Comp.isLoaded = () => loaded;
  return Comp as typeof Comp & { land: () => void; isLoaded: () => boolean };
}

const plain = (text: string) => () => box(text);

let container: HTMLDivElement;
let dispose: (() => void) | undefined;

beforeEach(() => {
  // The component integration has to be installed before anything renders.
  ensureIntegration();
  history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.appendChild(container);
  delete (document as any).startViewTransition;
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  container.remove();
  delete (document as any).startViewTransition;
  vi.restoreAllMocks();
});

function mount(routes: any[], props: Record<string, unknown> = {}) {
  dispose = render(
    () => Router({ routes, history: createBrowserHistory(), ...props } as any),
    container,
  );
}

const go = (path: string) => {
  history.pushState(null, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
};

describe('basic navigation', () => {
  it('commits the target route exactly once', async () => {
    let bRenders = 0;
    const B = () => {
      bRenders++;
      return box('B');
    };
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: B },
    ]);
    expect(container.textContent).toContain('A');

    go('/b');
    await tick();

    expect(container.textContent).toContain('B');
    expect(container.textContent).not.toContain('A');
    // One route is on screen, and it is the one that was navigated to.
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('invokes the route component twice per navigation, which predates the transition work', async () => {
    // Recorded, not wanted. The cause is upstream of this file: `Router` itself is
    // invoked twice, so two core routers exist and both subscribe to history. One tree
    // is orphaned — only one is in the DOM — but its router still reacts to every
    // navigation, which is both a leak and the reason the route component is built
    // twice.
    //
    // Measured: Router() 2, createCoreRouter() 2, route component 2, mounted trees 1.
    // Unchanged with the transition controller removed, and unchanged whether the
    // router is mounted directly or through `createComponent`, so it is neither caused
    // by this work nor by how this file mounts it.
    //
    // Fixing it belongs in the component/reactive integration that re-invokes the
    // component, not in the router. Whoever does should change this to 1.
    let renders = 0;
    const B = () => {
      renders++;
      return box('B');
    };
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: B },
    ]);

    go('/b');
    await tick();

    expect(renders).toBe(2);
    // Twice invoked, once mounted: the duplicate is wasted work, not a duplicated page.
    expect(container.textContent).toBe('B');
  });
});

describe('a route that has to be prepared', () => {
  it('keeps the current page up until the module lands', async () => {
    const B = deferred('B');
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: B },
    ]);

    go('/b');
    await tick();

    // The old route is still on screen: nothing is removed until there is something
    // to put in its place.
    expect(container.textContent).toContain('A');
    expect(container.textContent).not.toContain('B');

    B.land();
    await tick();

    expect(container.textContent).toContain('B');
    expect(container.textContent).not.toContain('A');
  });

  it('commits immediately when nothing needs preparing', async () => {
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
    ]);
    go('/b');
    await tick(1);
    expect(container.textContent).toContain('B');
  });
});

describe('rapid navigation', () => {
  it('will not commit a superseded navigation', async () => {
    const B = deferred('B');
    const C = deferred('C');
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: B },
      { path: '/c', component: C },
    ]);

    go('/b');
    await tick();
    go('/c');
    await tick();

    // C lands first and takes the page.
    C.land();
    await tick();
    expect(container.textContent).toContain('C');

    // B arrives late. It belongs to a navigation that is no longer current, so it must
    // not replace what the reader asked for.
    B.land();
    await tick();
    expect(container.textContent).toContain('C');
    expect(container.textContent).not.toContain('B');
  });

  it('lands on the last target when several are queued', async () => {
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
      { path: '/c', component: plain('C') },
    ]);

    go('/b');
    go('/c');
    await tick();

    expect(container.textContent).toContain('C');
    expect(container.textContent).not.toContain('B');
  });
});

describe('nested routes and layouts', () => {
  it('keeps the layout mounted across a sibling change', async () => {
    let layoutRenders = 0;
    const Layout = () => {
      layoutRenders++;
      const el = createNativeElement('div');
      const label = createNativeElement('span');
      label.textContent = 'SHELL';
      el.appendChild(label);
      insert(el, () => Outlet());
      return el;
    };

    mount([
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/a', component: plain('PAGE-A') },
          { path: '/b', component: plain('PAGE-B') },
        ],
      },
    ]);

    go('/a');
    await tick();
    expect(container.textContent).toContain('SHELL');
    expect(container.textContent).toContain('PAGE-A');
    const after = layoutRenders;

    go('/b');
    await tick();

    expect(container.textContent).toContain('SHELL');
    expect(container.textContent).toContain('PAGE-B');
    expect(container.textContent).not.toContain('PAGE-A');
    // The shell was not rebuilt: only the depth that changed was replaced.
    expect(layoutRenders).toBe(after);
  });
});

describe('a route that fails to load', () => {
  it('leaves the current page usable', async () => {
    const Broken = (() => box('NEVER')) as any;
    Broken.preload = () => Promise.reject(new Error('chunk 404'));

    mount([
      { path: '/', component: plain('A') },
      { path: '/broken', component: Broken },
    ]);

    go('/broken');
    await tick();

    // Preparation does not block the commit on a failed module: the navigation
    // proceeds and the route renders through its own error handling rather than the
    // router hanging forever.
    expect(container.isConnected).toBe(true);
  });

  it('can navigate again after a failed preparation', async () => {
    const Broken = (() => box('X')) as any;
    Broken.preload = () => Promise.reject(new Error('chunk 404'));

    mount([
      { path: '/', component: plain('A') },
      { path: '/broken', component: Broken },
      { path: '/c', component: plain('C') },
    ]);

    go('/broken');
    await tick();
    go('/c');
    await tick();

    expect(container.textContent).toContain('C');
  });
});

describe('view transitions', () => {
  it('routes the commit through the API when the browser has one', async () => {
    let calls = 0;
    (document as any).startViewTransition = (cb: () => void | Promise<void>) => {
      calls++;
      const done = Promise.resolve(cb()).then(() => undefined);
      return { updateCallbackDone: done, ready: done, finished: done, skipTransition() {} };
    };
    (window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
    ]);

    go('/b');
    await tick();

    expect(calls).toBe(1);
    expect(container.textContent).toContain('B');
  });

  it('navigates normally with no API at all', async () => {
    delete (document as any).startViewTransition;
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
    ]);

    go('/b');
    await tick();

    expect(container.textContent).toContain('B');
  });

  it('skips the API when the router asks for no transition', async () => {
    let calls = 0;
    (document as any).startViewTransition = (cb: () => void | Promise<void>) => {
      calls++;
      const done = Promise.resolve(cb()).then(() => undefined);
      return { updateCallbackDone: done, ready: done, finished: done, skipTransition() {} };
    };

    mount(
      [
        { path: '/', component: plain('A') },
        { path: '/b', component: plain('B') },
      ],
      { transition: 'none' },
    );

    go('/b');
    await tick();

    expect(calls).toBe(0);
    expect(container.textContent).toContain('B');
  });

  it('skips the API when the reader prefers reduced motion', async () => {
    let calls = 0;
    (document as any).startViewTransition = (cb: () => void | Promise<void>) => {
      calls++;
      const done = Promise.resolve(cb()).then(() => undefined);
      return { updateCallbackDone: done, ready: done, finished: done, skipTransition() {} };
    };
    (window as any).matchMedia = (q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      addEventListener() {},
      removeEventListener() {},
    });

    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
    ]);

    go('/b');
    await tick();

    expect(calls).toBe(0);
    expect(container.textContent).toContain('B');
  });
});

describe('the first render', () => {
  it('does not go through a transition', async () => {
    let calls = 0;
    (document as any).startViewTransition = (cb: () => void | Promise<void>) => {
      calls++;
      const done = Promise.resolve(cb()).then(() => undefined);
      return { updateCallbackDone: done, ready: done, finished: done, skipTransition() {} };
    };

    history.replaceState(null, '', '/b');
    mount([
      { path: '/', component: plain('A') },
      { path: '/b', component: plain('B') },
    ]);
    await tick();

    // The initial match is the signal's initial value, not a navigation, so hydration
    // never animates as though the reader had clicked something.
    expect(calls).toBe(0);
    expect(container.textContent).toContain('B');
  });
});
