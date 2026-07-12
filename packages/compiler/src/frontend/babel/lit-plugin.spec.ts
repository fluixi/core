// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import plugin from './plugin.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';

// The lit front-end wired into the plugin behind `format`. Drives the whole-file
// transform: `html`...`` templates compile through the shared IR + imperative
// backend, with the runtime imports and delegateEvents() call injected — then the
// output runs against the live @fluixi/dom runtime.

const LIT = {
  backend: 'imperative' as const,
  format: 'lit' as const,
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
  hoistStatics: false,
};

function compileEsm(src: string, options: Record<string, unknown> = LIT): string {
  return babel.transformSync(src, {
    filename: 'test.tsx',
    configFile: false,
    babelrc: false,
    plugins: [[plugin, options]],
  })!.code!;
}

function compile(src: string, options: Record<string, unknown> = LIT): string {
  const esm = compileEsm(src, options);
  return babel.transformSync(esm, {
    filename: 'test.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsPlugin],
  })!.code!;
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/reactive/store': Store,
};

function load(src: string, options: Record<string, unknown> = LIT): any {
  const code = compile(src, options);
  const moduleObj = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require in compiled output: ' + id);
  };
  new Function('exports', 'require', 'module', code)(moduleObj.exports, req, moduleObj);
  return moduleObj.exports;
}

beforeAll(() => {
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('lit front-end (format: lit)', () => {
  it('compiles html`` to runtime calls and injects imports + delegateEvents', () => {
    const code = compileEsm(
      'export const r = (f, label) => html`<button @click=${f}>${label()}</button>`;',
    );
    expect(code).toContain('createNativeElement');
    expect(code).toContain('insert');
    expect(code).toMatch(/import \{[^}]*\} from "@fluixi\/dom"/);
    expect(code).toMatch(/delegateEvents\(\["click"\]\)/);
    expect(code).not.toContain('html`'); // template consumed
  });

  it('renders, reacts, and fires a delegated event end-to-end', () => {
    const mod = load(
      'export const render = (f, label) => html`<button @click=${f}>${label()}</button>`;',
    );
    const [label, setLabel] = S.createSignal('hi');
    let clicks = 0;
    const el = mod.render(() => clicks++, label) as HTMLElement;

    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toBe('hi');

    setLabel('bye');
    S.flush();
    expect(el.textContent).toBe('bye');

    document.body.appendChild(el);
    el.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toBe(1);
  });

  it('imports a control-flow component used inside a template', () => {
    const code = compileEsm('export const r = (c, body) => html`<Show when=${c()}>${body}</Show>`;');
    expect(code).toMatch(/import \{[^}]*\bShow\b[^}]*\} from "@fluixi\/dom"/);
    expect(code).toContain('createComponent');
  });

  it('compiles html`` by DEFAULT (format defaults to `both` — no option needed)', () => {
    const code = compileEsm('export const r = () => html`<div>hi</div>`;', {
      backend: 'imperative',
      hoistStatics: false,
    });
    expect(code).toContain('createNativeElement');
    expect(code).not.toContain('html`'); // template consumed
  });

  it('leaves html`` untouched when format is explicitly `jsx`', () => {
    const code = compileEsm('export const r = () => html`<div>hi</div>`;', {
      backend: 'imperative',
      hoistStatics: false,
      format: 'jsx',
    });
    expect(code).not.toContain('createNativeElement');
    expect(code).toContain('html`');
  });

  it('a file mixing JSX + html`` (format both) does not duplicate imports', () => {
    const code = babel.transformSync(
      'export const a = () => <div>jsx</div>;\nexport const b = () => html`<span>lit</span>`;',
      { filename: 't.tsx', configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] },
        plugins: [[plugin, { backend: 'imperative', format: 'both', hoistStatics: false, signalModule: '@fluixi/dom' }]] },
    )!.code!;
    // both styles compiled
    expect(code).toContain('createNativeElement');
    // no module imported twice, no name redeclared
    const importLines = code.split('\n').filter((l) => /^import /.test(l));
    const fromDom = importLines.filter((l) => /from "@fluixi\/dom"/.test(l));
    expect(fromDom.length).toBeLessThanOrEqual(1);
    expect((code.match(/import \{[^}]*\bcreateNativeElement\b/g) || []).length).toBe(1);
  });
});
