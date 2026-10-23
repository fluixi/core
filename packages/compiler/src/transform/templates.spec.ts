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
 * source: the two must render the same DOM.
 */
const HTML_FORMAT = { format: 'html' as const, signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
const OPTS = { runtimeModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };

const viaPlugin = (src: string) =>
  babel.transformSync(src, { filename: 't.ts', configFile: false, babelrc: false, plugins: [[plugin, HTML_FORMAT]] })!.code!;

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

const JSX = {
  element: 'export const render = () => <div class="box"><span>hi</span></div>;',
  hole: 'import { name } from "./scope";\nexport const render = () => <p>{name()}</p>;',
  attr: 'import { id } from "./scope";\nexport const render = () => <div id={id}>x</div>;',
  fragment: 'import { name } from "./scope";\nexport const render = () => <><b>a</b>{name()}</>;',
  spread: 'import { rest } from "./scope";\nexport const render = () => <div {...rest()}>x</div>;',
  nested: 'import { items } from "./scope";\nexport const render = () => <ul>{items().map((x) => <li>{x}</li>)}</ul>;',
  mixed: 'import { name } from "./scope";\nexport const render = () => <div>{html`<b>${name()}</b>`}</div>;',
};

const viaPluginJsx = (src: string) =>
  babel.transformSync(src, {
    filename: 't.tsx', configFile: false, babelrc: false,
    plugins: [[plugin, { ...HTML_FORMAT, format: 'both' }]],
  })!.code!;

function bothRenderJsx(src: string, scope: Record<string, unknown> = {}): [string, string] {
  return [mount(viaPluginJsx(src), scope), mount(viaTransform(src), scope)];
}

describe('transformTemplates compiles JSX too', () => {
  it('an element', () => {
    const [a, b] = bothRenderJsx(JSX.element);
    expect(b).toEqual(a);
    expect(b).toContain('<span>hi</span>');
  });

  it('a reactive hole', () => {
    const [a, b] = bothRenderJsx(JSX.hole, { name: () => 'Ada' });
    expect(b).toEqual(a);
    expect(b).toContain('Ada');
  });

  it('an inert attribute', () => {
    const [a, b] = bothRenderJsx(JSX.attr, { id: 'x1' });
    expect(b).toEqual(a);
    expect(b).toContain('id="x1"');
  });

  it('a fragment', () => {
    const [a, b] = bothRenderJsx(JSX.fragment, { name: () => 'Ada' });
    expect(b).toEqual(a);
  });

  it('a spread', () => {
    const [a, b] = bothRenderJsx(JSX.spread, { rest: () => ({ id: 'r' }) });
    expect(b).toEqual(a);
  });

  it('JSX nested in an expression', () => {
    const [a, b] = bothRenderJsx(JSX.nested, { items: () => ['a', 'b'] });
    expect(b).toEqual(a);
  });

  it('a template nested in JSX', () => {
    const [a, b] = bothRenderJsx(JSX.mixed, { name: () => 'Ada' });
    expect(b).toEqual(a);
    expect(b).toContain('Ada');
  });

  it('stays reactive', () => {
    const [get, set] = S.createSignal('one');
    const mod = run(viaTransform(JSX.hole), { name: get });
    const host = document.createElement('div');
    S.createRoot(() => DOM.insert(host, () => mod.render(), null));
    expect(host.textContent).toContain('one');
    set('two');
    expect(host.textContent).toContain('two');
  });
});

describe('the module prologue', () => {
  const compile = (src: string, opts = {}) =>
    transformTemplates(src, 't.tsx', { ...OPTS, ...opts })!.code;

  it('registers delegated events', () => {
    const out = compile('export const r = (f) => <button onClick={f}>x</button>;');
    expect(out).toContain('delegateEvents(["click"])');
    expect(out).toMatch(/import \{[^}]*delegateEvents/);
  });

  it('does not register an undelegated event', () => {
    const out = compile('export const r = (f) => <video onTimeUpdate={f} />;');
    expect(out).not.toContain('delegateEvents');
  });

  it('imports a component a resolve rule supplies', () => {
    const out = compile('export const r = () => <Card />;', {
      resolve: [{ components: { Card: '@ui/card' } }],
    });
    expect(out).toContain('from "@ui/card"');
  });

  it('emits a deferred binding for a lazy component', () => {
    const out = compile('export const r = () => <Chart load:idle />;', {
      resolve: [{ components: { Chart: '@ui/chart' } }],
    });
    expect(out).toContain('deferred(() => import("@ui/chart")');
    expect(out).toContain('kind: "idle"');
  });

  it('keeps a media query on the strategy', () => {
    const out = compile('export const r = () => <Chart load:media="(min-width: 1024px)" />;', {
      resolve: [{ components: { Chart: '@ui/chart' } }],
    });
    expect(out).toContain('query: "(min-width: 1024px)"');
  });

  it('leaves a name the file already binds alone', () => {
    const out = compile('const Show = () => null;\nexport const r = (c) => <Show when={c()} />;');
    expect(out).not.toMatch(/import \{[^}]*\bShow\b/);
  });
});

describe('hoisted templates', () => {
  const compileSrc = (src: string) => transformTemplates(src, 't.tsx', OPTS)!.code;

  it('two roots in one module get distinct templates', () => {
    // Roots are emitted innermost first and spliced into their parent, so a
    // hoisted name is already present in the outer root's code by the time it is
    // renamed. Sharing the backend's `_tmpl$N` prefix pointed both at one string.
    const out = compileSrc(
      'export const r = (m) => <Switch fallback={<p class="none">none</p>}><Match when={m}><p class="a">A</p></Match></Switch>;',
    );
    const names = [...out.matchAll(/const (_fxTmpl\$\d+) = ("(?:[^"\\]|\\.)*")/g)];
    expect(names.length).toBe(2);
    expect(new Set(names.map((m) => m[1])).size).toBe(2);
    expect(new Set(names.map((m) => m[2])).size).toBe(2);
  });

  it('identical markup in one module shares a single template', () => {
    const out = compileSrc(
      'export const a = () => <p class="x">hi</p>;\nexport const b = () => <p class="x">hi</p>;',
    );
    expect([...out.matchAll(/const _fxTmpl\$\d+ =/g)].length).toBe(1);
  });
});
