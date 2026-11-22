// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { transformTemplates } from './templates.js';

const OPTS = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', runtimeModule: '@fluixi/dom' };

function compile(src: string): string {
  return transformTemplates(src, 't.tsx', OPTS)!.code;
}

function load(esm: string): any {
  const cjs = babel.transformSync(esm, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin] })!.code!;
  const m = { exports: {} as any };
  new Function('exports', 'require', 'module', cjs)(m.exports, (id: string) => {
    if (id === '@fluixi/dom') return DOM;
    if (id === '@fluixi/reactive/signal') return S;
    throw new Error('unexpected require: ' + id);
  }, m);
  return m.exports;
}

beforeAll(() => {
  DOM.registerCreateComponent(((C: any, p: any) => C(p)) as any);
});

const SRC = `export const seen = [];
export function View() {
  return <div><button onClick={() => seen.push('click')}>a</button><input onFocus={() => seen.push('focus')} /></div>;
}`;

describe('compiled event handlers', () => {
  it('stores a bubbling handler on the element and registers the event once per module', () => {
    const code = compile(SRC);
    expect(code).toContain('.$$click = ');
    expect(code).toContain('delegateEvents(["click"])');
  });

  it('gives a non-bubbling event its own listener', () => {
    const code = compile(SRC);
    expect(code).not.toContain('$$focus = ');
    expect(code).toContain('addDelegatedEventListener(');
  });

  it('runs both handlers in the browser', () => {
    const mod = load(compile(SRC));
    const host = document.createElement('div');
    document.body.append(host);
    S.createRoot(() => DOM.insert(host, () => mod.View(), null));
    host.querySelector('button')!.click();
    host.querySelector('input')!.dispatchEvent(new FocusEvent('focus'));
    expect(mod.seen).toEqual(['click', 'focus']);
    host.remove();
  });
});
