// @vitest-environment jsdom
/**
 * A component with `<style scoped>`: the scope attribute is part of its compiled template, so
 * the server's HTML, the hydrated DOM and a plain client render all carry the same one.
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
  import { Show } from '@fluixi/core';
  export function Card(p) {
    return (
      <section class="card">
        <style scoped>{\`.card { padding: 1rem }\`}</style>
        <h2>{p.title()}</h2>
        <Show when={p.open()}><p class="body">Body</p></Show>
      </section>
    );
  }
`;

describe('scoped styles across render modes', () => {
  it('marks the server HTML, hydration keeps those nodes, and a client render marks the same', async () => {
    const { Card, styles } = compile(src);
    expect(styles).toHaveLength(1);
    const id = styles[0].id;
    const [title, setTitle] = S.createSignal('One');
    const props = { title, open: () => true };

    setServerMode(true);
    const html = await renderToStringAsync(() => Card(props));
    setServerMode(false);
    expect((html.match(new RegExp(`data-fx-s="${id}"`, 'g')) ?? []).length).toBe(3);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverSection = container.querySelector('section');
    DOM.hydrate(() => Card(props), container);
    await tick();
    expect(container.querySelector('section')).toBe(serverSection);
    setTitle('Two');
    await tick();
    expect(container.querySelector('h2')?.textContent).toBe('Two');
    expect(container.querySelectorAll(`[data-fx-s="${id}"]`).length).toBe(3);

    // A client-only render, as in an app without SSR.
    const spa = document.createElement('div');
    DOM.render(() => Card(props), spa);
    await tick();
    expect([...spa.querySelectorAll('section, h2, p')].every((el) => el.getAttribute('data-fx-s') === id)).toBe(true);
  });
});

function compile(source: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const result = transformTemplates(source, '/app/src/card.tsx', {
    ...opts,
    runtimeModule: opts.signalModule,
    sourceRoot: '/app',
    styles: { process: () => [{ kind: 'rule', selector: '.card', nodes: [] }] },
  });
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
  return { ...m.exports, styles: result!.styles ?? [] };
}
