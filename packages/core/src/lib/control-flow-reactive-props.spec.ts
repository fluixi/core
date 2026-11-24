// @vitest-environment jsdom
// Repro: control-flow reactive props (each/when) in the CALLED shape (each={items()},
// when={cond()}) must update the DOM, matching accessor shapes.
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
  DOM.render(() => mod.App(), document.getElementById('app')!);
  await tick(); await tick();
}

describe('For each={items()} (called shape)', () => {
  it('updates the list when the signal changes', async () => {
    const mod = load(`
      import { createSignal, For } from '@fluixi/core';
      const [items, setItems] = createSignal(['a']);
      export function App() { return <ul><For each={items()}>{(i) => <li>{i}</li>}</For></ul>; }
      export function add() { setItems([...items(), 'b']); }
    `);
    await mount(mod);
    expect(document.querySelectorAll('li').length).toBe(1);
    mod.add(); await tick(); await tick();
    expect([...document.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['a', 'b']);
  });
});

describe('Show when={cond()} (called shape)', () => {
  it('toggles when the signal changes', async () => {
    const mod = load(`
      import { createSignal, Show } from '@fluixi/core';
      const [cond, setCond] = createSignal(false);
      export function App() { return <div><Show when={cond()}>{() => <span role="dialog" />}</Show></div>; }
      export function open() { setCond(true); }
    `);
    await mount(mod);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    mod.open(); await tick(); await tick();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });
});

describe('For each={items()} is fine-grained (not a full re-create)', () => {
  it('keeps existing DOM nodes when appending', async () => {
    const mod = load(`
      import { createSignal, For } from '@fluixi/core';
      const [items, setItems] = createSignal(['a']);
      export function App() { return <ul><For each={items()}>{(i) => <li>{i}</li>}</For></ul>; }
      export function add() { setItems([...items(), 'b']); }
    `);
    await mount(mod);
    const firstLi = document.querySelector('li');
    mod.add(); await tick(); await tick();
    // If the whole <For> were re-created, the original <li> node would be replaced.
    expect(document.querySelector('li')).toBe(firstLi);
    expect(document.querySelectorAll('li').length).toBe(2);
  });
});

describe('Index each={xs()} and Match when={m()} (called shape)', () => {
  it('Index reflows on signal change', async () => {
    const mod = load(`
      import { createSignal, Index } from '@fluixi/core';
      const [xs, setXs] = createSignal(['a']);
      export function App() { return <ul><Index each={xs()}>{(it) => <li>{it()}</li>}</Index></ul>; }
      export function add() { setXs(['a', 'b']); }
    `);
    await mount(mod);
    expect(document.querySelectorAll('li').length).toBe(1);
    mod.add(); await tick(); await tick();
    expect(document.querySelectorAll('li').length).toBe(2);
  });
  it('Switch/Match reacts to when={m()}', async () => {
    const mod = load(`
      import { createSignal, Switch, Match } from '@fluixi/core';
      const [n, setN] = createSignal(0);
      export function App() {
        return <Switch fallback={<span class="f" />}>
          <Match when={n() === 1}>{() => <span class="one" />}</Match>
        </Switch>;
      }
      export function go() { setN(1); }
    `);
    await mount(mod);
    expect(document.querySelector('.one')).toBeNull();
    mod.go(); await tick(); await tick();
    expect(document.querySelector('.one')).toBeTruthy();
  });
});

describe('regression: accessor shapes still work (no double-call)', () => {
  it('For each={items} (bare accessor)', async () => {
    const mod = load(`
      import { createSignal, For } from '@fluixi/core';
      const [items, setItems] = createSignal(['a']);
      export function App() { return <ul><For each={items}>{(i) => <li>{i}</li>}</For></ul>; }
      export function add() { setItems([...items(), 'b']); }
    `);
    await mount(mod);
    mod.add(); await tick(); await tick();
    expect([...document.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['a', 'b']);
  });
  it('Show when={() => cond()} (arrow accessor, no double-call)', async () => {
    const mod = load(`
      import { createSignal, Show } from '@fluixi/core';
      const [cond, setCond] = createSignal(false);
      export function App() { return <div><Show when={() => cond()}>{() => <span role="dialog" />}</Show></div>; }
      export function open() { setCond(true); }
    `);
    await mount(mod);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    mod.open(); await tick(); await tick();
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
