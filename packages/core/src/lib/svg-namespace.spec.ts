// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

beforeAll(() => ensureIntegration());

const SVG = 'http://www.w3.org/2000/svg';
const XHTML = 'http://www.w3.org/1999/xhtml';

function compile(source: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const result = transformTemplates(source, '/app/src/app.tsx', { ...opts, runtimeModule: opts.signalModule, sourceRoot: '/app' });
  const code = babel.transformSync(result!.code, {
    filename: 't.js', configFile: false, babelrc: false,
    plugins: [['@babel/plugin-transform-modules-commonjs']],
  })!.code!;
  const m = { exports: {} as any };
  const map: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi };
  const req = (id: string) => { if (id in map) return map[id]; throw new Error('unexpected require: ' + id); };
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

describe('SVG elements', () => {
  it('are made in the SVG namespace even when written outside an <svg>, gradients included', () => {
    const { Art } = compile(`
      const paint = (id) => (
        <>
          <defs>
            <linearGradient id={id}><stop offset="0" /><stop offset="1" /></linearGradient>
            <radialGradient id="r" /><mask id="m" /><pattern id="p" /><filter id="f"><feGaussianBlur /></filter>
          </defs>
          <rect fill={\`url(#\${id})\`} width="10" height="10" />
        </>
      );
      export function Art() {
        return <svg viewBox="0 0 10 10">{paint('g')}</svg>;
      }
    `);
    const container = document.createElement('div');
    DOM.render(() => Art(), container);
    for (const tag of ['linearGradient', 'stop', 'radialGradient', 'mask', 'pattern', 'filter', 'feGaussianBlur', 'rect']) {
      const found = container.getElementsByTagNameNS(SVG, tag);
      expect(found.length, tag).toBeGreaterThan(0);
    }
    expect(container.querySelector('lineargradient')?.namespaceURI ?? SVG).toBe(SVG);
  });

  it('take the namespace of their <svg> parent, and leave it inside <foreignObject>', () => {
    const { Art } = compile(`
      export function Art() {
        return (
          <svg>
            <animateMotion dur="1s" />
            <foreignObject><div class="html">text</div></foreignObject>
          </svg>
        );
      }
    `);
    const container = document.createElement('div');
    DOM.render(() => Art(), container);
    expect(container.getElementsByTagNameNS(SVG, 'animateMotion').length).toBe(1);
    expect(container.querySelector('.html')?.namespaceURI).toBe(XHTML);
  });
});
