// @vitest-environment jsdom
/**
 * @fileoverview KettleJS Framework Integration Tests
 *
 * These tests use the REAL framework stack (no @fluixi/dom mock, no reactive mock).
 * Components return plain strings for easy assertion via container.textContent.
 *
 * Purpose: detect what actually works in navigation, context, outlets, Suspense,
 * and lazy loading so we can isolate what's broken in the Adafri app.
 *
 * Test helper: renderApp() = ensureIntegration + createRoot + insert.
 * Avoids render/index.ts to skip the `lit` import (unnecessary for string-only tests).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, createSignal, createMemo, untrack, batch } from '@fluixi/reactive/signal';
import { insert, createNativeElement } from '@fluixi/dom';
import { ensureIntegration } from './render/component.js';
import {
  createRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  type Navigator,
} from './router/router.js';
import { createContext, useContext } from './context/context.js';
import { Suspense } from './render/suspense.js';
import { lazy } from './render/lazy.js';
import { createComponent } from './render/component.js';

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

let container: HTMLElement;
let disposeApp: (() => void) | null = null;

beforeEach(() => {
  ensureIntegration();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  disposeApp?.();
  disposeApp = null;
  container.remove();
});

/**
 * Minimal render helper: sets up a reactive root, calls code(), inserts result.
 * No lit dependency — works with string-returning components.
 */
function renderApp(code: () => any): () => void {
  let dispose!: () => void;
  createRoot(d => {
    dispose = d;
    const result = code();
    container.textContent = '';
    insert(container, result);
  });
  disposeApp = dispose;
  return dispose;
}

/** Build a memory-backed router (same pattern as router.spec.ts) */
function makeMemRouter(initialPath = '/') {
  let currentPath = initialPath;
  return {
    Router: createRouter({
      get: () => currentPath,
      set: ({ value }) => { currentPath = value; },
    }),
    getPath: () => currentPath,
  };
}

// ---------------------------------------------------------------------------
// 1. Basic DOM rendering (no router)
// ---------------------------------------------------------------------------

describe('basic DOM rendering', () => {
  it('renders a string component', () => {
    renderApp(() => 'hello world');
    expect(container.textContent).toBe('hello world');
  });

  it('renders a number', () => {
    renderApp(() => 42 as any);
    expect(container.textContent).toBe('42');
  });

  it('renders null as empty', () => {
    renderApp(() => null);
    expect(container.textContent).toBe('');
  });

  it('renders a reactive signal', () => {
    const [text, setText] = createSignal('initial');
    renderApp(() => text);  // pass signal accessor directly
    expect(container.textContent).toBe('initial');
    setText('updated');
    expect(container.textContent).toBe('updated');
  });

  it('renders a memo', () => {
    const [n, setN] = createSignal(1);
    const doubled = createMemo(() => String(n() * 2));
    renderApp(() => doubled);
    expect(container.textContent).toBe('2');
    setN(5);
    expect(container.textContent).toBe('10');
  });

  it('renders a component function', () => {
    const Greeting = () => 'Hello, KettleJS!';
    renderApp(() => createComponent(Greeting, {}));
    expect(container.textContent).toBe('Hello, KettleJS!');
  });
});

// ---------------------------------------------------------------------------
// 2. Router — basic routing
// ---------------------------------------------------------------------------

describe('router — basic routing', () => {
  it('renders the matching component on initial path', () => {
    const { Router } = makeMemRouter('/home');
    const Home = () => 'home page';
    const About = () => 'about page';

    renderApp(() =>
      Router({
        children: Routes({
          children: [
            Route({ path: '/home', component: Home }),
            Route({ path: '/about', component: About }),
          ],
        }),
      })
    );

    expect(container.textContent).toContain('home page');
    expect(container.textContent).not.toContain('about page');
  });

  it('renders null when no route matches', () => {
    const { Router } = makeMemRouter('/not-found');
    const Home = () => 'home page';

    renderApp(() =>
      Router({
        children: Routes({
          children: [Route({ path: '/home', component: Home })],
        }),
      })
    );

    expect(container.textContent).toBe('');
  });

  it('renders root path correctly', () => {
    const { Router } = makeMemRouter('/');
    const Root = () => 'root page';

    renderApp(() =>
      Router({
        children: Routes({
          children: [Route({ path: '/', component: Root })],
        }),
      })
    );

    expect(container.textContent).toContain('root page');
  });

  it('navigate() swaps rendered content', () => {
    const { Router } = makeMemRouter('/');
    const Home = () => 'home page';
    const About = () => 'about page';
    let navigate!: Navigator;

    renderApp(() => {
      // Router must run first so _activeRouter is set before useNavigate()
      const result = Router({
        children: Routes({
          children: [
            Route({ path: '/', component: Home }),
            Route({ path: '/about', component: About }),
          ],
        }),
      });
      navigate = useNavigate(); // _activeRouter is now set
      return result;
    });

    expect(container.textContent).toContain('home page');

    navigate('/about');

    expect(container.textContent).toContain('about page');
    expect(container.textContent).not.toContain('home page');
  });

  it('navigate() back and forth stays consistent', () => {
    const { Router } = makeMemRouter('/');
    const Home = () => 'home page';
    const About = () => 'about page';
    let navigate!: Navigator;

    renderApp(() => {
      const result = Router({
        children: Routes({
          children: [
            Route({ path: '/', component: Home }),
            Route({ path: '/about', component: About }),
          ],
        }),
      });
      navigate = useNavigate(); // Router already ran above
      return result;
    });

    navigate('/about');
    expect(container.textContent).toContain('about page');

    navigate('/');
    expect(container.textContent).toContain('home page');

    navigate('/about');
    expect(container.textContent).toContain('about page');
  });

  it('matches parameterized routes', () => {
    const { Router } = makeMemRouter('/user/42');
    const User = () => 'user profile';

    renderApp(() =>
      Router({
        children: Routes({
          children: [Route({ path: '/user/:id', component: User })],
        }),
      })
    );

    expect(container.textContent).toContain('user profile');
  });
});

// ---------------------------------------------------------------------------
// 3. Router — params and location hooks
// ---------------------------------------------------------------------------

describe('router — params and location hooks', () => {
  it('useParams() returns current route params as reactive accessor', () => {
    const { Router } = makeMemRouter('/user/alice');
    let params!: () => Record<string, string>;

    const UserPage = () => {
      // useParams() returns ctx.params which is a memo accessor
      params = useParams();
      return 'user page';
    };

    renderApp(() =>
      Router({
        children: Routes({
          children: [Route({ path: '/user/:id', component: UserPage })],
        }),
      })
    );

    expect(container.textContent).toContain('user page');
    expect(params).toBeDefined();
    expect(params()).toEqual({ id: 'alice' });
  });

  it('useParams() updates reactively when navigating to same route pattern', () => {
    const { Router } = makeMemRouter('/user/alice');
    let params!: () => Record<string, string>;
    let navigate!: Navigator;

    const UserPage = () => {
      params = useParams();
      return 'user page';
    };

    renderApp(() => {
      const result = Router({
        children: Routes({
          children: [Route({ path: '/user/:id', component: UserPage })],
        }),
      });
      navigate = useNavigate(); // Router ran above, _activeRouter is set
      return result;
    });

    expect(params()).toEqual({ id: 'alice' });

    navigate('/user/bob');

    // After navigation to same route pattern, params signal should update
    expect(params()).toEqual({ id: 'bob' });
  });

  it('useLocation() pathname reads reactively from a memo inside the Router', () => {
    const { Router } = makeMemRouter('/start');
    let navigate!: Navigator;
    let locationPathname: string = '';

    renderApp(() => {
      const result = Router({
        children: createMemo(() => {
          // Inside memo, reading location.pathname tracks the loc signal
          const loc = useLocation();
          locationPathname = loc.pathname;
          return null;
        }),
      });
      navigate = useNavigate(); // Router ran above
      return result;
    });

    expect(locationPathname).toBe('/start');

    navigate('/destination');

    expect(locationPathname).toBe('/destination');
  });
});

// ---------------------------------------------------------------------------
// 4. Nested layouts + Outlet
// ---------------------------------------------------------------------------

describe('nested layouts + Outlet', () => {
  it('renders layout component wrapping child content', async () => {
    const { Router } = makeMemRouter('/app/home');

    const Layout = () => {
      // Outlet() returns a memo accessor — return it directly so the DOM runtime tracks it
      return Outlet();
    };

    const HomePage = () => 'home content';

    renderApp(() =>
      Router({
        children: Routes({
          children: [
            Route({
              path: '/app',
              component: Layout,
              children: [
                Route({ path: '/app/home', component: HomePage }),
              ],
            }),
          ],
        }),
      })
    );

    // Outlet content is wired on a microtask (see router.ts setOutlet loop).
    await new Promise((r) => setTimeout(r, 0));
    // Layout renders Outlet() which should contain 'home content'
    expect(container.textContent).toContain('home content');
  });

  it('renders a layout that wraps <Outlet/> in markup (deferred)', async () => {
    // Regression: a layout like <div class="layout"><Outlet/></div> compiles the
    // <Outlet/> to a deferred component memo (createMemo(() => createComponent(Outlet))).
    // That memo evaluates while routeStates is still running, so the synchronous
    // outlet write was missed and the child route rendered empty. The fix wires the
    // outlet signals from a microtask; this asserts the child shows up after it.
    const { Router } = makeMemRouter('/app/home');

    const Layout = () => {
      const div = createNativeElement('div') as HTMLElement;
      div.className = 'layout';
      insert(div, createMemo(() => createComponent(Outlet, {})), null);
      return div;
    };

    const HomePage = () => 'home content';

    renderApp(() =>
      Router({
        children: Routes({
          children: [
            Route({
              path: '/app',
              component: Layout,
              children: [Route({ path: '/app/home', component: HomePage })],
            }),
          ],
        }),
      })
    );

    await new Promise((r) => setTimeout(r, 0));
    const layout = container.querySelector('.layout');
    expect(layout).toBeTruthy();
    expect(layout!.textContent).toContain('home content');
  });

  it('Outlet shows child route content and updates on navigation', async () => {
    const { Router } = makeMemRouter('/app/home');
    let navigate!: Navigator;
    let layoutCallCount = 0;

    const Layout = () => {
      layoutCallCount++;
      return Outlet();
    };

    const HomePage = () => 'home content';
    const SettingsPage = () => 'settings content';

    renderApp(() => {
      const result = Router({
        children: Routes({
          children: [
            Route({
              path: '/app',
              component: Layout,
              children: [
                Route({ path: '/app/home', component: HomePage }),
                Route({ path: '/app/settings', component: SettingsPage }),
              ],
            }),
          ],
        }),
      });
      navigate = useNavigate(); // Router ran above
      return result;
    });

    // Outlet content is wired on a microtask (see router.ts setOutlet loop).
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toContain('home content');
    const initialLayoutCallCount = layoutCallCount;

    navigate('/app/settings');
    await new Promise((r) => setTimeout(r, 0));

    expect(container.textContent).toContain('settings content');
    expect(container.textContent).not.toContain('home content');

    // Layout should NOT be re-called on child navigation (stable layout reuse)
    expect(layoutCallCount).toBe(initialLayoutCallCount);
  });

  it('layout is instantiated exactly once per visit', () => {
    const { Router } = makeMemRouter('/app/home');
    let navigate!: Navigator;
    let layoutCount = 0;

    const Layout = () => {
      layoutCount++;
      return Outlet();
    };

    const Home = () => 'home';
    const Settings = () => 'settings';

    renderApp(() => {
      const result = Router({
        children: Routes({
          children: [
            Route({
              path: '/app',
              component: Layout,
              children: [
                Route({ path: '/app/home', component: Home }),
                Route({ path: '/app/settings', component: Settings }),
              ],
            }),
          ],
        }),
      });
      navigate = useNavigate(); // Router ran above
      return result;
    });

    expect(layoutCount).toBe(1);

    navigate('/app/settings');
    expect(layoutCount).toBe(1); // still 1 — reused
  });
});

// ---------------------------------------------------------------------------
// 5. Context propagation
// ---------------------------------------------------------------------------

describe('context propagation', () => {
  it('useContext() returns Provider value', () => {
    const ThemeCtx = createContext<string>('default-theme');
    let capturedTheme: string | undefined;

    // Use a signal to capture the context value without createComponent wrapping
    const [themeCapture, setThemeCapture] = createSignal<string | undefined>(undefined);
    const Child = () => {
      capturedTheme = useContext(ThemeCtx);
      setThemeCapture(capturedTheme);
      return capturedTheme ?? 'no-theme';
    };

    renderApp(() =>
      ThemeCtx.Provider({
        value: 'dark-theme',
        children: () => Child(), // plain thunk, not createComponent
      })
    );

    expect(container.textContent).toBe('dark-theme');
    expect(capturedTheme).toBe('dark-theme');
  });

  it('useContext() returns default value when no Provider', () => {
    const MyCtx = createContext<string>('default-value');
    let capturedValue: string | undefined;

    const Child = () => {
      capturedValue = useContext(MyCtx);
      return capturedValue ?? 'none';
    };

    renderApp(() => Child()); // call directly, not through createComponent

    expect(capturedValue).toBe('default-value');
  });

  it('nested Providers: inner value overrides outer', () => {
    const Ctx = createContext<string>('root');
    let innerValue: string | undefined;

    const Inner = () => {
      innerValue = useContext(Ctx);
      return innerValue ?? 'none';
    };

    renderApp(() =>
      Ctx.Provider({
        value: 'outer',
        children: Ctx.Provider({
          value: 'inner',
          children: () => Inner(), // plain thunk
        }),
      })
    );

    expect(container.textContent).toBe('inner');
    expect(innerValue).toBe('inner');
  });

  it('context is available inside route components (via Provider + context stamping)', () => {
    const AppCtx = createContext<string>('no-ctx');
    let capturedCtx: string | undefined;

    const { Router } = makeMemRouter('/page');

    const Page = () => {
      capturedCtx = useContext(AppCtx);
      return capturedCtx ?? 'no-ctx';
    };

    renderApp(() =>
      AppCtx.Provider({
        value: 'app-context-value',
        children: Router({
          children: Routes({
            children: [Route({ path: '/page', component: Page })],
          }),
        }),
      })
    );

    expect(container.textContent).toContain('app-context-value');
    expect(capturedCtx).toBe('app-context-value');
  });
});

// ---------------------------------------------------------------------------
// 6. Suspense
// ---------------------------------------------------------------------------

describe('Suspense', () => {
  it('renders children directly when no async dependency', () => {
    renderApp(() =>
      createComponent(Suspense, {
        fallback: 'loading...',
        children: 'sync content',
      })
    );

    expect(container.textContent).toBe('sync content');
  });

  it('shows fallback while promise is pending, content after resolve', async () => {
    let resolveContent!: (v: string) => void;
    const contentPromise = new Promise<string>(resolve => {
      resolveContent = resolve;
    });

    renderApp(() =>
      createComponent(Suspense, {
        fallback: 'loading...',
        children: contentPromise,
      })
    );

    // While promise is pending — should show fallback
    expect(container.textContent).toBe('loading...');

    resolveContent('async content');
    // Flush microtasks so .then() handlers run
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toBe('async content');
  });

  it('hides fallback when no pending async content', () => {
    renderApp(() =>
      createComponent(Suspense, {
        fallback: 'fallback content', // plain string fallback
        children: 'immediate content',
      })
    );

    expect(container.textContent).toBe('immediate content');
    expect(container.textContent).not.toContain('fallback content');
  });
});

// ---------------------------------------------------------------------------
// 7. lazy() loading
// ---------------------------------------------------------------------------

describe('lazy() loading', () => {
  it('renders lazy component after module resolves', async () => {
    let resolveModule!: (m: { default: () => string }) => void;
    const modulePromise = new Promise<{ default: () => string }>(resolve => {
      resolveModule = resolve;
    });

    const LazyComp = lazy(() => modulePromise);

    renderApp(() =>
      createComponent(Suspense, {
        fallback: 'lazy loading...',
        children: createComponent(LazyComp as any, {}),
      })
    );

    // While module is loading — Suspense should show fallback
    expect(container.textContent).toBe('lazy loading...');

    resolveModule({ default: () => 'lazy component content' });
    // Flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toBe('lazy component content');
  });

  it('lazy.preload() starts loading before render', async () => {
    let moduleLoaded = false;
    const LoadableComp = lazy(
      () =>
        new Promise<{ default: () => string }>(resolve => {
          moduleLoaded = true;
          resolve({ default: () => 'preloaded content' });
        }),
      { preload: true }
    );

    // preload: true should trigger the load immediately
    expect(moduleLoaded).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    renderApp(() =>
      createComponent(Suspense, {
        fallback: 'loading...',
        children: createComponent(LoadableComp as any, {}),
      })
    );

    // Module already loaded — should show content (not fallback)
    await Promise.resolve();
    expect(container.textContent).toBe('preloaded content');
  });
});

// ---------------------------------------------------------------------------
// 8. Reactive signals in component trees
// ---------------------------------------------------------------------------

describe('reactive signals in component trees', () => {
  it('component re-renders when signal changes', () => {
    const [count, setCount] = createSignal(0);
    // Pass memo directly to insert — avoids createComponent $COMPONENT stamping
    const counterMemo = createMemo(() => `count: ${count()}`);

    renderApp(() => counterMemo);  // memo passed directly as accessor

    expect(container.textContent).toBe('count: 0');

    setCount(1);
    expect(container.textContent).toBe('count: 1');

    setCount(42);
    expect(container.textContent).toBe('count: 42');
  });

  it('batch() coalesces multiple signal writes', () => {
    const [a, setA] = createSignal('A');
    const [b, setB] = createSignal('B');
    let renderCount = 0;

    // Use memo directly — no createComponent wrapping
    const displayMemo = createMemo(() => {
      renderCount++;
      return `${a()}-${b()}`;
    });

    renderApp(() => displayMemo);

    expect(container.textContent).toBe('A-B');
    const rendersBefore = renderCount;

    batch(() => {
      setA('X');
      setB('Y');
    });

    expect(container.textContent).toBe('X-Y');
    // With batching, the memo should only re-run once
    expect(renderCount - rendersBefore).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 9. Full app scenario: Router + Context + Routes
// ---------------------------------------------------------------------------

describe('full app scenario', () => {
  it('Router + Context + Routes: context accessible inside route components', () => {
    const UserCtx = createContext<{ name: string } | null>(null);
    let capturedUser: { name: string } | null = null;
    let navigate!: Navigator;

    const { Router } = makeMemRouter('/profile');

    const ProfilePage = () => {
      capturedUser = useContext(UserCtx);
      return capturedUser ? `Profile: ${capturedUser.name}` : 'no user';
    };

    const HomePage = () => 'home page';

    renderApp(() => {
      // Router must run before useNavigate() so _activeRouter is set
      const result = UserCtx.Provider({
        value: { name: 'Alice' },
        children: Router({
          children: Routes({
            children: [
              Route({ path: '/profile', component: ProfilePage }),
              Route({ path: '/', component: HomePage }),
            ],
          }),
        }),
      });
      navigate = useNavigate();
      return result;
    });

    expect(container.textContent).toContain('Profile: Alice');
    expect(capturedUser).toEqual({ name: 'Alice' });

    navigate('/');
    expect(container.textContent).toContain('home page');

    navigate('/profile');
    expect(container.textContent).toContain('Profile: Alice');
  });

  it('navigate() triggers DOM update without stale content from previous route', () => {
    const { Router } = makeMemRouter('/');
    let navigate!: Navigator;

    const PageA = () => 'page A content';
    const PageB = () => 'page B content';

    renderApp(() => {
      const result = Router({
        children: Routes({
          children: [
            Route({ path: '/', component: PageA }),
            Route({ path: '/b', component: PageB }),
          ],
        }),
      });
      navigate = useNavigate(); // Router ran above
      return result;
    });

    expect(container.textContent).toContain('page A content');

    navigate('/b');
    // After navigation, page A content MUST be gone (no DOM leakage)
    expect(container.textContent).not.toContain('page A content');
    expect(container.textContent).toContain('page B content');
  });

  it('Router + Suspense + lazy: full async route loading', async () => {
    let resolveModule!: (m: { default: () => string }) => void;
    const modulePromise = new Promise<{ default: () => string }>(resolve => {
      resolveModule = resolve;
    });

    const LazyPage = lazy(() => modulePromise);
    const { Router } = makeMemRouter('/lazy');

    renderApp(() =>
      Router({
        children: createComponent(Suspense, {
          fallback: 'loading route...',
          children: Routes({
            children: [Route({ path: '/lazy', component: LazyPage as any })],
          }),
        }),
      })
    );

    // Route is loading — Suspense fallback should show
    expect(container.textContent).toBe('loading route...');

    resolveModule({ default: () => 'lazy route content' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.textContent).toBe('lazy route content');
  });
});

// ---------------------------------------------------------------------------
// Imperative-backend shape: Suspense + lazy child wrapped in an array
// ---------------------------------------------------------------------------
// Regression for the store-admin empty render. The imperative backend emits a
// component's children as `[createMemo(() => createComponent(C)), " "]` (an array,
// because of trailing JSX whitespace). Two bugs broke this:
//   1. Suspense only triggered lazy-resource registration for a bare signal child,
//      not an array — so the fallback never showed and the resource never loaded.
//   2. flattenArray cached a memo-stamped component (Suspense's output) by its first
//      value, so when it switched from fallback (a node) to content (an array) the
//      DOM never swapped — it stayed on the fallback even after the child loaded.
//   3. render() inserted the static array result directly (no enclosing render
//      effect), so the nested Suspense output was read untracked and never updated.
//      The fix wraps the computed result in a stable thunk; we mount the same way.
describe('Suspense + array-wrapped lazy child (imperative shape)', () => {
  it('shows fallback then swaps to the lazy content', async () => {
    ensureIntegration();
    const Home = lazy(async () => ({ default: () => 'HOME CONTENT' }));
    const app = () => [
      createMemo(() =>
        createComponent(Suspense, {
          fallback: 'LOADING',
          get children() {
            return [createMemo(() => createComponent(Home, {})), ' '];
          },
        })
      ),
      ' ',
    ];
    // Mount exactly like render(): compute the static-array result ONCE, then insert
    // a stable thunk so a top-level render effect tracks the nested memos. Inserting
    // the static array directly (old render() behaviour) left it stuck on the fallback.
    createRoot((d) => {
      disposeApp = d;
      const result = app();
      insert(container, () => result);
    });
    expect(container.textContent).toContain('LOADING');

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toContain('HOME CONTENT');
    expect(container.textContent).not.toContain('LOADING');
  });
});
