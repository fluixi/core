// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from 'fluixi';
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
  'fluixi': Fluixi,
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
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('context for consumer passed as props.children through Portal/Show', () => {
  it('resolves each authoring provider, not the last sibling', async () => {
    const src = `
      import { createContext, useContext, Portal, Show } from 'fluixi';
      const Ctx = createContext('V');
      function Consumer() { return <span class="v" data-v={useContext(Ctx)} />; }
      function Wrapper(props) { return <Portal><Show when={() => true}>{() => props.children}</Show></Portal>; }
      function Prov(props) { return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>; }
      export function App() {
        return <>
          <Prov value="A"><Wrapper><Consumer /></Wrapper></Prov>
          <Prov value="B"><Wrapper><Consumer /></Wrapper></Prov>
        </>;
      }
    `;
    const { App } = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => (App as any)(), document.getElementById('app'));
    await tick(); await tick();
    const ids = [...document.querySelectorAll('.v')].map((e) => e.getAttribute('data-v')).sort();
    expect(ids).toEqual(['A', 'B']);
  });

  it('raw reactive createContext: wrapper reads ctx in its own scope too', async () => {
    const src = `
      import { createContext, useContext } from '@fluixi/reactive/signal';
      import { Portal, Show } from 'fluixi';
      const Ctx = createContext('V');
      function Consumer() { return <span class="v" data-v={useContext(Ctx)} />; }
      function Wrapper(props) {
        const own = useContext(Ctx);
        return <Portal><Show when={() => true}>{() => props.children}</Show></Portal>;
      }
      function Prov(props) { return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>; }
      export function App() {
        return <>
          <Prov value="A"><Wrapper><Consumer /></Wrapper></Prov>
          <Prov value="B"><Wrapper><Consumer /></Wrapper></Prov>
        </>;
      }
    `;
    const { App } = load(src);
    document.body.innerHTML = '<div id="app"></div>';
    DOM.render(() => (App as any)(), document.getElementById('app'));
    await tick(); await tick();
    const ids = [...document.querySelectorAll('.v')].map((e) => e.getAttribute('data-v')).sort();
    expect(ids).toEqual(['A', 'B']);
  });
});
