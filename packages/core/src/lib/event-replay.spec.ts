// @vitest-environment jsdom
/**
 * Event-replay integration: a click fired BEFORE hydration is replayed once the
 * delegated handlers are wired, so the interaction isn't lost.
 *
 * Server-render a <button onClick> to HTML, put it in #app, record a click on that
 * button in window.__FX_REPLAY__ (what the server's eventCaptureScript would do),
 * then startClient(hydrate) — which re-wires the handler over the reused DOM and
 * calls replayEvents(). Asserts the handler ran (and the reactive update landed).
 *
 * Compiles REAL JSX through the imperative backend so the onClick goes through the
 * runtime's event delegation, exactly like an app.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import { renderToString, setServerMode } from '@fluixi/server';
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
              t.objectProperty(
                t.identifier(s.imported.name),
                t.identifier(s.local.name),
                false,
                s.imported.name === s.local.name,
              ),
            );
        }
        const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]);
        const decls: any[] = [];
        if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
        if (defName)
          decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
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

beforeAll(() => ensureIntegration());

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('event-replay (hydration)', () => {
  it('replays a click fired before hydration', async () => {
    const src = `
      import { createSignal } from '@fluixi/core';
      export function App() {
        const [n, setN] = createSignal(0);
        return (
          <button onClick={() => { (window).__hits = ((window).__hits||0)+1; setN(n()+1); }}>
            {n()}
          </button>
        );
      }
    `;
    const { App } = load(src);

    // 1. Server render the button.
    setServerMode(true);
    const html = renderToString(() => App());
    setServerMode(false);
    expect(html).toContain('<button');

    // 2. Put it in the page (as the server would).
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const btn = document.querySelector('#app button')!;

    // 3. Simulate the capture script having recorded an early click on the button.
    (window as any).__hits = 0;
    (window as any).__FX_REPLAY__ = [{ type: 'click', target: btn }];
    (window as any).__FX_REPLAY_STOP__ = () => {};

    // 4. Hydrate — wires the handler over the reused DOM, then replays.
    startClient(App as any, { root: '#app', hydrate: true });
    await tick();

    // The replayed click fired the delegated handler (and the queue was drained).
    expect((window as any).__hits).toBe(1);
    expect((window as any).__FX_REPLAY__).toBeUndefined();
    expect(btn.textContent?.trim()).toBe('1');
  });
});
