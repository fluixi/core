// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import imperativePlugin from '@fluixi/compiler/babel';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
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
  const step1 = babel.transformSync(src, { filename: 't.tsx', configFile: false, babelrc: false, plugins: [[imperativePlugin as any, opts]] })!.code!;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsTransform] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('#3 spread wires delegated event handlers', () => {
  it('onInput passed via spread fires', async () => {
    const src = `
      import { createSignal } from '@fluixi/core';
      let calls = 0;
      export function App() {
        const handlers = { onInput: () => { calls++; } };
        return <input {...handlers} />;
      }
      export function count() { return calls; }
    `;
    const mod = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => mod.App(), document.getElementById('app'));
    await tick();
    const input = document.querySelector('input')!;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(mod.count()).toBe(1);
  });
});

describe('#4 call-expression child is reactive', () => {
  it('{rendered()} updates when the signal changes', async () => {
    const src = `
      import { createSignal } from '@fluixi/core';
      const [n, setN] = createSignal(1);
      const rendered = () => 'v' + n();
      export function App() { return <span class="t">{rendered()}</span>; }
      export function bump() { setN(2); }
    `;
    const mod = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => mod.App(), document.getElementById('app'));
    await tick();
    expect(document.querySelector('.t')!.textContent).toBe('v1');
    mod.bump();
    await tick(); await tick();
    expect(document.querySelector('.t')!.textContent).toBe('v2');
  });
});
