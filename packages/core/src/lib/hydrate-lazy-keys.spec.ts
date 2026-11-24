// @vitest-environment jsdom
/**
 * A lazy component keys its content the same whether its module was loaded already or not. The
 * server renders a page cold the first time; the browser preloads it before hydrating. Keyed one
 * scope apart, no server element was claimed by its key.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import { lazy } from './render/lazy.js';
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

beforeAll(() => ensureIntegration());

describe('hydration keys of a lazy component', () => {
  it('match between a cold render and a render with the module loaded', async () => {
    const { Page } = load(`
      export function Page() { return <main class="page"><h1>Title</h1><p>{'body'}</p></main>; }
    `);
    const LazyPage = lazy(() => Promise.resolve({ default: Page }));
    const { App } = load(`
      import { Suspense } from '@fluixi/core';
      export function App(props) { return <div class="root"><Suspense>{props.page()}</Suspense><footer>end</footer></div>; }
    `);
    const render = async () => {
      setServerMode(true);
      try {
        return await renderToStringAsync(() => App({ page: () => DOM.createComponent(LazyPage as never, {}) }));
      } finally {
        setServerMode(false);
      }
    };
    const cold = await render();
    const warm = await render();
    expect(cold).toContain('class="page"');
    expect(warm).toBe(cold);
  });
});
