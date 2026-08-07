// @vitest-environment jsdom
// A bare <Show> as a DIRECT <For> child was documented as leaving a marker that
// defeated removal, so the advice was to wrap each row in a component. Verified
// fixed (alpha.44's per-slot insert registers onCleanup, which removes the slot's
// DOM along with its marker). Locked in here so the workaround stays unnecessary.
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import imperativePlugin from '@fluixi/compiler/babel';
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
  const opts = { backend: 'imperative' as const, importSource: '@fluixi/jsx', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', hoistStatics: true, optimizeControlFlow: true };
  const step1 = babel.transformSync(src, { filename: 't.tsx', configFile: false, babelrc: false, plugins: [[imperativePlugin as any, opts]] })!.code!;
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


describe('<For> with a bare <Show> child', () => {
  it('removes rows dropped from the end of the list', async () => {
    const mod = load(`
      import { createSignal, For, Show } from '@fluixi/core';
      const [items, setItems] = createSignal(['A', 'B', 'C']);
      const [on] = createSignal(true);
      export function App() {
        return <ul><For each={items}>{(x) => <Show when={on()}><li class="row">{x}</li></Show>}</For></ul>;
      }
      export function shrink() { setItems(['A']); }
    `);
    await mount(mod);
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['A', 'B', 'C']);

    mod.shrink(); await tick(); await tick();
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['A']);
    // No orphaned nodes — the whole point of the check. A template-cloned parent keeps one
    // `<!--fx-->`/`<!--fx/-->` pair per hole as the insertion boundary, so those are
    // structural rather than leftovers; what must not survive is a dropped row's DOM.
    const html = document.getElementById('app')!.innerHTML;
    expect(html.replace(/<!--fx\/?-->/g, '')).toBe('<ul><li class="row">A</li></ul>');
    // And the boundary must stay a single pair — accumulation would be the real leak.
    expect((html.match(/<!--fx/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('keeps a sliding window correct', async () => {
    const mod = load(`
      import { createSignal, For, Show } from '@fluixi/core';
      const [items, setItems] = createSignal(['A', 'B', 'C']);
      const [on] = createSignal(true);
      export function App() {
        return <ul><For each={() => items().slice(-2)}>{(x) => <Show when={on()}><li class="row">{x}</li></Show>}</For></ul>;
      }
      export function push() { setItems([...items(), 'D']); }
    `);
    await mount(mod);
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['B', 'C']);

    mod.push(); await tick(); await tick();
    expect([...document.querySelectorAll('.row')].map((l) => l.textContent)).toEqual(['C', 'D']);
  });
});
