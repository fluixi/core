// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import plugin from '../frontend/babel/plugin.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { transformTemplates } from './templates.js';

/**
 * The transform owns the module: parse, splice, done. These run its output
 * against the real runtime, and check it against the plugin path on the same
 * source — the two must render the same DOM.
 */
const LIT = { format: 'lit' as const, signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
const OPTS = { runtimeModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };

const viaPlugin = (src: string) =>
  babel.transformSync(src, { filename: 't.ts', configFile: false, babelrc: false, plugins: [[plugin, LIT]] })!.code!;

const viaTransform = (src: string) => transformTemplates(src, 't.ts', OPTS)!.code;

function run(esm: string, scope: Record<string, unknown> = {}) {
  const cjs = babel.transformSync(esm, {
    filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin],
  })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id === '@fluixi/dom') return DOM;
    if (id === '@fluixi/reactive/signal') return S;
    if (id === './scope') return scope;
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', cjs)(m.exports, req, m);
  return m.exports;
}

/** Mount a compiled module's render() and read the markup back. */
function mount(esm: string, scope: Record<string, unknown>): string {
  const mod = run(esm, scope);
  const host = document.createElement('div');
  S.createRoot(() => DOM.insert(host, () => mod.render(), null));
  return host.innerHTML;
}

/** Render both compilations of the same source and compare the DOM. */
function bothRender(src: string, scope: Record<string, unknown> = {}): [string, string] {
  return [mount(viaPlugin(src), scope), mount(viaTransform(src), scope)];
}

beforeAll(() => {
  DOM.registerCreateComponent(((C: any, p: any) => C(p)) as any);
});

const SRC = {
  static: 'export const render = () => html`<div class="box"><span>hi</span></div>`;',
  hole: 'import { name } from "./scope";\nexport const render = () => html`<p>${name()}</p>`;',
  attr: 'import { id } from "./scope";\nexport const render = () => html`<div id=${id}>x</div>`;',
  classList:
    'import { on } from "./scope";\nexport const render = () => html`<div class=${{ active: on() }}>x</div>`;',
  each: 'import { items } from "./scope";\nexport const render = () => html`<ul><li each=${items()}>${(x) => x}</li></ul>`;',
  ifElse:
    'import { cond } from "./scope";\nexport const render = () => html`<span if=${cond()}>Y</span><span else>N</span>`;',
  nested:
    'import { items } from "./scope";\nexport const render = () => html`<ul>${items().map((x) => html`<li>${x}</li>`)}</ul>`;',
};

describe('transformTemplates renders the same DOM as the plugin', () => {
  it('static markup', () => {
    const [a, b] = bothRender(SRC.static);
    expect(b).toEqual(a);
    expect(b).toContain('<span>hi</span>');
  });

  it('a reactive text hole', () => {
    const [a, b] = bothRender(SRC.hole, { name: () => 'Ada' });
    expect(b).toEqual(a);
    expect(b).toContain('Ada');
  });

  it('an inert attribute hole', () => {
    const [a, b] = bothRender(SRC.attr, { id: 'x1' });
    expect(b).toEqual(a);
    expect(b).toContain('id="x1"');
  });

  it('class=${object} lowers to classList', () => {
    const [a, b] = bothRender(SRC.classList, { on: () => true });
    expect(b).toEqual(a);
    expect(b).toContain('active');
  });

  it('each with an item arrow', () => {
    const [a, b] = bothRender(SRC.each, { items: () => ['a', 'b'] });
    expect(b).toEqual(a);
    expect(b).toContain('a');
  });

  it('if/else', () => {
    const [a, b] = bothRender(SRC.ifElse, { cond: () => true });
    expect(b).toEqual(a);
    expect(b).toContain('Y');
  });

  it('a template nested inside a hole', () => {
    const [a, b] = bothRender(SRC.nested, { items: () => ['a', 'b'] });
    expect(b).toEqual(a);
  });

  it('stays reactive after a signal changes', () => {
    const [get, set] = S.createSignal('one');
    const mod = run(viaTransform(SRC.hole), { name: get });
    const host = document.createElement('div');
    S.createRoot(() => DOM.insert(host, () => mod.render(), null));
    expect(host.textContent).toContain('one');
    set('two');
    expect(host.textContent).toContain('two');
  });
});

describe('transformTemplates', () => {
  it('leaves a module with no templates alone', () => {
    expect(transformTemplates('export const x = 1;', 't.ts', OPTS)).toBeNull();
  });

  it('emits a source map', () => {
    const out = transformTemplates(SRC.hole, 't.ts', OPTS)!;
    expect(out.map.mappings.length).toBeGreaterThan(0);
    expect(out.map.sources).toContain('t.ts');
  });

  it('imports the runtime symbols it emitted', () => {
    expect(viaTransform(SRC.hole)).toMatch(/import \{[^}]*insert[^}]*\} from "@fluixi\/dom"/);
  });

  it('does not import a name the module already binds', () => {
    const src = 'const insert = 1;\nexport const render = () => html`<p>${x()}</p>`;';
    const out = transformTemplates(src, 't.ts', OPTS)!.code;
    expect(out).not.toMatch(/import \{[^}]*\binsert\b/);
  });

  it('keeps the author\'s formatting inside a hole', () => {
    const src = 'export const render = () => html`<p>${ user . name }</p>`;';
    expect(transformTemplates(src, 't.ts', OPTS)!.code).toContain('user . name');
  });
});
