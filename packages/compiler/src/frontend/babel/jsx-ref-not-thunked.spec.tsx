// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import plugin from './plugin.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * `ref` must reach the runtime as the function itself, on BOTH codegen paths.
 *
 * The IR path used to treat `ref={mergeRefs(a, b)}` as a reactive expression — a call
 * expression, so wrap it — and emitted `ref: () => mergeRefs(a, b)`. The runtime calls
 * `ref(element)`, so it invoked the thunk instead: the real callback never saw the
 * element, and everything hanging off that reference (press state, forwarded refs,
 * activation handlers) stopped working with nothing reported.
 *
 * Asserted by running the callback rather than by matching emitted code, because the
 * emitted shape was plausible — it was the behaviour that was wrong.
 */
const compile = (src: string, codegen: 'inline' | 'ir') =>
  babel.transformSync(src, {
    filename: 't.tsx',
    configFile: false,
    babelrc: false,
    plugins: [[plugin, { backend: 'imperative', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', hoistStatics: false, codegen }]],
  })!.code!;

function load(src: string, codegen: 'inline' | 'ir', scope: Record<string, unknown>) {
  const cjs = babel.transformSync(compile(src, codegen), {
    filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin],
  })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id === '@fluixi/dom') return DOM;
    if (id === '@fluixi/reactive/signal') return S;
    if (id === './helpers') return scope;
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', cjs)(m.exports, req, m);
  return m.exports;
}

beforeAll(() => {
  DOM.registerCreateComponent(((C: any, p: any) => C(p)) as any);
});

describe.each(['inline', 'ir'] as const)('ref on the %s codegen', (codegen) => {
  it('passes the element to a call-expression ref', () => {
    let seen: unknown;
    const mergeRefs = (fn: (el: Element) => void) => fn;

    S.createRoot(() => {
      load(
        'import { mergeRefs } from "./helpers";\n' +
          'export const V = (set) => <button ref={mergeRefs(set)}>hi</button>;',
        codegen,
        { mergeRefs },
      ).V((el: Element) => (seen = el));
    });

    expect(seen).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes the element to a plain function ref', () => {
    let seen: unknown;

    S.createRoot(() => {
      load('export const V = (set) => <button ref={set}>hi</button>;', codegen, {}).V(
        (el: Element) => (seen = el),
      );
    });

    expect(seen).toBeInstanceOf(HTMLButtonElement);
  });
});
