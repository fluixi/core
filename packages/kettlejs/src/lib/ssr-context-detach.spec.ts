// @vitest-environment jsdom
/**
 * Repro for the storefront SSR bug: a lazy route rendered through router-next's
 * <Outlet/> must inherit the layout's context. The route got `undefined` from
 * useContext while a non-lazy sibling of the same provider worked.
 *
 * Compiles REAL JSX through the imperative backend (hand-written createComponent
 * calls did NOT reproduce it), renders SSR via renderToStringAsync, asserts CTX.
 *
 * ── ROOT CAUSE ───────────────────────────────────────────────────────────────
 * The eager createProvider({ context, value, children: props.children }) form reads
 * `children` when the object literal is built — i.e. BEFORE the reactive Provider
 * stamps its context. With an <Outlet/> among siblings, the route subtree then
 * renders in an owner root disjoint from the provider, so route descendants see no
 * context. (provider > <Outlet/> alone passed; provider > <Navbar/><Outlet/><Footer/>
 * detached.) Related: [[imperative-array-children-reactivity]].
 *
 * ── FIX ──────────────────────────────────────────────────────────────────────
 * createProvider has a lazy-safe overload — createProvider(context, value, props) —
 * that reads children through a getter (inside the stamped scope). The old eager
 * { context, value, children } form is deprecated (warns) but still works. This test
 * uses the lazy-safe form (+ JSX <Ctx.Provider> for the outer one) and must PASS.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import imperativePlugin from '@fluixi/compiler/babel';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Kettle from '@fluixi/kettlejs';
import * as RouterNext from '@fluixi/kettlejs/router-next';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';

// Minimal ESM->CJS so we can eval the compiled module with a require map (the
// monorepo's @babel/plugin-transform-modules-commonjs isn't reachable from here).
function cjsTransform({ types: t }: any): any {
  return {
    visitor: {
      ImportDeclaration(path: any) {
        const source = path.node.source.value;
        const props: any[] = [];
        let nsName: string | null = null;
        let defName: string | null = null;
        for (const s of path.node.specifiers) {
          if (t.isImportDefaultSpecifier(s)) defName = s.local.name;
          else if (t.isImportNamespaceSpecifier(s)) nsName = s.local.name;
          else
            props.push(
              t.objectProperty(
                t.identifier(s.imported.name),
                t.identifier(s.local.name),
                false,
                s.imported.name === s.local.name,
              ),
            );
        }
        const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]);
        const decls: any[] = [];
        if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
        if (defName)
          decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
        if (props.length) decls.push(t.variableDeclarator(t.objectPattern(props), req));
        if (!decls.length) return path.remove();
        path.replaceWith(t.variableDeclaration('const', decls));
      },
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          const decl = path.node.declaration;
          const names: string[] = [];
          if (t.isVariableDeclaration(decl)) for (const d of decl.declarations) names.push(d.id.name);
          else if (decl.id) names.push(decl.id.name);
          path.replaceWithMultiple([
            decl,
            ...names.map((n) =>
              t.expressionStatement(
                t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n)),
              ),
            ),
          ]);
        } else {
          path.replaceWithMultiple(
            path.node.specifiers.map((s: any) =>
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(t.identifier('exports'), t.identifier(s.exported.name)),
                  t.identifier(s.local.name),
                ),
              ),
            ),
          );
        }
      },
    },
  };
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/kettlejs': Kettle,
  '@fluixi/kettlejs/router-next': RouterNext,
};

function load(src: string): any {
  const opts = {
    backend: 'imperative' as const,
    importSource: '@fluixi/dom',
    signalModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
    hoistStatics: false,
  };
  const step1 = babel.transformSync(src, {
    filename: 't.tsx',
    configFile: false,
    babelrc: false,
    plugins: [[imperativePlugin as any, opts]],
  })!.code!;
  const code = babel.transformSync(step1, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsTransform],
  })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

beforeAll(() => {
  ensureIntegration();
  setServerMode(true);
});

describe('SSR: lazy route inherits layout context (compiled JSX)', () => {
  it('useContext resolves the layout provider value in a lazy route', async () => {
    const src = `
      import { createContext, useContext, createProvider, Suspense, lazy } from '@fluixi/kettlejs';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/kettlejs/router-next';

      const ThemeCtx = createContext();
      const AuthCtx = createContext();

      // Lazy-safe createProvider form: pass the component's props so children stay
      // a getter (rendered inside the stamped scope). The old eager form —
      // createProvider({ context, value, children: props.children }) — detached the
      // routed <Outlet/> and is what broke the storefront.
      function ThemeProvider(props) {
        return createProvider(ThemeCtx, { name: 'CTX-OK' }, props);
      }

      function Navbar() { return <nav class="nav">nav</nav>; }
      function Footer() { return <footer class="foot">foot</footer>; }

      function Home() {
        const v = useContext(ThemeCtx);
        return <div class="home">{v ? v.name : 'NO-CTX'}</div>;
      }
      const HomeLazy = lazy(() => Promise.resolve({ default: Home }));

      // Mirrors the storefront RootLayout: provider wraps Navbar + main>Suspense>Outlet
      // + Footer as SIBLINGS (eager children), not just the Suspense.
      function Layout() {
        return (
          <ThemeProvider>
            <Navbar />
            <main>
              <Suspense fallback={<span>loading</span>}>
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </ThemeProvider>
        );
      }

      const routes = [
        { path: '/', component: Layout, children: [{ path: '/', component: HomeLazy }] },
      ];

      // Outer AuthContext provider around the Router — JSX .Provider (lazy children).
      export function App() {
        return (
          <AuthCtx.Provider value={{ user: 1 }}>
            <Router routes={routes} history={createMemoryHistory('/')} />
          </AuthCtx.Provider>
        );
      }
    `;
    const { App } = load(src);

    // Render 1 warms the module-level lazy cache (fires load(); shows fallback).
    await renderToStringAsync(() => App());
    for (let i = 0; i < 20; i++) await Promise.resolve();

    // Render 2: the lazy chunk is warm, so the route renders synchronously — this
    // is the storefront scenario where useContext returned undefined.
    const html = await renderToStringAsync(() => App());

    expect(html).not.toContain('loading'); // route actually rendered (not fallback)
    expect(html).toContain('CTX-OK');
    expect(html).not.toContain('NO-CTX');
  });
});
