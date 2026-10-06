// @vitest-environment jsdom
/**
 * Text written next to an expression: the server's HTML has the two as one text node, which
 * the browser cannot tell apart, so hydration splits it where the client's value ends.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

const src = `
  const URL = '/license';
  export function Note(p) {
    return (
      <footer>
        <p>
          {p.lead()} <a href={URL}>{p.label()}</a>. Hello {p.name()}
        </p>
      </footer>
    );
  }
`;

describe('text beside an expression', () => {
  it("keeps the static text the server merged into the expression's node, and both still update", async () => {
    const { Note } = compile(src);
    const [lead, setLead] = S.createSignal('Released under the');
    const [name, setName] = S.createSignal('Ada');
    const props = { lead, name, label: () => 'MIT License' };

    setServerMode(true);
    const html = await renderToStringAsync(() => Note(props));
    setServerMode(false);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    expect(container.textContent).toBe('Released under the MIT License. Hello Ada');
    DOM.hydrate(() => Note(props), container);
    await tick();
    expect(container.textContent).toBe('Released under the MIT License. Hello Ada');

    setLead('Published under the');
    setName('Grace');
    await tick();
    expect(container.textContent).toBe('Published under the MIT License. Hello Grace');
  });
});

function compile(source: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const result = transformTemplates(source, '/app/src/note.tsx', { ...opts, runtimeModule: opts.signalModule, sourceRoot: '/app' });
  const code = babel.transformSync(result!.code, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [['@babel/plugin-transform-modules-commonjs']],
  })!.code!;
  const m = { exports: {} as any };
  const map: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi };
  const req = (id: string) => {
    if (id in map) return map[id];
    throw new Error('unexpected require: ' + id);
  };
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}
