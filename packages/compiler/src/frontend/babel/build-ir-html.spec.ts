// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { buildIR } from './build-ir.js';
import { buildIRFromHtml } from './build-ir-html.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

/**
 * An `` html`...` `` template and its JSX twin flow through the SAME compiler, one IR,
 * one backend: and emit byte-identical code. That is what let the template layer become
 * a compile target instead of the runtime directive bridge it started as.
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
const emitHtml = (src: string, svg = false) =>
  imperativeBackend.emit(buildIRFromHtml(findNode(src, 'TaggedTemplateExpression', ['typescript']), new Set(), { svg }), {} as any);

/** Run emitted code against the real @fluixi/dom runtime in jsdom. */
function run(
  res: { code: string; imports: string[]; templates?: { id: string; html: string }[] },
  vars: Record<string, any> = {},
): any {
  const runtimeVals = res.imports.map((n) => (DOM as any)[n] ?? (S as any)[n]);
  const userNames = Object.keys(vars);
  const decls = (res.templates ?? [])
    .map((t) => `const ${t.id} = ${JSON.stringify(t.html)};`)
    .join('\n');
  const fn = new Function(...res.imports, ...userNames, `${decls}\nreturn (${res.code});`);
  return fn(...runtimeVals, ...userNames.map((k) => vars[k]));
}

describe('html → shared compiler', () => {
  it('emits byte-identical code to the JSX twin: event + child hole', () => {
    const tagged = emitHtml('html`<button @click=${f}>${label()}</button>`');
    const jsx = emitJSX('(<button onClick={f}>{label()}</button>)');
    expect(tagged.code).toBe(jsx.code);
    expect(new Set(tagged.imports)).toEqual(new Set(jsx.imports));
  });

  it('matches: static attr + nested element + text', () => {
    const tagged = emitHtml('html`<div class="box"><span>Count: ${count()}</span></div>`');
    const jsx = emitJSX('(<div class="box"><span>Count: {count()}</span></div>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: dynamic attribute (reactive) + self-closing', () => {
    const tagged = emitHtml('html`<input value=${name()} /><br/>`'); // fragment
    const jsx = emitFragJSX('(<><input value={name()} /><br/></>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: capitalized tag compiles as a component', () => {
    const tagged = emitHtml('html`<Show when=${cond()}>${body()}</Show>`');
    const jsx = emitJSX('(<Show when={cond()}>{body()}</Show>)');
    expect(tagged.code).toBe(jsx.code);
    expect(new Set(tagged.imports)).toEqual(new Set(jsx.imports));
  });

  it('matches: For control flow with a render-prop child', () => {
    const tagged = emitHtml('html`<For each=${items()}>${(x) => x}</For>`');
    const jsx = emitJSX('(<For each={items()}>{(x) => x}</For>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: member-expression component tag', () => {
    const tagged = emitHtml('html`<Ctx.Provider value=${v()}>${kids}</Ctx.Provider>`');
    const jsx = emitJSX('(<Ctx.Provider value={v()}>{kids}</Ctx.Provider>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: mixed text + hole attribute value (reactive template literal)', () => {
    const tagged = emitHtml('html`<div class="box ${active()}"></div>`');
    const jsx = emitJSX('(<div class={`box ${active()}`}></div>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: quoted single hole === unquoted single hole', () => {
    const q = emitHtml('html`<input value="${name()}" />`');
    const u = emitHtml('html`<input value=${name()} />`');
    expect(q.code).toBe(u.code);
  });

  it('matches: spread ${obj} in tag position', () => {
    const tagged = emitHtml('html`<div ${props}>hi</div>`');
    const jsx = emitJSX('(<div {...props}>hi</div>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: html comments are dropped like JSX comments', () => {
    const tagged = emitHtml('html`<div><!-- note -->${x()}</div>`');
    const jsx = emitJSX('(<div>{/* note */}{x()}</div>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('matches: nested html`` in a child hole (composition)', () => {
    const tagged = emitHtml('html`<ul>${items().map((x) => html`<li>${x}</li>`)}</ul>`');
    const jsx = emitJSX('(<ul>{items().map((x) => <li>{x}</li>)}</ul>)');
    expect(tagged.code).toBe(jsx.code);
    expect(new Set(tagged.imports)).toEqual(new Set(jsx.imports));
  });

  it('handles a typed arrow param in a hole (TS annotation survives reparse)', () => {
    // (n: number) => ... in a hole must not break the emitted-code reparse.
    const tagged = emitHtml('html`<For each=${xs()}>${(n: number) => html`<li>${n}</li>`}</For>`');
    expect(tagged.code).toContain('createComponent(For');
    expect(tagged.code).toMatch(/createNativeElement\("li"\)|<li>/);
  });

  it('matches: nested html`` in a ternary hole', () => {
    const tagged = emitHtml('html`<div>${ok() ? html`<b>y</b>` : html`<i>n</i>`}</div>`');
    const jsx = emitJSX('(<div>{ok() ? <b>y</b> : <i>n</i>}</div>)');
    expect(tagged.code).toBe(jsx.code);
  });

  it('svg`` marks the whole subtree as SVG', () => {
    const svg = emitHtml('svg`<svg><g><unknownTag /></g></svg>`', true);
    // every element created with the SVG flag (createNativeElement(tag, true))
    expect(svg.code).not.toMatch(/createNativeElement\("unknownTag"\)/);
    expect(svg.code).toMatch(/createNativeElement\("unknownTag", true\)/);
    expect(svg.code).toMatch(/createNativeElement\("g", true\)/);
  });

  it('raw-text element keeps its content verbatim and interpolates holes', () => {
    (S as any); // keep import
    const [css, setCss] = S.createSignal('a{}');
    const el = run(emitHtml('html`<style>.x{} ${css()}</style>`'), { css }) as HTMLStyleElement;
    expect(el.tagName).toBe('STYLE');
    expect(el.textContent).toContain('.x{}');
    expect(el.textContent).toContain('a{}');
    setCss('b{}');
  });

  it('the emitted html code actually renders, reacts, and handles events', async () => {
    (DOM as any).delegateEvents(['click']); // install the delegated click listener
    const [label, setLabel] = S.createSignal('hi');
    let clicks = 0;
    const el = run(emitHtml('html`<button @click=${f}>${label()}</button>`'), {
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
