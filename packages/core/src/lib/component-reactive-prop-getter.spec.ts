// @vitest-environment jsdom
// A reactive prop on a component (<Comp prop={sig()} />) must NOT re-create the
// component on every change — it should be created once and reactivity flows
// through a prop getter. Otherwise a component rendering a <Portal> re-mounts and
// the portaled nodes pile up in <body>.
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from 'fluixi';
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

const REQUIRE_MAP: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, 'fluixi': Fluixi };
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

describe('reactive prop on a component does not re-create it', () => {
  it('component runs once; reactivity flows through the prop', async () => {
    const mod = load(`
      import { createSignal } from 'fluixi';
      let runCount = 0;
      function Label(props) { runCount++; return <span class="v">{props.n}</span>; }
      const [n, setN] = createSignal(1);
      export function App() { return <div><Label n={n()} /></div>; }
      export function bump() { setN(2); }
      export function runs() { return runCount; }
    `);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => mod.App(), document.getElementById('app'));
    await tick();
    expect(document.querySelector('.v')!.textContent).toBe('1');
    mod.bump(); await tick(); await tick();
    // reactivity reflected AND component executed exactly once (no re-create)
    expect(document.querySelector('.v')!.textContent).toBe('2');
    expect(mod.runs()).toBe(1);
  });

  it('a component rendering a <Portal> does not pile up in <body>', async () => {
    const mod = load(`
      import { createSignal, Portal } from 'fluixi';
      function Modal(props) { return <Portal><div class="modal" data-n={props.n} /></Portal>; }
      const [n, setN] = createSignal(1);
      export function App() { return <div><Modal n={n()} /></div>; }
      export function bump() { setN(n() + 1); }
    `);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => mod.App(), document.getElementById('app'));
    await tick(); await tick();
    expect(document.querySelectorAll('.modal').length).toBe(1);
    mod.bump(); await tick(); await tick();
    mod.bump(); await tick(); await tick();
    // exactly one portaled node — not one per prop change
    expect(document.querySelectorAll('.modal').length).toBe(1);
    expect(document.querySelector('.modal')!.getAttribute('data-n')).toBe('3');
  });
});
