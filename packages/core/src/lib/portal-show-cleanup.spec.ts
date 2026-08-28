// @vitest-environment jsdom
/**
 * Bug: onCleanup for <Portal> children inside a closing <Show> runs a tick late,
 * leaking document listeners. Compiled through the imperative backend (the memo-
 * wrapped createComponent form is where the owner deferral happens — the direct
 * runtime call disposes synchronously, so this must go through the compiler).
 */
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
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

beforeAll(() => ensureIntegration());

const PRELUDE = `
  import { createSignal, onCleanup, onMount, createContext, useContext, Show, Portal } from 'fluixi';
  import { render } from '@fluixi/dom';
`;

// Each variant renders a differently-shaped Portal-in-Show; we measure when the
// portaled child's onCleanup fires relative to closing the Show.
const VARIANTS: Record<string, string> = {
  'element-child': `
    function Probe() { onCleanup(() => C.n++); return <div>probe</div>; }
    ${'const App = () => <Show when={open()}><Portal><Probe /></Portal></Show>;'}`,
  'function-child': `
    function Probe() { onCleanup(() => C.n++); return <div>probe</div>; }
    ${'const App = () => <Show when={open()}>{() => <Portal><Probe /></Portal>}</Show>;'}`,
  'nested-component': `
    function Probe() { onCleanup(() => C.n++); return <div>probe</div>; }
    function Inner() { return <Portal><Probe /></Portal>; }
    ${'const App = () => <Show when={open()}><Inner /></Show>;'}`,
  'onmount-listener': `
    function Probe() { onMount(() => { C.mounted++; onCleanup(() => C.n++); }); return <div>probe</div>; }
    ${'const App = () => <Show when={open()}><Portal><Probe /></Portal></Show>;'}`,
  'provider-boundary': `
    const Ctx = createContext(0);
    function Probe() { useContext(Ctx); onCleanup(() => C.n++); return <div>probe</div>; }
    ${'const App = () => <Show when={open()}><Portal><Ctx.Provider value={1}><Probe /></Ctx.Provider></Portal></Show>;'}`,
};

function buildSrc(variant: string): string {
  return `${PRELUDE}
    const C = { n: 0, mounted: 0 };
    const [open, setOpen] = createSignal(true);
    ${VARIANTS[variant]}
    export function run() {
      const root = document.createElement('div');
      const dispose = render(() => <App />, root);
      return { setOpen, cleaned: () => C.n, mounted: () => C.mounted, dispose };
    }`;
}

const microtask = () => new Promise<void>((r) => queueMicrotask(() => r()));

describe('Portal cleanup timing inside a closing Show (compiled)', () => {
  for (const variant of Object.keys(VARIANTS)) {
    it(`[${variant}] runs the portaled child onCleanup when the Show closes`, async () => {
      const { run } = load(buildSrc(variant));
      const app = run();
      // Let onMount microtasks run so any listeners/effects are actually installed.
      await microtask();
      S.flush();
      expect(app.cleaned()).toBe(0);

      app.setOpen(false);
      S.flush();
      await microtask();
      S.flush();

      app.dispose();
      // The portaled child's teardown must have run by the flush after close, not
      // leaked to a later unrelated flush.
      expect(app.cleaned()).toBe(1);
    });
  }
});

// The core bug: a listener attached in onMount whose owner is torn down BEFORE the
// mount microtask fires. Pre-fix, onMount ran on the dead owner — the listener was
// added but its onCleanup never fired (the disposed owner never tears down again).
const RACE_SRC = `${PRELUDE}
  const C = { added: 0, removed: 0 };
  const [open, setOpen] = createSignal(true);
  function Probe() {
    onMount(() => {
      const h = () => {};
      document.addEventListener('pointerdown', h, true);
      C.added++;
      onCleanup(() => { document.removeEventListener('pointerdown', h, true); C.removed++; });
    });
    return <div>probe</div>;
  }
  const App = () => <Show when={open()}><Portal><Probe /></Portal></Show>;
  export function run() {
    const root = document.createElement('div');
    const dispose = render(() => <App />, root);
    return { setOpen, added: () => C.added, removed: () => C.removed, dispose };
  }`;

describe('Portal onMount listener leak when Show closes before mount', () => {
  it('does not leak a document listener when the Show closes before onMount runs', async () => {
    const { run } = load(RACE_SRC);
    const app = run();
    // Close in the SAME tick — before the mount microtask fires.
    app.setOpen(false);
    S.flush();
    await microtask();
    S.flush();
    await microtask();

    app.dispose();
    // No net listener left attached (either it never ran, or it ran and cleaned up).
    expect(app.added() - app.removed()).toBe(0);
  });
});
