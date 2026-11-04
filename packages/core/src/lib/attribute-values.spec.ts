// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

beforeAll(() => ensureIntegration());

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

describe('attribute values', () => {
  it('a reactive string style updates', async () => {
    const { View, x } = compile(`
      import { signal } from '@fluixi/reactive/signal';
      export const x = signal(0);
      export function View() {
        return <div class="track" style={() => \`transform:translateX(\${x()}%)\`}><p>a</p></div>;
      }
    `);
    const container = document.createElement('div');
    DOM.render(() => View({}), container);
    const track = container.querySelector<HTMLElement>('.track')!;
    expect(track.style.transform).toBe('translateX(0%)');
    x.set(-100);
    await S.flush();
    expect(track.style.transform).toBe('translateX(-100%)');
  });

  it('enumerated and aria attributes take "true" and "false", never empty or absent', () => {
    const { View } = compile(`
      export function View() {
        return (
          <div>
            <p class="on" draggable={true} spellcheck={true} aria-hidden={true}>a</p>
            <p class="off" draggable={false} spellcheck={false} aria-hidden={false}>b</p>
          </div>
        );
      }
    `);
    const container = document.createElement('div');
    DOM.render(() => View({}), container);
    const on = container.querySelector('.on')!;
    const off = container.querySelector('.off')!;
    for (const name of ['draggable', 'spellcheck', 'aria-hidden']) {
      expect(on.getAttribute(name)).toBe('true');
      expect(off.getAttribute(name)).toBe('false');
    }
  });
});
