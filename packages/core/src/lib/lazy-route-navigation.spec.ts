// @vitest-environment jsdom
/**
 * Client navigation to a route whose chunk is not loaded yet.
 *
 * Hydration preloads the matched route, so a server-rendered lazy route resolves
 * synchronously (see hydrate-router-nested.spec). Navigating to a *different* chunk has no
 * such preload: the import starts on navigation, and the router holds the commit until it
 * lands, so the page being left is what stays on screen meanwhile. The page has to appear
 * when the chunk lands, the failure this guards is a fetched chunk that mounts nothing,
 * leaving an empty root and no error.
 *
 * Compiles real JSX through the imperative backend, the same shape a @fluixi/start app has.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import * as RouterNext from './router/index.js';
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

/**
 * Two lazy routes whose imports resolve on command, so the in-flight window is observable.
 * `__land` is exposed on globalThis because the app source is compiled in isolation.
 */
const APP_SRC = `
  import { Suspense, lazy } from '@fluixi/core';
  import { Router, Outlet, createBrowserHistory } from '@fluixi/core/router';

  function Home() { return <div class="home">HOME</div>; }
  function makeDeferred(name, cls, text) {
    let resolve;
    const loaded = new Promise((r) => { resolve = r; });
    globalThis.__land[name] = () => { resolve({ default: () => <main class={cls}>{text}</main> }); return loaded; };
    return lazy(() => loaded);
  }

  const OneLazy = makeDeferred('one', 'one', 'ONE');
  const TwoLazy = makeDeferred('two', 'two', 'TWO');

  function RootLayout() {
    return <Suspense fallback={<div class="fb">LOADING</div>}><Outlet /></Suspense>;
  }

  export const appRoutes = [{
    path: '/',
    component: RootLayout,
    children: [
      { path: '/', component: Home },
      { path: '/one', component: OneLazy },
      { path: '/two', component: TwoLazy },
    ],
  }];

  export function App() { return <Router routes={appRoutes} history={createBrowserHistory()} />; }
`;

const BARE_SRC = `
  import { Suspense, lazy } from '@fluixi/core';
  import { createSignal } from '@fluixi/reactive/signal';

  let resolve;
  const loaded = new Promise((r) => { resolve = r; });
  globalThis.__landBare = () => { resolve({ default: () => <main class="late">LATE</main> }); return loaded; };
  const Late = lazy(() => loaded);

  export function makeApp() {
    const [show, setShow] = createSignal(false);
    const view = () => (
      <Suspense fallback={<div class="fb">LOADING</div>}>
        {() => (show() ? <Late /> : <div class="home">HOME</div>)}
      </Suspense>
    );
    return { view, setShow };
  }
`;

const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

beforeAll(() => ensureIntegration());

describe('Suspense + lazy without the router', () => {
  it('swaps in a cold lazy component when it lands', async () => {
    const { makeApp } = load(BARE_SRC);
    const { view, setShow } = makeApp();
    const container = document.createElement('div');
    document.body.appendChild(container);
    DOM.render(() => view(), container);
    expect(container.textContent).toContain('HOME');

    setShow(true);
    await tick();
    expect(container.textContent).toContain('LOADING');

    await (globalThis as any).__landBare();
    await tick();
    expect(container.textContent).toContain('LATE');
    container.remove();
  });
});

describe('navigating to a route chunk that is not loaded yet', () => {
  it('renders the page when the chunk lands, and keeps working across routes', async () => {
    (globalThis as any).__land = {};
    history.replaceState(null, '', '/');
    const { App } = load(APP_SRC);

    const container = document.createElement('div');
    document.body.appendChild(container);
    DOM.render(() => App(), container);
    expect(container.textContent).toContain('HOME');

    // Cold navigation: the import starts now, and the router does not commit until it
    // resolves. The previous page stays up rather than being replaced by a fallback —
    // the old route is removed only once the new one can render.
    history.pushState(null, '', '/one');
    dispatchEvent(new PopStateEvent('popstate'));
    await tick();
    expect(container.textContent).toContain('HOME');
    expect(container.textContent).not.toContain('LOADING');

    await (globalThis as any).__land.one();
    await tick();
    expect(container.querySelectorAll('.one').length).toBe(1);
    expect(container.textContent).toContain('ONE');
    expect(container.textContent).not.toContain('LOADING');

    // A second cold chunk, reached from the first.
    history.pushState(null, '', '/two');
    dispatchEvent(new PopStateEvent('popstate'));
    await tick();
    await (globalThis as any).__land.two();
    await tick();
    expect(container.textContent).toContain('TWO');

    // Back to the first, now resolved: it must render on the synchronous fast path.
    history.pushState(null, '', '/one');
    dispatchEvent(new PopStateEvent('popstate'));
    await tick();
    expect(container.querySelectorAll('.one').length).toBe(1);
    expect(container.textContent).toContain('ONE');

    container.remove();
  });
});
