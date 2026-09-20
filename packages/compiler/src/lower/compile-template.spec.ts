/**
 * Differential: the same template through the Babel front-end and through
 * `compileTemplate` must produce the same runtime calls.
 *
 * The lowering is one function now, so what this actually guards is the part
 * either side could still get wrong on its own: which passes run, in what
 * order, and with which defaults. `emitLitViaIR` and `compileTemplate` are two
 * entry points into the same pipeline, and two entry points that drift are how
 * the compiler ended up with two lowerings in the first place.
 *
 * The hand-written `holes` are the second half of the point: they are what a
 * front-end that is not Babel has to produce, written out for each shape the
 * lowering branches on.
 */
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { compileTemplate } from './compile-template.js';
import type { TemplateHole } from './template.js';
import { lowerLitTemplate } from '../frontend/babel/lower-template.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import { collapseStrategies } from '../optimize/collapse-strategies.js';
import { resolveComponentSources } from '../resolve/resolve-ir.js';
import { createComponentResolver } from '../resolve/component-resolver.js';
import { imperativeBackend, inlineTemplates } from '../codegen/backends/imperative.js';

/** The Babel path, run exactly as plugin.ts's emitLitViaIR runs it. */
function viaBabel(source: string): string {
  const file = babel.parseSync(`(${source});`, {
    filename: 't.tsx',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
  })!;
  const node = (file as any).program.body[0].expression;

  const used = new Set<string>();
  const ir = lowerLitTemplate(node, used, { svg: node.tag.name === 'svg' });
  analyzeStatic(ir);
  resolveComponentSources(ir, {
    resolver: createComponentResolver([]),
    modules: {
      controlFlowModule: '@fluixi/dom',
      coreModule: '@fluixi/core',
      routerModule: '@fluixi/core/router',
    },
    strategyFor: (n) => n.load,
  });
  collapseStrategies(ir);
  const { code, imports, templates } = imperativeBackend.emit(ir, {} as never);
  for (const s of imports) used.add(s);
  return inlineTemplates(code, templates);
}

/** A hole that is just an expression. */
const h = (code: string, reactive: boolean): TemplateHole => ({ code, reactive });

const CASES: Array<{
  name: string;
  /** The tagged template, as an author writes it. */
  source: string;
  statics: string[];
  holes: TemplateHole[];
}> = [
  {
    name: 'static markup, no holes',
    source: 'html`<div class="box"><span>hi</span></div>`',
    statics: ['<div class="box"><span>hi</span></div>'],
    holes: [],
  },
  {
    name: 'a reactive text hole',
    source: 'html`<p>${name()}</p>`',
    statics: ['<p>', '</p>'],
    holes: [h('name()', true)],
  },
  {
    name: 'an inert attribute hole',
    source: 'html`<div id=${id}></div>`',
    statics: ['<div id=', '></div>'],
    holes: [h('id', false)],
  },
  {
    name: 'a member access, which is reactive',
    source: 'html`<p>${user.name}</p>`',
    statics: ['<p>', '</p>'],
    holes: [h('user.name', true)],
  },
  {
    name: 'class=${object} lowers to classList',
    source: 'html`<div class=${{ active: on() }}></div>`',
    statics: ['<div class=', '></div>'],
    // Written the way Babel's printer emits it, so the comparison is about the
    // pipeline rather than about whitespace: see the formatting test below.
    holes: [{ code: '{ active: on() }', reactive: true, object: true }],
  },
  {
    name: 'an event handler',
    source: 'html`<button @click=${onPress}>x</button>`',
    statics: ['<button @click=', '>x</button>'],
    holes: [h('onPress', false)],
  },
  {
    name: 'if/else',
    source: 'html`<span if=${cond()}>Y</span><span else>N</span>`',
    statics: ['<span if=', '>Y</span><span else>N</span>'],
    holes: [h('cond()', true)],
  },
  {
    name: 'each with an item arrow',
    source: 'html`<li each=${items()}>${(x) => x.name}</li>`',
    statics: ['<li each=', '>', '</li>'],
    holes: [
      h('items()', true),
      {
        code: '(x) => x.name',
        reactive: false,
        arrow: { params: ['x'], body: 'x.name', bodyReactive: true },
      },
    ],
  },
  {
    name: 'a directive-heavy element',
    source: 'html`<input bind:value=${name} class:big=${big()} prop:foo=${42} />`',
    statics: ['<input bind:value=', ' class:big=', ' prop:foo=', ' />'],
    holes: [h('name', false), h('big()', true), h('42', false)],
  },
  {
    name: 'nested elements around a hole',
    source: 'html`<ul><li>a</li><li>${x()}</li></ul>`',
    statics: ['<ul><li>a</li><li>', '</li></ul>'],
    holes: [h('x()', true)],
  },
];

describe('compileTemplate matches the Babel front-end', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const native = compileTemplate({ statics: c.statics, holes: c.holes });
      expect(native.code).toEqual(viaBabel(c.source));
    });
  }
});

describe('compileTemplate', () => {
  /**
   * The Babel path reprints each hole through @babel/generator; this one passes
   * the text it was given straight through. So a hole reaches the output exactly
   * as the author wrote it: better fidelity, and one less thing between a
   * breakpoint and the source: but it does mean the two paths agree textually
   * only when the author's formatting matches the printer's.
   */
  it('passes hole source through verbatim, without reprinting it', () => {
    const authored = '{  active :  on( )  }';
    const { code } = compileTemplate({
      statics: ['<div class=', '></div>'],
      holes: [{ code: authored, reactive: true, object: true }],
    });
    expect(code).toContain(authored);
  });

  it('reports the runtime symbols the caller has to import', () => {
    const { imports } = compileTemplate({ statics: ['<p>', '</p>'], holes: [h('n()', true)] });
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.every((s) => typeof s === 'string')).toBe(true);
  });

  it('hands back the IR, so a caller can transform before emitting', () => {
    const { ir } = compileTemplate({ statics: ['<div></div>'], holes: [] });
    expect(ir).toMatchObject({ kind: 'element', tag: 'div' });
  });

  it('rejects a statics/holes count that cannot describe a template', () => {
    expect(() => compileTemplate({ statics: ['<p>'], holes: [h('x', false)] })).toThrow(
      /exactly one more/,
    );
  });

  it('compiles an svg root', () => {
    const { code } = compileTemplate({ statics: ['<circle r="2"/>'], holes: [] }, { svg: true });
    expect(code).toContain('circle');
  });
});
