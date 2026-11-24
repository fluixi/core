// @vitest-environment jsdom
/**
 * Regression: a component whose ENTIRE return is a control-flow result (<Show>/<Switch>/<For>)
 * whose condition reads a context value updated by a sibling must re-render when that value
 * changes. The bare control-flow memo returned by the component must stay tracked on insertion,
 * not be cached once. Compiles real JSX through the imperative backend.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import { ensureIntegration } from './render/component.js';
import './client/index.js';

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
          else props.push(t.objectProperty(t.identifier(s.imported.name), t.identifier(s.local.name), false, s.imported.name === s.local.name));
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
            ...names.map((n) => t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n)))),
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
};

function load(src: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
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

describe('bare control-flow return with sibling-updated context', () => {
  const SRC = (flow: string) => `
    import { createSignal, createContext, useContext, ${flow} } from '@fluixi/core';
    const Ctx = createContext();
    function Root(props) {
      const [open, setOpen] = createSignal(false);
      return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
    }
    function Trigger() {
      const c = useContext(Ctx);
      return <button onClick={() => c.setOpen(true)}>x</button>;
    }
    ${flow === 'Show'
      ? `function Content() { const c = useContext(Ctx); return <Show when={() => c.open()}>{() => <div role="dialog" />}</Show>; }`
      : `function Content() { const c = useContext(Ctx); return <Switch><Match when={() => c.open()}>{() => <div role="dialog" />}</Match></Switch>; }`}
    export function App() { return <Root><Trigger /><Content /></Root>; }
  `;

  const FRAGMENT_SRC = `
    import { createSignal, createContext, useContext, Show } from '@fluixi/core';
    const Ctx = createContext();
    function Root(props) {
      const [open, setOpen] = createSignal(false);
      return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
    }
    function Trigger() { const c = useContext(Ctx); return <button onClick={() => c.setOpen(true)}>x</button>; }
    function Content() { const c = useContext(Ctx); return <><Show when={() => c.open()}>{() => <div role="dialog" />}</Show></>; }
    export function App() { return <Root><Trigger /><Content /></Root>; }
  `;

  it('re-renders a bare <Show> when a sibling toggles the context signal', async () => {
    const { App } = load(SRC('Show'));
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => (App as any)(), document.getElementById('app')!);
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('re-renders a bare <Switch>/<Match> the same way', async () => {
    const { App } = load(SRC('Switch, Match'));
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => (App as any)(), document.getElementById('app')!);
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('re-renders when the control-flow return is wrapped in a Fragment', async () => {
    const { App } = load(FRAGMENT_SRC);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => (App as any)(), document.getElementById('app')!);
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });
});

describe('owner wiring in control-flow thunks', () => {
  it('#2 fires onMount for a component created inside a <Show> child thunk', async () => {
    const src = `
      import { createSignal, onMount, Show } from '@fluixi/core';
      let mounted = 0;
      function Inner() { onMount(() => { mounted++; }); return <div role="dialog" />; }
      const [open, setOpen] = createSignal(false);
      export function App() { return <Show when={() => open()}>{() => <Inner />}</Show>; }
      export function toggle() { setOpen(true); }
      export function count() { return mounted; }
    `;
    const mod = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => mod.App(), document.getElementById('app')!);
    await tick();
    mod.toggle();
    await tick(); await tick();
    expect(mod.count()).toBe(1);
  });

  it('#3 resolves each sibling provider for a consumer inside Portal+Show', async () => {
    const src = `
      import { createContext, useContext, Portal, Show } from '@fluixi/core';
      const Ctx = createContext();
      function Menu(props) { return <Ctx.Provider value={{ id: props.id }}>{props.children}</Ctx.Provider>; }
      function Content() { const c = useContext(Ctx); return <Portal><Show when={() => true}>{() => <div class="item" data-id={c.id} />}</Show></Portal>; }
      export function App() { return <><Menu id="A"><Content /></Menu><Menu id="B"><Content /></Menu></>; }
    `;
    const { App } = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => App(), document.getElementById('app')!);
    await tick(); await tick();
    const ids = [...document.querySelectorAll('.item')].map((e) => e.getAttribute('data-id')).sort();
    expect(ids).toEqual(['A', 'B']);
  });
});
