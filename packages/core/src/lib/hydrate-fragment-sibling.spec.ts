// @vitest-environment jsdom
/**
 * A route layout returning a fragment: a sibling beside a Show whose content holds a nested Show
 * and the page's shell. An app's console rendered blank after hydration: the nested Show had
 * adopted the shell, the enclosing array did not count it as adopted, and its reconcile removed
 * it as an unclaimed server node.
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

describe('hydration: a fragment holding a Show beside another child', () => {
  it('keeps the shell when the Show stands alone', async () => {
    const src = `
      import { Show, Suspense, createContext } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      const Brand = createContext({});
      function Shell(props) { return <div class="shell"><nav class="side">side</nav>{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <Show when={true} fallback={<main class="down" />}>
              <Brand.Provider value={() => ({})}>
                <div class="progress" />
                <Show when={true} fallback={<p class="gate" />}>
                  <Shell>
                    <Suspense fallback={<p class="loading" />}><Outlet /></Suspense>
                  </Shell>
                </Show>
              </Brand.Provider>
            </Show>
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
    expect(html).toContain('class="shell"');
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverShell = document.querySelector('#app .shell');
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    expect(root.querySelectorAll('.progress').length).toBe(1);
    expect(document.querySelector('#app .shell')).toBe(serverShell);
  });
  it('stays reactive after hydration', async () => {
    const src = `
      import { Show } from '@fluixi/core';
      import { createSignal } from '@fluixi/reactive/signal';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      const flag = createSignal(true);
      export const open = flag[0];
      export const setOpen = flag[1];
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={open()} fallback={<p class="closed">closed</p>}>
              <div class="shell"><Outlet /></div>
            </Show>
          </>
        );
      }
      export const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/', component: Home }] }];
      export function App(props) {
        const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
        return <Router routes={appRoutes} history={history} />;
      }
    `;
    const { App, appRoutes, setOpen } = load(src);
    setServerMode(true);
    const html = await renderToStringAsync(() => App({ url: '/' }));
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    setOpen(false);
    await tick();
    expect(root.querySelectorAll('.shell').length).toBe(0);
    expect(root.querySelectorAll('.closed').length).toBe(1);
  });
  it('keeps what a nested Show adopted when the Show has a sibling', async () => {
    const src = `
      import { Show, Suspense, createContext } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      const Brand = createContext({});
      function Shell(props) { return <div class="shell"><nav class="side">side</nav>{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={true}>
              <div class="progress" />
              <Show when={true}><Shell><Outlet /></Shell></Show>
            </Show>
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
    expect(html).toContain('class="shell"');
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverShell = document.querySelector('#app .shell');
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    expect(root.querySelectorAll('.progress').length).toBe(1);
    expect(document.querySelector('#app .shell')).toBe(serverShell);
  });
  it('keeps the shell when the Show is not nested', async () => {
    const src = `
      import { Show, Suspense, createContext } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      const Brand = createContext({});
      function Shell(props) { return <div class="shell"><nav class="side">side</nav>{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <div class="progress" />
            <Show when={true}><Shell><Outlet /></Shell></Show>
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
    expect(html).toContain('class="shell"');
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverShell = document.querySelector('#app .shell');
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    expect(root.querySelectorAll('.progress').length).toBe(1);
    expect(document.querySelector('#app .shell')).toBe(serverShell);
  });
  it('keeps the shell when the Show holds no Show', async () => {
    const src = `
      import { Show, Suspense, createContext } from '@fluixi/core';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/core/router';

      const Brand = createContext({});
      function Shell(props) { return <div class="shell"><nav class="side">side</nav>{props.children}</div>; }
      function Home() { return <section class="home">home</section>; }
      function RootLayout() {
        return (
          <>
            <span class="first" />
            <Show when={true}>
              <div class="progress" />
              <Shell><Outlet /></Shell>
            </Show>
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
    expect(html).toContain('class="shell"');
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const serverShell = document.querySelector('#app .shell');
    await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
    await tick(); await tick(); await tick();
    const root = document.querySelector('#app')!;
    expect(root.querySelectorAll('.shell').length).toBe(1);
    expect(root.querySelectorAll('.home').length).toBe(1);
    expect(root.querySelectorAll('.progress').length).toBe(1);
    expect(document.querySelector('#app .shell')).toBe(serverShell);
  });
});
