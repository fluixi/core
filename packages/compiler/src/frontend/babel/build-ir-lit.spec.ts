// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { buildIR } from './build-ir.js';
import { buildIRFromLit } from './build-ir-lit.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * The spike thesis: a lit `` html`...` `` template and its JSX twin flow through the
 * SAME compiler (one IR, one backend) and emit byte-identical code — proving lit-html
 * can share the JSX compiler instead of needing the runtime `litrx` directive bridge.
 */

function findNode(src: string, type: string, plugins: string[]): any {
  const ast = babel.parseSync(src, { configFile: false, babelrc: false, parserOpts: { plugins: plugins as any } });
  let found: any = null;
  const walk = (n: any) => {
    if (!n || found || typeof n !== 'object') return;
    if (n.type === type) { found = n; return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  };
  walk(ast);
  if (!found) throw new Error(`no ${type} in: ${src}`);
  return found;
}

const emitJSX = (src: string) => imperativeBackend.emit(buildIR(findNode(src, 'JSXElement', ['jsx'])), {} as any);
const emitFragJSX = (src: string) => imperativeBackend.emit(buildIR(findNode(src, 'JSXFragment', ['jsx'])), {} as any);
const emitLit = (src: string) => imperativeBackend.emit(buildIRFromLit(findNode(src, 'TaggedTemplateExpression', [])), {} as any);

/** Run emitted code against the real @fluixi/dom runtime in jsdom. */
function run(res: { code: string; imports: string[] }, vars: Record<string, any> = {}): any {
  const runtimeVals = res.imports.map((n) => (DOM as any)[n] ?? (S as any)[n]);
  const userNames = Object.keys(vars);
  const fn = new Function(...res.imports, ...userNames, `return (${res.code});`);
  return fn(...runtimeVals, ...userNames.map((k) => vars[k]));
}

describe('lit → shared compiler (spike)', () => {
  it('emits byte-identical code to the JSX twin: event + child hole', () => {
    const lit = emitLit('html`<button @click=${f}>${label()}</button>`');
    const jsx = emitJSX('(<button onClick={f}>{label()}</button>)');
    expect(lit.code).toBe(jsx.code);
    expect(new Set(lit.imports)).toEqual(new Set(jsx.imports));
  });

  it('matches: static attr + nested element + text', () => {
    const lit = emitLit('html`<div class="box"><span>Count: ${count()}</span></div>`');
    const jsx = emitJSX('(<div class="box"><span>Count: {count()}</span></div>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: dynamic attribute (reactive) + self-closing', () => {
    const lit = emitLit('html`<input value=${name()} /><br/>`'); // fragment
    const jsx = emitFragJSX('(<><input value={name()} /><br/></>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: capitalized tag compiles as a component', () => {
    const lit = emitLit('html`<Show when=${cond()}>${body()}</Show>`');
    const jsx = emitJSX('(<Show when={cond()}>{body()}</Show>)');
    expect(lit.code).toBe(jsx.code);
    expect(new Set(lit.imports)).toEqual(new Set(jsx.imports));
  });

  it('matches: For control flow with a render-prop child', () => {
    const lit = emitLit('html`<For each=${items()}>${(x) => x}</For>`');
    const jsx = emitJSX('(<For each={items()}>{(x) => x}</For>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: member-expression component tag', () => {
    const lit = emitLit('html`<Ctx.Provider value=${v()}>${kids}</Ctx.Provider>`');
    const jsx = emitJSX('(<Ctx.Provider value={v()}>{kids}</Ctx.Provider>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: mixed text + hole attribute value (reactive template literal)', () => {
    const lit = emitLit('html`<div class="box ${active()}"></div>`');
    const jsx = emitJSX('(<div class={`box ${active()}`}></div>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: quoted single hole === unquoted single hole', () => {
    const q = emitLit('html`<input value="${name()}" />`');
    const u = emitLit('html`<input value=${name()} />`');
    expect(q.code).toBe(u.code);
  });

  it('matches: spread ${obj} in tag position', () => {
    const lit = emitLit('html`<div ${props}>hi</div>`');
    const jsx = emitJSX('(<div {...props}>hi</div>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('matches: html comments are dropped like JSX comments', () => {
    const lit = emitLit('html`<div><!-- note -->${x()}</div>`');
    const jsx = emitJSX('(<div>{/* note */}{x()}</div>)');
    expect(lit.code).toBe(jsx.code);
  });

  it('raw-text element keeps its content verbatim and interpolates holes', () => {
    (S as any); // keep import
    const [css, setCss] = S.createSignal('a{}');
    const el = run(emitLit('html`<style>.x{} ${css()}</style>`'), { css }) as HTMLStyleElement;
    expect(el.tagName).toBe('STYLE');
    expect(el.textContent).toContain('.x{}');
    expect(el.textContent).toContain('a{}');
    setCss('b{}');
  });

  it('the emitted lit code actually renders, reacts, and handles events', async () => {
    (DOM as any).delegateEvents(['click']); // install the delegated click listener
    const [label, setLabel] = S.createSignal('hi');
    let clicks = 0;
    const el = run(emitLit('html`<button @click=${f}>${label()}</button>`'), {
      f: () => clicks++,
      label,
    }) as HTMLElement;

    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toBe('hi');

    // reactive: updating the signal updates the DOM text
    setLabel('bye');
    await (S as any).flush();
    expect(el.textContent).toBe('bye');

    // delegated event fires
    document.body.appendChild(el);
    el.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toBe(1);
  });
});
