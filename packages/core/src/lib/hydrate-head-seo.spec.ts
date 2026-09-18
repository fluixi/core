// @vitest-environment jsdom
/**
 * Repro: calling seo()/useHead() inside a route component during hydration duplicates the page
 * content. seo() does a signal write (registry.push -> bump) synchronously while the component is
 * rendering under the hydration walk. This spec compiles real JSX through the imperative backend,
 * server-renders, then hydrates, the tree must appear exactly once.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import * as RouterNext from './router/index.js';
import * as Head from '@fluixi/head';
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
  '@fluixi/core': Fluixi,
  '@fluixi/core/router': RouterNext,
  '@fluixi/head': Head,
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

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('hydration: seo() inside a route component', () => {
  it('does not duplicate the page when seo() is called in render', async () => {
    const src = `
      import { Suspense, lazy } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';
      import { seo } from '@fluixi/head';

      function Card(props) { return <article class="card">{props.title}</article>; }
      function Home() {
        seo({ title: 'Home', description: 'desc', canonical: 'https://x/' });
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
    expect(html).toContain('class="page"');
    expect(html).toContain('class="card"');

    // Simulate a server that leaves the @fluixi/head transport marker in the body (streaming /
    // custom server that doesn't lift it into <head>). encodeHeadMarker prepends it, so it lands
    // as the mount root's first child, the exact shape that stranded the hydration cursor.
    const marker = Head.encodeHeadMarker(Head.renderHead((() => { const h = Head.createHead(); h.push({ title: 'Home' }); return h; })()));
    expect(marker).toContain('<!--fh:');
    document.body.innerHTML = `<div id="app">${marker}${html}</div>`;
    const serverPage = document.querySelector('#app .page');

    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick();
    await tick();
    await tick();

    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.page').length).toBe(1);
    expect(root.querySelectorAll('.card').length).toBe(2);
    expect(root.querySelectorAll('.hd').length).toBe(1);
    expect(document.querySelector('#app .page')).toBe(serverPage);
    // The stray transport comment must be gone (stripHeadMarker ran before hydration).
    expect(root.innerHTML).not.toContain('<!--fh:');
  });
});
