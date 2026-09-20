// @vitest-environment jsdom
import { compile } from '../../../test/fixtures.js';
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * Template-cloned elements inserted as an ARRAY must keep their identity.
 *
 * `cloneTemplate` returns the clone still inside its DocumentFragment, so the element
 * arrives at `reconcileArrays` with a non-null parent. The guard there, which exists to
 * avoid stealing a module-hoisted static node from another parent, treated the fragment
 * as such an owner and cloned the element again. `cloneNode` copies attributes but not
 * event-handler properties, so the live DOM ended up holding handler-less copies while
 * the nodes that had been wired up were discarded, unconnected.
 *
 * It needed both `templateClone` (to produce the fragment parent) and `partialTemplates`
 * (to give the parent a hole), plus two siblings so the hole received an array, one
 * child takes a different insert path and always worked. That combination is the default
 * on the IR codegen, which is how a component library hit it and the framework's own
 * tests did not.
 */
const OPTS = {
  templateClone: true,
  partialTemplates: true,
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};

function load(src: string) {
  const esm = compile(src, OPTS);
  const cjs = babel.transformSync(esm, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id === '@fluixi/dom') return DOM;
    if (id === '@fluixi/reactive/signal') return S;
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', cjs)(m.exports, req, m);
  return m.exports;
}

const SRC = `
import { createSignal } from '@fluixi/reactive/signal';
export const built = [];
const Item = (p) => <li data-i>{p.children}</li>;
const List = (p) => <ul data-l>{p.children}</ul>;
const make = (n, setN, label) => (
  <Item><button ref={(e) => built.push(e)} onClick={() => setN(n() + 1)}>{label}</button></Item>
);
export function One() {
  const [n, setN] = createSignal(0);
  return <div><List>{make(n, setN, 'A')}</List><span>{n()}</span></div>;
}
export function Two() {
  const [n, setN] = createSignal(0);
  return <div><List>{make(n, setN, 'A')}{make(n, setN, 'B')}</List><span>{n()}</span></div>;
}`;

beforeAll(() => DOM.registerCreateComponent(((C: any, p: any) => C(p)) as any));

describe.each(['One', 'Two'])('a hole holding %s cloned item(s)', (name) => {
  it('keeps the built element in the DOM, handlers and all', () => {
    const mod = load(SRC);
    const host = document.createElement('div');
    document.body.append(host);

    DOM.render(() => mod[name](), host);

    const inDom = [...host.querySelectorAll('button')];
    // The nodes in the document must BE the ones that were built, not copies of them.
    expect(inDom.map((b) => mod.built.indexOf(b))).not.toContain(-1);
    expect(mod.built.every((b: Element) => b.isConnected)).toBe(true);

    inDom[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.querySelector('span')!.textContent).toBe('1');
  });
});
