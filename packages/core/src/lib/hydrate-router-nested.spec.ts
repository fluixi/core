// @vitest-environment jsdom
/**
 * Whole-app hydration over a nested Router → Suspense → Outlet → route tree (the shape every
 * @fluixi/start app has). Regression for the "renders the app N× / triples" duplication: the
 * hydration cursor must reuse the server DOM through the component/Suspense/Outlet boundaries,
 * not rebuild fresh subtrees next to it.
 *
 * Compiles REAL JSX through the imperative backend, server-renders to HTML, then hydrates.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from 'fluixi';
import * as RouterNext from './router/index.js';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import { startClient } from './client/index.js';

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
              t.expressionStatement(
                t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n)),
              ),
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
  'fluixi': Fluixi,
  'fluixi/router': RouterNext,
};

function load(src: string): any {
  const opts = {
    importSource: '@fluixi/dom',
    signalModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
  };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
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

const APP_SRC = `
  import { Suspense } from 'fluixi';
  import { Router, Outlet, createMemoryHistory } from 'fluixi/router';

  function Card(props) {
    return <article class="card">{props.title}</article>;
  }
  function Home() {
    return (
      <div class="page">
        <header class="hd"><a class="brand">B</a></header>
        <main class="content">
          <Card title="one" />
          <Card title="two" />
        </main>
      </div>
    );
  }
  function RootLayout() {
    return (
      <Suspense fallback={<div class="fb" />}>
        <Outlet />
      </Suspense>
    );
  }
  const routes = [{ path: '/', component: Home }];
  const appRoutes = [{ path: '/', component: RootLayout, children: routes }];
  export function App(props) {
    const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
    return <Router routes={appRoutes} history={history} />;
  }
`;

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('hydration: nested Router/Suspense/Outlet app', () => {
  it('reuses the server DOM without duplicating the tree', async () => {
    const { App } = load(APP_SRC);

    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);

    // Server produced the real content (not the fallback).
    expect(html).toContain('class="page"');
    expect(html).toContain('class="card"');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverPage = document.querySelector('#app .page');

    startClient(App as any, { root: '#app', hydrate: true });
    await tick();
    await tick();

    const root = document.querySelector('#app')!;
    // The whole tree must appear exactly once — no duplicate render stacked on the server DOM.
    expect(root.querySelectorAll('.page').length).toBe(1);
    expect(root.querySelectorAll('.card').length).toBe(2);
    expect(root.querySelectorAll('.hd').length).toBe(1);
    // And it reused the existing node rather than recreating it.
    expect(document.querySelector('#app .page')).toBe(serverPage);
  });

  it('reuses the server DOM for a LAZY route (the file-route shape)', async () => {
    const src = `
      import { Suspense, lazy } from 'fluixi';
      import { Router, Outlet, createMemoryHistory } from 'fluixi/router';

      function Card(props) { return <article class="card">{props.title}</article>; }
      function Home() {
        return (
          <div class="page">
            <header class="hd"><a class="brand">B</a></header>
            <main class="content"><Card title="one" /><Card title="two" /></main>
          </div>
        );
      }
      const HomeLazy = lazy(() => Promise.resolve({ default: Home }));
      function RootLayout() {
        return <Suspense fallback={<div class="fb" />}><Outlet /></Suspense>;
      }
      export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: HomeLazy }] }];
      export function App(props) {
        const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
        return <Router routes={appRoutes} history={history} />;
      }
    `;
    const { App, appRoutes } = load(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);
    expect(html).toContain('class="card"');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    // Real apps pass their route tree so startClient preloads the matched lazy chunk before
    // hydrating — that's what makes the lazy route resolve synchronously and adopt the server DOM.
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick();
    await tick();
    await tick();

    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.page').length).toBe(1);
    expect(root.querySelectorAll('.card').length).toBe(2);
    expect(root.querySelectorAll('.fb').length).toBe(0);
  });
});
