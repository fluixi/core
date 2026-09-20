// @vitest-environment jsdom
import { compile as compileFixture } from '../../../test/fixtures.js';
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * `ref` must reach the runtime as the function itself.
 *
 * The compiler used to treat `ref={mergeRefs(a, b)}` as a reactive expression, a call
 * expression, so wrap it: and emitted `ref: () => mergeRefs(a, b)`. The runtime calls
 * `ref(element)`, so it invoked the thunk instead: the real callback never saw the
 * element, and everything hanging off that reference (press state, forwarded refs,
 * activation handlers) stopped working with nothing reported.
 *
 * Asserted by running the callback rather than by matching emitted code, because the
 * emitted shape was plausible: it was the behaviour that was wrong.
 */
const compile = (src: string) =>
  compileFixture(src, { signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' });

function load(src: string, scope: Record<string, unknown>) {
  const cjs = babel.transformSync(compile(src), {
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

describe('ref', () => {
  it('passes the element to a call-expression ref', () => {
    let seen: unknown;
    const mergeRefs = (fn: (el: Element) => void) => fn;

    S.createRoot(() => {
      load(
        'import { mergeRefs } from "./helpers";\n' +
          'export const V = (set) => <button ref={mergeRefs(set)}>hi</button>;',
        { mergeRefs },
      ).V((el: Element) => (seen = el));
    });

    expect(seen).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes the element to a plain function ref', () => {
    let seen: unknown;

    S.createRoot(() => {
      load('export const V = (set) => <button ref={set}>hi</button>;', {}).V(
        (el: Element) => (seen = el),
      );
    });

    expect(seen).toBeInstanceOf(HTMLButtonElement);
  });
});
