// @vitest-environment jsdom
/**
 * A Suspense fallback that is not shown takes no hydration keys on the server, as in the browser,
 * where it is built off the cursor. Keyed on one side only, it shifted every key after it: no
 * server element was claimed by its key, and the page hydrated by position alone.
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

describe('hydration keys around a Suspense fallback', () => {
  const page = (fallback: string) => `
    import { Suspense } from '@fluixi/core';
    function Content() { return <main class="content"><p>ready</p></main>; }
    export function App() {
      return (
        <div class="root">
          <Suspense ${fallback}><Content /></Suspense>
          <footer class="after">end</footer>
        </div>
      );
    }
  `;
  const serverHtml = async (src: string) => {
    const { App } = load(src);
    setServerMode(true);
    try {
      return await renderToStringAsync(() => App());
    } finally {
      setServerMode(false);
    }
  };

  it('leaves the keys of the content and what follows as they are without a fallback', async () => {
    const withFallback = await serverHtml(page('fallback={<div class="spinner" />}'));
    const without = await serverHtml(page(''));
    expect(withFallback).not.toContain('spinner');
    expect(withFallback).toBe(without);
  });

  it('hydrates the content by its keys', async () => {
    const src = page('fallback={<div class="spinner" />}');
    const html = await serverHtml(src);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const content = container.querySelector('.content');
    const after = container.querySelector('.after');
    const { App } = load(src);
    DOM.hydrate(() => App(), container);
    await tick();
    await tick();
    expect(container.querySelector('.content')).toBe(content);
    expect(container.querySelector('.after')).toBe(after);
    expect(container.querySelectorAll('.content, .after').length).toBe(2);
  });
});
