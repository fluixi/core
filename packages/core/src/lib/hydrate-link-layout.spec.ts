// @vitest-environment jsdom
/**
 * A layout whose header holds a <Link> before <main>. The elements after the link must be
 * adopted from the server's markup: the link must take the same hydration key positions on
 * both sides, or every key after it shifts and the client builds a second <main> beside the
 * server's, removed a moment later (a visible flash of the page twice).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
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
  '@fluixi/core': Fluixi,
  '@fluixi/core/router': RouterNext,
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
  import { Suspense } from '@fluixi/core';
  import { Router, Outlet, Link, createMemoryHistory } from '@fluixi/core/router';

  function Home() {
    return <section class="hero"><h1>Hello</h1></section>;
  }
  function RootLayout() {
    return (
      <>
        <header class="bar">
          <Link href="/" class="brand">
            <span class="brand-mark" aria-hidden="true" />
            Developers
          </Link>
        </header>
        <main class="page">
          <Suspense fallback={<p class="fb" />}>
            <Outlet />
          </Suspense>
        </main>
      </>
    );
  }
  export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: Home }] }];
  export function App(props) {
    const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
    return <Router routes={appRoutes} history={history} />;
  }
`;

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('hydration: a Link before the rest of a layout', () => {
  it('adopts the elements after the link instead of building them again', async () => {
    const { App, appRoutes } = load(APP_SRC);

    setServerMode(true);
    // As renderRequestAsync enters it: as a component, the way the client does.
    const html = await renderToStringAsync(() => DOM.createComponent(App, { url: '/' }));
    setServerMode(false);
    expect(html).toContain('class="hero"');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverMain = document.querySelector('#app main');
    const serverLink = document.querySelector('#app a.brand');
    const added: string[] = [];
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) added.push((node as Element).tagName);
    }).observe(document.querySelector('#app')!, { childList: true, subtree: true });

    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick();
    await tick();

    expect(document.querySelectorAll('#app main').length).toBe(1);
    expect(document.querySelectorAll('#app .hero').length).toBe(1);
    expect(document.querySelector('#app a.brand')).toBe(serverLink);
    expect(document.querySelector('#app main')).toBe(serverMain);
    expect(added).toEqual([]);
  });
});
