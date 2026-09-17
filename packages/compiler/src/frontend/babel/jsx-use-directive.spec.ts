// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import { compile as compileFixture } from '../../../test/fixtures.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * `use:` on the INLINE codegen path — the default, and the one where it silently did
 * nothing. The attribute reached the runtime as a prop literally named `use:tooltip`,
 * which nothing dispatches on, so the directive never ran and no error said so. The IR
 * path had always normalised it into a single `use` prop.
 *
 * These drive the whole plugin with its default options and assert the directive actually
 * runs, rather than asserting on emitted code — that is what the earlier tests missed.
 */
const OPTIONS = {
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};

const compile = (src: string, extra: Record<string, unknown> = {}) =>
  compileFixture(src, { ...OPTIONS, ...extra });

function load(src: string, scope: Record<string, unknown> = {}): any {
  const esm = compile(src);
  const code = babel.transformSync(esm, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsPlugin],
  })!.code!;

  const moduleObj = { exports: {} as any };
  const req = (id: string) => {
    if (id === '@fluixi/dom') return DOM;
    if (id === '@fluixi/reactive/signal') return S;
    if (id === './directives') return scope;
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', code)(moduleObj.exports, req, moduleObj);
  return moduleObj.exports;
}

beforeAll(() => {
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('use: on the inline codegen path', () => {
  it('runs the directive with the element and an options accessor', () => {
    const seen: any[] = [];
    const tooltip = (el: Element, value: () => any) => seen.push([el.tagName, value()]);

    S.createRoot(() => {
      const mod = load(
        'import { tooltip } from "./directives";\n' +
          'export const view = () => <div use:tooltip={{ text: "hi" }}></div>;',
        { tooltip },
      );
      mod.view();
    });

    expect(seen).toEqual([['DIV', { text: 'hi' }]]);
  });

  it('runs a bare use: directive with no options', () => {
    const seen: Element[] = [];
    const autofocus = (el: Element) => seen.push(el);

    S.createRoot(() => {
      load(
        'import { autofocus } from "./directives";\n' +
          'export const view = () => <input use:autofocus />;',
        { autofocus },
      ).view();
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].tagName).toBe('INPUT');
  });

  it('runs every directive when an element carries several', () => {
    const order: string[] = [];
    const one = () => order.push('one');
    const two = () => order.push('two');

    S.createRoot(() => {
      load(
        'import { one, two } from "./directives";\n' +
          'export const view = () => <div use:one use:two />;',
        { one, two },
      ).view();
    });

    expect(order).toEqual(['one', 'two']);
  });

  it('emits the normalized shape the runtime dispatches on', () => {
    // `use: [[dir, () => opts]]`, or the runtime sees a prop it does not dispatch
    // on and the directive is dropped in silence. The parens are the backend's;
    // nothing reprints the output, and esbuild drops them.
    const flat = (s: string) => s.replace(/\s+/g, ' ');
    const src = 'import { tip } from "./directives";\nexport const v = (o) => <div use:tip={o} />;';

    expect(flat(compile(src))).toContain('use: [[tip, () => o]]');
  });
});
