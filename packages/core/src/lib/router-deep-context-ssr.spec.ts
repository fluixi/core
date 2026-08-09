// @vitest-environment jsdom
/**
 * Root-cause repro for the storefront deep-route SSR crash:
 *   Error: [router-next] useRouter must be used within <Router>
 *
 * A layout component (like the storefront Navbar) reads useRouter() at render top,
 * and the app is rendered through a DEEP nested route with lazy layers under async
 * SSR. The '/' route works; a deep route (/products/category/:cat) intermittently
 * loses RouterContext on the owner chain during the lazy serialize, so useRouter
 * throws. (useNavigate is patched to no-op on the server, but useRouter/useParams
 * can't degrade — they need the real context. This test exercises that root cause.)
 *
 * Compiles REAL JSX through the imperative backend; drives the Router with
 * createMemoryHistory at a deep path; single cold renderToStringAsync.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import imperativePlugin from '@fluixi/compiler/babel';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import * as RouterNext from '@fluixi/core/router-next';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';

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
              t.objectProperty(t.identifier(s.imported.name), t.identifier(s.local.name), false, s.imported.name === s.local.name),
            );
        }
        const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]);
        const decls: any[] = [];
        if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
        if (defName) decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
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
              t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n))),
            ),
          ]);
        }
      },
    },
  };
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/core': Fluixi,
  '@fluixi/core/router-next': RouterNext,
};

function load(src: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const step1 = babel.transformSync(src, { filename: 't.tsx', configFile: false, babelrc: false, plugins: [[imperativePlugin as any, opts]] })!.code!;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsTransform] })!.code!;
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

describe('SSR: deep nested route keeps RouterContext (storefront crash repro)', () => {
  it('a layout reading useRouter does not throw, and the deep route content renders', async () => {
    const src = `
      import { Suspense, lazy, createContext, createProvider } from '@fluixi/core';
      import { createResource } from '@fluixi/reactive/signal';
      import { Router, Outlet, useRouter, createMemoryHistory } from '@fluixi/core/router-next';

      const tick = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms || 5));

      const AuthCtx = createContext();
      const LocaleCtx = createContext();
      function LocaleProvider(props) { return createProvider(LocaleCtx, { lang: 'en' }, props); }

      // The storefront Navbar — a SEPARATE component, sibling of <main>, OUTSIDE the
      // <Suspense>, reading the router context at render top.
      function Navbar() {
        const r = useRouter();
        return <nav data-loc={r.location().pathname}>nav</nav>;
      }
      function Footer() { return <footer>foot</footer>; }

      // RootLayout: a provider with MULTIPLE eager siblings (Navbar, main, Footer).
      function Layout() {
        return (
          <LocaleProvider>
            <Navbar />
            <main>
              <Suspense fallback={<span>SPINNER</span>}>
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </LocaleProvider>
        );
      }

      function Section() { return <section><Outlet /></section>; }
      const SectionLazy = lazy(() => Promise.resolve({ default: Section }));

      function Page() {
        const [data] = createResource(() => tick('DEEP-CONTENT'));
        return <div class="page">{data()}</div>;
      }
      const PageLazy = lazy(() => Promise.resolve({ default: Page }));

      const routes = [
        { path: '/', component: Layout, children: [
          { path: '/products', component: SectionLazy, children: [
            { path: '/products/category/:cat', component: PageLazy },
          ]},
        ]},
      ];

      // Outer AuthContext provider around the Router, like app.tsx.
      export function App() {
        return (
          <AuthCtx.Provider value={{ user: 1 }}>
            <Router routes={routes} history={createMemoryHistory('/products/category/homme')} />
          </AuthCtx.Provider>
        );
      }
    `;
    const { App } = load(src);

    const html = await renderToStringAsync(() => App());

    expect(html).toContain('DEEP-CONTENT');   // deep lazy route content server-rendered
    expect(html).not.toContain('SPINNER');     // boundary resolved
    expect(html).toContain('/products/category/homme'); // layout's useRouter resolved
  });
});
