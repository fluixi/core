import { describe, it, expect } from 'vitest';
import { matchRoutes, matchPath, scoreRoute, rankRoutes } from './match.js';
import type { RouteDefinition } from './types.js';

// Components are opaque tags: the core never calls them.
const A = 'A', B = 'B', C = 'C', Leaf = 'Leaf', Home = 'Home', Settings = 'Settings';

describe('matchPath', () => {
  it('matches a static leaf exactly', () => {
    expect(matchPath('/users', '/users', true)).toEqual({ params: {}, path: '/users' });
    expect(matchPath('/users', '/users/1', true)).toBeNull();
  });
  it('matches a prefix for layouts (non-exact)', () => {
    expect(matchPath('/app', '/app/home', false)).toEqual({ params: {}, path: '/app' });
  });
  it('extracts named params', () => {
    expect(matchPath('/users/:id', '/users/42', true)).toEqual({ params: { id: '42' }, path: '/users/42' });
  });
  it('matches the root layout', () => {
    expect(matchPath('/', '/anything', false)).toEqual({ params: {}, path: '/' });
  });
  it('matches wildcards', () => {
    expect(matchPath('/files/*', '/files/a/b/c', true)).toEqual({ params: {}, path: '/files/a/b/c' });
    expect(matchPath('/files/*rest', '/files/a/b', true)).toEqual({ params: { rest: 'a/b' }, path: '/files/a/b' });
  });
});

describe('scoreRoute / rankRoutes', () => {
  it('scores static > param > wildcard', () => {
    expect(scoreRoute({ path: '/users/new' })).toBeGreaterThan(scoreRoute({ path: '/users/:id' }));
    expect(scoreRoute({ path: '/users/:id' })).toBeGreaterThan(scoreRoute({ path: '/users/*' }));
  });
  it('ranks most-specific first without mutating input', () => {
    const defs: RouteDefinition[] = [{ path: '/:id' }, { path: '/new' }, { path: '/*' }];
    const ranked = rankRoutes(defs);
    expect(ranked.map((r) => r.path)).toEqual(['/new', '/:id', '/*']);
    expect(defs.map((r) => r.path)).toEqual(['/:id', '/new', '/*']); // unchanged
  });
});

describe('matchRoutes', () => {
  it('matches a flat route', () => {
    const routes: RouteDefinition[] = [{ path: '/home', component: Home }];
    const m = matchRoutes(routes, '/home')!;
    expect(m.matched.map((x) => x.component)).toEqual([Home]);
    expect(m.params).toEqual({});
    expect(m.pathname).toBe('/home');
  });

  it('returns null when nothing matches', () => {
    expect(matchRoutes([{ path: '/home', component: Home }], '/nope')).toBeNull();
  });

  it('tolerates a trailing slash (static hosts canonicalise /a/b → /a/b/)', () => {
    const routes: RouteDefinition[] = [
      {
        path: '/v1',
        component: A,
        children: [{ path: '/v1/:lang/:slug', component: Leaf }],
      },
    ];
    const m = matchRoutes(routes, '/v1/en/introduction/')!;
    expect(m).not.toBeNull();
    expect(m.matched.map((x) => x.component)).toEqual([A, Leaf]);
    expect(m.params).toEqual({ lang: 'en', slug: 'introduction' });
    // root is preserved (not stripped to empty)
    expect(matchRoutes([{ path: '/', component: Home }], '/')!.matched[0].component).toBe(Home);
  });

  it('resolves a nested layout → page tree (parent → child)', () => {
    const routes: RouteDefinition[] = [
      {
        path: '/app',
        component: A,
        children: [
          { path: '/app/home', component: Home },
          { path: '/app/settings', component: Settings },
        ],
      },
    ];
    const m = matchRoutes(routes, '/app/settings')!;
    expect(m.matched.map((x) => x.component)).toEqual([A, Settings]);
    expect(m.matched.map((x) => x.pathname)).toEqual(['/app', '/app/settings']);
  });

  it('resolves DEEPLY nested layouts (the case the old router could not render)', () => {
    const routes: RouteDefinition[] = [
      {
        path: '/',
        component: A,
        children: [
          {
            path: '/',
            component: B,
            children: [
              { path: '/', component: C, children: [{ path: '/', component: Leaf }] },
            ],
          },
        ],
      },
    ];
    const m = matchRoutes(routes, '/')!;
    expect(m.matched.map((x) => x.component)).toEqual([A, B, C, Leaf]);
  });

  it('merges params across layers and keeps per-layer params', () => {
    const routes: RouteDefinition[] = [
      {
        path: '/org/:org',
        component: A,
        children: [{ path: '/org/:org/user/:id', component: Leaf }],
      },
    ];
    const m = matchRoutes(routes, '/org/acme/user/7')!;
    expect(m.params).toEqual({ org: 'acme', id: '7' });
    expect(m.matched[0].params).toEqual({ org: 'acme' });
    expect(m.matched[1].params).toEqual({ id: '7' });
  });

  it('picks the most specific sibling branch', () => {
    const routes: RouteDefinition[] = [
      { path: '/users/:id', component: B },
      { path: '/users/new', component: A },
    ];
    expect(matchRoutes(routes, '/users/new')!.matched.map((x) => x.component)).toEqual([A]);
    expect(matchRoutes(routes, '/users/42')!.matched.map((x) => x.component)).toEqual([B]);
  });

  it('backtracks to a sibling when a layout prefix matches but no child does', () => {
    const routes: RouteDefinition[] = [
      { path: '/', component: A, children: [{ path: '/only', component: Leaf }] },
      { path: '/other', component: B },
    ];
    // '/other' prefix-matches the root layout but the root has no '/other' child,
    // so the matcher must fall through to the sibling.
    expect(matchRoutes(routes, '/other')!.matched.map((x) => x.component)).toEqual([B]);
  });
});
