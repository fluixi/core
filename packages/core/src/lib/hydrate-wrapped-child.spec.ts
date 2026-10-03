// @vitest-environment jsdom
/**
 * A static child handed through two components that split and spread their props, the shape
 * of fluixi-ui's IconButton over Button, inside a <Show>. Hydrating must adopt the server's
 * child once, not build a second one beside it.
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

describe('hydration: a child passed through split and spread props', () => {
  it('adopts the server svg once', async () => {
    const src = `
      import { Show, splitProps } from '@fluixi/core';
      function Button(props) {
        const [local, others] = splitProps(props, ['children', 'variant']);
        return <button type="button" data-variant={local.variant} {...others}>{local.children}</button>;
      }
      function IconButton(props) {
        const [local, others] = splitProps(props, ['shape']);
        return <Button data-icon-button="" data-shape={local.shape} {...others} />;
      }
      export function App(p) {
        return (
          <header>
            <Show when={p.open()}>
              <IconButton variant="outline" aria-label={p.label()}>
                <svg width="16" height="16"><rect x="3" y="4" /></svg>
              </IconButton>
            </Show>
            <div class="title"><strong>Title</strong></div>
          </header>
        );
      }
    `;
    const { App } = compile(src);
    const [label, setLabel] = S.createSignal('Hide');
    const props = { open: () => true, label };

    setServerMode(true);
    const html = await renderToStringAsync(() => App(props));
    setServerMode(false);
    expect((html.match(/<svg/g) || []).length).toBe(1);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverSvg = container.querySelector('svg');
    DOM.hydrate(() => App(props), container);
    await tick();
    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(container.querySelector('svg')).toBe(serverSvg);

    setLabel('Show');
    await tick();
    expect(container.querySelectorAll('svg').length).toBe(1);
  });
});

function compile(src: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, {
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
