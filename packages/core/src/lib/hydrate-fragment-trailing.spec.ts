// @vitest-environment jsdom
/**
 * An element after a Show in a fragment, `[<span/>, <Show/>, <div/>]`. The fragment's elements are
 * built when its array is, before the Show's slot claims its server nodes, so the trailing
 * element must still adopt its own server node, not the Show's.
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

describe('hydration: an element after a Show in a fragment', () => {
  it('adopts its own node after a Show', async () => {
    const src = `
      import { Show } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      function Shell(props) { return <div class="shell">{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={true}><Shell><Outlet /></Shell></Show>
            <div class="after" />
          </>
        );
      }
      export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: Home }] }];
      export function App(props) {
        const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
        return <Router routes={appRoutes} history={history} />;
      }
    `;
    const { App, appRoutes } = load(src);
    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const server = [...document.querySelectorAll('#app .shell, #app .after')];
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.after').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    // The server's elements are adopted, not rebuilt.
    expect([...root.querySelectorAll('.shell, .after')]).toEqual(server);
  });

  it('adopts its own node after a Show holding a Show', async () => {
    const src = `
      import { Show } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      function Shell(props) { return <div class="shell">{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={true}>
              <Show when={true}><Shell><Outlet /></Shell></Show>
            </Show>
            <div class="after" />
          </>
        );
      }
      export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: Home }] }];
      export function App(props) {
        const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
        return <Router routes={appRoutes} history={history} />;
      }
    `;
    const { App, appRoutes } = load(src);
    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const server = [...document.querySelectorAll('#app .shell, #app .after')];
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.after').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    // The server's elements are adopted, not rebuilt.
    expect([...root.querySelectorAll('.shell, .after')]).toEqual(server);
  });

  it('adopts its own node after a Show that rendered nothing', async () => {
    const src = `
      import { Show } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      function Shell(props) { return <div class="shell">{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={false}><Shell><Outlet /></Shell></Show>
            <div class="after" />
          </>
        );
      }
      export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: Home }] }];
      export function App(props) {
        const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
        return <Router routes={appRoutes} history={history} />;
      }
    `;
    const { App, appRoutes } = load(src);
    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const server = [...document.querySelectorAll('#app .shell, #app .after')];
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(0);
    expect(root.querySelectorAll('.after').length).toBe(1);
    // The server's elements are adopted, not rebuilt.
    expect([...root.querySelectorAll('.shell, .after')]).toEqual(server);
  });
});
