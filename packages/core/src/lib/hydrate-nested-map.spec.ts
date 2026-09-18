// @vitest-environment jsdom
/**
 * Repro: nested `.map()` children duplicate on hydration. The docs sidebar shape
 * an outer `list.map(group => <div><div class="title"/>{group.items.map(i => <a class="item"/>)}</div>)`
 *: server-renders N items but hydration produces ~2N: the INNER mapped array (a sibling after a
 * non-array element) is re-inserted fresh instead of adopting the server nodes.
 *
 * Compiles real JSX through the imperative backend, server-renders, then hydrates.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
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
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsTransform] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => { if (id in REQUIRE_MAP) return REQUIRE_MAP[id]; throw new Error('unexpected require: ' + id); };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

describe('hydration: nested .map() children', () => {
  it('adopts inner mapped-array items instead of duplicating them', async () => {
    const src = `
      const GROUPS = [
        { title: 'A', items: ['a1', 'a2', 'a3'] },
        { title: 'B', items: ['b1', 'b2'] },
      ];
      export function App() {
        return (
          <aside class="side">
            {GROUPS.map((g) => (
              <div class="group">
                <div class="title">{g.title}</div>
                {g.items.map((i) => (
                  <a class="item" href={'/' + i}>{i}</a>
                ))}
              </div>
            ))}
          </aside>
        );
      }
    `;
    const { App } = load(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    // Server rendered 5 items across 2 groups.
    const serverItems = (html.match(/class="item"/g) || []).length;
    expect(serverItems).toBe(5);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const firstServerItem = container.querySelector('.item');

    DOM.hydrate(() => App(), container);
    await tick();
    await tick();

    expect(container.querySelectorAll('.side').length).toBe(1);
    expect(container.querySelectorAll('.group').length).toBe(2);
    expect(container.querySelectorAll('.title').length).toBe(2);
    // The bug: inner mapped items duplicated (5 -> 9). Must adopt the server nodes in place.
    expect(container.querySelectorAll('.item').length).toBe(5);
    // And it must have reused the server DOM, not rebuilt a fresh copy.
    expect(container.querySelector('.item')).toBe(firstServerItem);
  });
});
