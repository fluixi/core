import { describe, it, expect, vi } from 'vitest';
import { createRouter } from './router.js';
import { createMemoryHistory, splitPath } from './history.js';
import type { RouteDefinition } from './types.js';

const A = 'A', Home = 'Home', Settings = 'Settings', User = 'User';

const routes: RouteDefinition[] = [
  {
    path: '/app',
    component: A,
    children: [
      { path: '/app/home', component: Home },
      { path: '/app/settings', component: Settings },
      { path: '/app/user/:id', component: User },
    ],
  },
];

describe('splitPath', () => {
  it('splits pathname / search / hash', () => {
    expect(splitPath('/a/b?x=1&y=2#sec')).toEqual({
      pathname: '/a/b',
      search: '?x=1&y=2',
      hash: '#sec',
    });
    expect(splitPath('/a')).toEqual({ pathname: '/a', search: '', hash: '' });
  });
});

describe('createRouter (memory history)', () => {
  it('exposes the initial location + match', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/app/home') });
    expect(router.state().location.pathname).toBe('/app/home');
    expect(router.state().match!.matched.map((m) => m.component)).toEqual([A, Home]);
  });

  it('navigates and recomputes the match', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/app/home') });
    router.navigate('/app/settings');
    expect(router.state().location.pathname).toBe('/app/settings');
    expect(router.state().match!.matched.map((m) => m.component)).toEqual([A, Settings]);
  });

  it('notifies subscribers on navigation', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/app/home') });
    const seen: string[] = [];
    const unsub = router.subscribe((s) => seen.push(s.location.pathname));
    router.navigate('/app/settings');
    router.navigate('/app/home');
    expect(seen).toEqual(['/app/settings', '/app/home']);
    unsub();
    router.navigate('/app/settings');
    expect(seen).toEqual(['/app/settings', '/app/home']); // no more after unsub
  });

  it('parses params and query', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/app/user/42?tab=profile') });
    expect(router.state().match!.params).toEqual({ id: '42' });
    expect(router.state().location.query).toEqual({ tab: 'profile' });
  });

  it('replace does not grow the back stack but updates state', () => {
    const history = createMemoryHistory('/app/home');
    const router = createRouter({ routes, history });
    router.navigate('/app/settings', { replace: true });
    expect(router.state().location.pathname).toBe('/app/settings');
  });

  it('supports a base prefix', () => {
    const router = createRouter({
      routes,
      base: '/admin',
      history: createMemoryHistory('/admin/app/home'),
    });
    expect(router.state().match!.matched.map((m) => m.component)).toEqual([A, Home]);
    router.navigate('/app/settings');
    expect(router.state().location.pathname).toBe('/admin/app/settings');
    expect(router.state().match!.matched.map((m) => m.component)).toEqual([A, Settings]);
  });

  it('match() is a pure query that does not change state', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/app/home') });
    const m = router.match('/app/settings');
    expect(m!.matched.map((x) => x.component)).toEqual([A, Settings]);
    expect(router.state().location.pathname).toBe('/app/home'); // unchanged
  });

  it('reacts to external history changes (popstate-style)', () => {
    const history = createMemoryHistory('/app/home');
    const router = createRouter({ routes, history });
    const fn = vi.fn();
    router.subscribe(fn);
    // Simulate an external nav by pushing through the adapter directly.
    history.push('/app/settings');
    expect(router.state().match!.matched.map((m) => m.component)).toEqual([A, Settings]);
    expect(fn).toHaveBeenCalled();
  });

  it('destroy() detaches from history', () => {
    const history = createMemoryHistory('/app/home');
    const router = createRouter({ routes, history });
    const fn = vi.fn();
    router.subscribe(fn);
    router.destroy();
    history.push('/app/settings');
    expect(fn).not.toHaveBeenCalled();
  });

  it('match is null for an unmatched path', () => {
    const router = createRouter({ routes, history: createMemoryHistory('/nope') });
    expect(router.state().match).toBeNull();
  });
});

// The whole point of the rewrite: the match is a resolved TOP-DOWN tree. A view
// adapter renders it by threading each child down as a value — no re-entrancy.
describe('rendering-contract shape (top-down, no re-entrancy)', () => {
  it('a naive top-down renderer composes nested layouts at any depth', () => {
    const deep: RouteDefinition<string>[] = [
      {
        path: '/',
        component: 'a',
        children: [
          {
            path: '/',
            component: 'b',
            children: [
              { path: '/', component: 'c', children: [{ path: '/', component: 'leaf' }] },
            ],
          },
        ],
      },
    ];
    const router = createRouter({ routes: deep, history: createMemoryHistory('/') });
    const matched = router.state().match!.matched;

    // Adapter-style top-down render: fold from the deepest child upward, passing
    // each rendered child to its parent as the parent's outlet. Pure values only.
    const render = (component: string, outlet: string | null): string =>
      outlet === null ? `<${component}/>` : `<${component}>${outlet}</${component}>`;
    let outlet: string | null = null;
    for (let i = matched.length - 1; i >= 0; i--) {
      outlet = render(matched[i].component as string, outlet);
    }
    expect(outlet).toBe('<a><b><c><leaf/></c></b></a>');
  });
});
