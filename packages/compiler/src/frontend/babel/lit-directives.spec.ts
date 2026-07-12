// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import plugin from './plugin.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';

/**
 * Phase-2 directives added on top of the parser refactor: ref, the onClick
 * event alias, if/else, each/key, bind:, class:, style:. Driven through the
 * whole-file plugin so control-flow imports (Show/For) are injected exactly as
 * in a real build, then run against the live @fluixi/dom runtime.
 */
const LIT = {
  backend: 'imperative' as const,
  format: 'lit' as const,
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
  hoistStatics: false,
};

const compileEsm = (src: string) =>
  babel.transformSync(src, { filename: 't.tsx', configFile: false, babelrc: false, plugins: [[plugin, LIT]] })!.code!;

/** Collapse whitespace so assertions don't depend on the printer's line breaks. */
const flat = (s: string) => s.replace(/\s+/g, ' ');

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/reactive/store': Store,
};

function load(src: string): any {
  const esm = compileEsm(src);
  const code = babel.transformSync(esm, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin] })!.code!;
  const moduleObj = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', code)(moduleObj.exports, req, moduleObj);
  return moduleObj.exports;
}

beforeAll(() => {
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('lit directives — events & bindings', () => {
  it('onClick is a byte-identical alias for @click', () => {
    const at = compileEsm('export const r = (h) => html`<button @click=${h}>x</button>`;');
    const on = compileEsm('export const r = (h) => html`<button onClick=${h}>x</button>`;');
    expect(on).toBe(at);
  });

  it('ref binding emits a ref prop', () => {
    expect(compileEsm('export const r = (ref) => html`<input ref=${ref} />`;')).toContain('ref: ref');
  });

  it('property binding stays a property', () => {
    expect(compileEsm('export const r = (t) => html`<video .currentTime=${t()}></video>`;')).toContain('currentTime');
  });
});

describe('lit directives — class: / style:', () => {
  it('class: merges into a reactive classList map', () => {
    const code = compileEsm('export const r = (on, big) => html`<div class:active=${on()} class:big=${big()}></div>`;');
    expect(code).toContain('classList: () => ({');
    expect(code).toContain('"active": on()');
    expect(code).toContain('"big": big()');
  });

  it('style: merges into a reactive style object', () => {
    expect(compileEsm('export const r = (c) => html`<div style:color=${c()}></div>`;')).toContain('style: () => ({');
  });

  it('class: toggles a class at runtime', () => {
    const mod = load('export const render = (on) => html`<div class:active=${on()}></div>`;');
    const [on, setOn] = S.createSignal(false);
    const el = mod.render(on) as HTMLElement;
    expect(el.classList.contains('active')).toBe(false);
    setOn(true);
    S.flush();
    expect(el.classList.contains('active')).toBe(true);
  });
});

describe('lit directives — bind:', () => {
  it('bind:value expands to value + onInput on a signal tuple', () => {
    const code = compileEsm('export const r = (name) => html`<input bind:value=${name} />`;');
    expect(code).toContain('name[0]()');
    expect(code).toContain('name[1](e.target.value)');
  });

  it('bind:checked uses checked + onChange', () => {
    const code = compileEsm('export const r = (flag) => html`<input type="checkbox" bind:checked=${flag} />`;');
    expect(code).toContain('flag[0]()');
    expect(code).toContain('flag[1](e.target.checked)');
  });

  it('two-way updates the signal on input at runtime', () => {
    const mod = load('export const render = (name) => html`<input bind:value=${name} />`;');
    const sig = S.createSignal('a');
    const el = mod.render(sig) as HTMLInputElement;
    document.body.appendChild(el); // delegated events need the element in the tree
    expect(el.value).toBe('a');
    el.value = 'z';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(sig[0]()).toBe('z');
  });
});

describe('lit directives — if / else', () => {
  it('if lowers to <Show> and auto-imports it', () => {
    const code = compileEsm('export const r = (cond) => html`<div if=${cond()}>hi</div>`;');
    expect(code).toContain('createComponent');
    expect(flat(code)).toContain('get when() { return cond(); }');
    expect(code).toMatch(/import \{[^}]*\bShow\b[^}]*\} from "@fluixi\/dom"/);
  });

  it('if + else folds into a Show fallback', () => {
    const code = compileEsm('export const r = (cond) => html`<div if=${cond()}>yes</div><div else>no</div>`;');
    expect(code).toContain('get fallback()');
  });

  it('renders the branch and reacts at runtime', () => {
    const mod = load('export const render = (cond) => html`<span if=${cond()}>Y</span><span else>N</span>`;');
    const [cond, setCond] = S.createSignal(true);
    const host = document.createElement('div');
    DOM.insert(host, mod.render(cond));
    expect(host.textContent).toContain('Y');
    setCond(false);
    S.flush();
    expect(host.textContent).toContain('N');
  });
});

describe('lit directives — each', () => {
  it('each with a render arrow lowers to <For> and auto-imports it', () => {
    const code = compileEsm('export const r = (items) => html`<li each=${items()}>${(x) => x.name}</li>`;');
    expect(code).toContain('createComponent');
    expect(code).toContain('createNativeElement("li")');
    expect(code).toMatch(/import \{[^}]*\bFor\b[^}]*\} from "@fluixi\/dom"/);
  });

  it('renders one element per item at runtime', () => {
    const mod = load('export const render = (items) => html`<li each=${items()}>${(x) => x}</li>`;');
    const host = document.createElement('ul');
    DOM.insert(host, mod.render(() => ['a', 'b', 'c']));
    expect(host.querySelectorAll('li')).toHaveLength(3);
    expect(host.textContent).toBe('abc');
  });

  it('each folds a static key into a `by` prop', () => {
    const code = compileEsm('export const r = (rows) => html`<li each=${rows()} key="id">${(r) => r.id}</li>`;');
    expect(flat(code)).toContain('get by() { return item => item["id"];');
  });
});

describe('lit property binding reactivity', () => {
  it('.prop with a reactive template-literal value updates', () => {
    const mod = load('export const render = (count) => html`<div .title=${`v ${count()}`}></div>`;');
    const [count, setCount] = S.createSignal(1);
    const el = mod.render(count) as HTMLElement;
    expect(el.title).toBe('v 1');
    setCount(2);
    S.flush();
    expect(el.title).toBe('v 2');
  });

  it('.prop with an explicit thunk updates (the workaround)', () => {
    const mod = load('export const render = (count) => html`<div .title=${() => `v ${count()}`}></div>`;');
    const [count, setCount] = S.createSignal(1);
    const el = mod.render(count) as HTMLElement;
    expect(el.title).toBe('v 1');
    setCount(2);
    S.flush();
    expect(el.title).toBe('v 2');
  });

  it('a component that forwards props.title (NOT destructured) stays reactive', () => {
    const mod = load(
      'function Child(props) { return html`<span title=${props.title}></span>`; }\n' +
        'export const render = (count) => html`<Child .title=${`v ${count()}`} />`;',
    );
    const [count, setCount] = S.createSignal(1);
    const host = document.createElement('div');
    DOM.insert(host, mod.render(count));
    expect(host.querySelector('span')?.getAttribute('title')).toBe('v 1');
    setCount(2);
    S.flush();
    expect(host.querySelector('span')?.getAttribute('title')).toBe('v 2');
  });
});

describe('lit raw html + class/style objects', () => {
  it('html=${x} sets innerHTML at runtime', () => {
    const mod = load('export const render = (h) => html`<div html=${h}></div>`;');
    const el = mod.render('<b>hi</b>') as HTMLElement;
    expect(el.querySelector('b')?.textContent).toBe('hi');
  });

  it('class object toggles classes reactively', () => {
    const mod = load('export const render = (on) => html`<div class=${{ active: on() }}></div>`;');
    const [on, setOn] = S.createSignal(false);
    const el = mod.render(on) as HTMLElement;
    expect(el.classList.contains('active')).toBe(false);
    setOn(true);
    S.flush();
    expect(el.classList.contains('active')).toBe(true);
  });

  it('a class object maps to classList (not className) so a static class does not collide', () => {
    const code = compileEsm('export const r = (on) => html`<div class="box" class=${{ active: on() }}></div>`;');
    // static class -> className, object class -> classList: no duplicate key
    expect(code).toContain('className: "box"');
    expect(code).toContain('classList:');
    expect(code).not.toMatch(/className:[^,]*,[\s\S]*className:/);
  });

  it('static class + class object both apply at runtime', () => {
    const mod = load('export const render = (on) => html`<div class="box" class=${{ active: on() }}></div>`;');
    const [on, setOn] = S.createSignal(false);
    const el = mod.render(on) as HTMLElement;
    expect(el.classList.contains('box')).toBe(true);
    expect(el.classList.contains('active')).toBe(false);
    setOn(true);
    S.flush();
    expect(el.classList.contains('box')).toBe(true);
    expect(el.classList.contains('active')).toBe(true);
  });

  it('style object applies reactively', () => {
    const mod = load('export const render = (c) => html`<div style=${{ color: c() }}></div>`;');
    const [c, setC] = S.createSignal('red');
    const el = mod.render(c) as HTMLElement;
    expect(el.style.color).toBe('red');
    setC('blue');
    S.flush();
    expect(el.style.color).toBe('blue');
  });
});

describe('lit native events + modifiers', () => {
  it('plain @click stays a delegated handler (byte-identical with onClick)', () => {
    const at = compileEsm('export const r = (h) => html`<button @click=${h}>x</button>`;');
    const on = compileEsm('export const r = (h) => html`<button onClick=${h}>x</button>`;');
    expect(on).toBe(at);
    expect(at).not.toContain('addEventListener'); // delegated, not native
  });

  it('on:click attaches a native listener', () => {
    const mod = load('export const render = (h) => html`<div on:click=${h}></div>`;');
    let clicks = 0;
    const el = mod.render(() => clicks++) as HTMLElement;
    el.dispatchEvent(new Event('click'));
    expect(clicks).toBe(1);
  });

  it('@click.once fires only once', () => {
    const mod = load('export const render = (h) => html`<div @click.once=${h}></div>`;');
    let clicks = 0;
    const el = mod.render(() => clicks++) as HTMLElement;
    el.dispatchEvent(new Event('click'));
    el.dispatchEvent(new Event('click'));
    expect(clicks).toBe(1);
  });

  it('@click.prevent calls preventDefault', () => {
    const mod = load('export const render = (h) => html`<div @click.prevent=${h}></div>`;');
    let prevented = false;
    const el = mod.render((e: Event) => { prevented = e.defaultPrevented; }) as HTMLElement;
    el.dispatchEvent(new Event('click', { cancelable: true }));
    expect(prevented).toBe(true);
  });

  it('@click.self ignores events from children', () => {
    const mod = load('export const render = (h) => html`<div @click.self=${h}><span>x</span></div>`;');
    let hits = 0;
    const el = mod.render(() => hits++) as HTMLElement;
    el.querySelector('span')!.dispatchEvent(new Event('click', { bubbles: true }));
    expect(hits).toBe(0); // came from the span, not the div itself
    el.dispatchEvent(new Event('click'));
    expect(hits).toBe(1);
  });

  it('@scroll.capture emits capture options', () => {
    const code = compileEsm('export const r = (h) => html`<div @scroll.capture=${h}></div>`;');
    expect(code).toContain('"on:scroll"');
    expect(flat(code)).toContain('capture: true');
  });
});

describe('lit use directives', () => {
  it('use=${dir} calls the directive with the element', () => {
    const mod = load('export const render = (dir) => html`<div use=${dir}></div>`;');
    let received: any;
    const el = mod.render((node: any) => { received = node; node.dataset.used = '1'; }) as HTMLElement;
    expect(received).toBe(el);
    expect(el.dataset.used).toBe('1');
  });

  it('use:name=${opts} passes an accessor for the options', () => {
    const mod = load(
      'export const render = (tooltip, msg) => html`<div use:tooltip=${msg}></div>`;',
    );
    let opts: any;
    const el = mod.render((_node: any, accessor: any) => { opts = accessor(); }, 'hi') as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(opts).toBe('hi');
  });

  it('multiple use directives all run', () => {
    const mod = load('export const render = (a, b) => html`<div use=${a} use=${b}></div>`;');
    const seen: string[] = [];
    mod.render(() => seen.push('a'), () => seen.push('b'));
    expect(seen).toEqual(['a', 'b']);
  });
});

describe('lit framework components (static tags auto-import)', () => {
  it('static <Portal> auto-imports from dom, <Suspense> from core', () => {
    const code = compileEsm(
      'export const r = (el, fb) => html`<Portal mount=${el}><Suspense fallback=${fb}>x</Suspense></Portal>`;',
    );
    expect(code).toMatch(/import \{[^}]*\bPortal\b[^}]*\} from "@fluixi\/dom"/);
    // Suspense lives in @fluixi/core (dom doesn't export it) — auto-import from core.
    expect(code).toMatch(/import \{[^}]*\bSuspense\b[^}]*\} from "@fluixi\/core"/);
    expect(code).toContain('createComponent(Portal');
    expect(code).toContain('createComponent(Suspense');
  });
});

describe('lit dynamic component tag', () => {
  it('`<${UserCard}/>` compiles to createComponent(UserCard) — TS sees the reference', () => {
    const code = compileEsm('export const r = (UserCard) => html`<${UserCard} />`;');
    expect(code).toContain('createComponent(UserCard');
  });

  it('dynamic tag with props and children', () => {
    const code = compileEsm('export const r = (Card, title) => html`<${Card} title=${title()}>body</${Card}>`;');
    expect(code).toContain('createComponent(Card');
    expect(flat(code)).toContain('get title()');
    expect(code).toContain('body');
  });

  it('renders a dynamic component at runtime', () => {
    const mod = load('export const render = (Comp) => html`<${Comp} />`;');
    const Comp = () => { const el = document.createElement('b'); el.textContent = 'dyn'; return el; };
    const host = document.createElement('div');
    DOM.insert(host, mod.render(Comp));
    expect(host.querySelector('b')?.textContent).toBe('dyn');
  });
});
