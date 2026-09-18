// @vitest-environment jsdom
// Repro: <For> must remove dropped items when the child renders a context Provider
// wrapping a COMPONENT (Provider -> component boundary). Provider wrapping an inline
// element already works.
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import { ensureIntegration } from './render/component.js';

function cjsTransform({ types: t }: any): any {
  return { visitor: {
    ImportDeclaration(path: any) {
      const source = path.node.source.value; const props: any[] = []; let nsName: string | null = null; let defName: string | null = null;
      for (const s of path.node.specifiers) {
        if (t.isImportDefaultSpecifier(s)) defName = s.local.name;
        else if (t.isImportNamespaceSpecifier(s)) nsName = s.local.name;
        else props.push(t.objectProperty(t.identifier(s.imported.name), t.identifier(s.local.name), false, s.imported.name === s.local.name));
      }
      const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]); const decls: any[] = [];
      if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
      if (defName) decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
      if (props.length) decls.push(t.variableDeclarator(t.objectPattern(props), req));
      if (!decls.length) return path.remove();
      path.replaceWith(t.variableDeclaration('const', decls));
    },
    ExportNamedDeclaration(path: any) {
      if (path.node.declaration) {
        const decl = path.node.declaration; const names: string[] = [];
        if (t.isVariableDeclaration(decl)) for (const d of decl.declarations) names.push(d.id.name); else if (decl.id) names.push(decl.id.name);
        path.replaceWithMultiple([decl, ...names.map((n) => t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n))))]);
      }
    },
  } };
}

const REQUIRE_MAP: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi };
function load(src: string): any {
  const opts = { importSource: '@fluixi/jsx', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsTransform] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => { if (id in REQUIRE_MAP) return REQUIRE_MAP[id]; throw new Error('unexpected require: ' + id); };
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}
const tick = () => new Promise((r) => setTimeout(r, 0));
beforeAll(() => ensureIntegration());

async function mount(mod: any) {
  document.body.innerHTML = '<div id="app"></div>';
  DOM.render(() => mod.App(), document.getElementById('app'));
  await tick(); await tick();
}

describe('<For> + Provider -> component child removal', () => {
  it('removes dropped items (Provider wrapping a component)', async () => {
    const mod = load(`
      import { createSignal, createContext, For } from '@fluixi/core';
      const Ctx = createContext('P');
      const P = Ctx.Provider;
      function Row(props) { return <li class="row">{props.x}</li>; }
      const [items, setItems] = createSignal(['A', 'B', 'C']);
      export function App() {
        return <ul><For each={() => items().slice(-2)}>{(x) => <P value={x}><Row x={x} /></P>}</For></ul>;
      }
      export function push() { setItems([...items(), 'D']); }
    `);
    await mount(mod);
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['B', 'C']);
    mod.push(); await tick(); await tick();
    // window slid to ['C','D']: must be exactly two rows, not stale leftovers.
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['C', 'D']);
  });

  it('control: Provider wrapping an inline element works', async () => {
    const mod = load(`
      import { createSignal, createContext, For } from '@fluixi/core';
      const Ctx = createContext('P');
      const P = Ctx.Provider;
      const [items, setItems] = createSignal(['A', 'B', 'C']);
      export function App() {
        return <ul><For each={() => items().slice(-2)}>{(x) => <P value={x}><li class="row">{x}</li></P>}</For></ul>;
      }
      export function push() { setItems([...items(), 'D']); }
    `);
    await mount(mod);
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['B', 'C']);
    mod.push(); await tick(); await tick();
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['C', 'D']);
  });
});
