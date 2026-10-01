// @vitest-environment jsdom
/**
 * Server and client rendering different markup at one position: the client's version replaces
 * the server's instead of being patched into it, and server markup nothing claimed is removed.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

const tick = () => new Promise((r) => setTimeout(r, 0));
beforeAll(() => ensureIntegration());

/** Server render with `flag` off, hydrate with it on, then sweep as startClient does. */
async function serverThenClient(src: string) {
  const { App, setFlag } = compile(src);
  setFlag(false);
  setServerMode(true);
  const html = await renderToStringAsync(() => App());
  setServerMode(false);
  document.body.innerHTML = `<div id="app">${html}</div>`;
  const container = document.getElementById('app')!;
  setFlag(true);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  DOM.hydrate(() => App(), container);
  await tick();
  const removed = DOM.removeUnclaimedKeyed(container);
  DOM.clearHydrationKeys();
  warn.mockRestore();
  return { container, removed };
}

describe('hydration with keys, when server and client differ', () => {
  it('builds the client variant instead of patching it into the server one', async () => {
    const { container } = await serverThenClient(`
      let flag = false;
      export const setFlag = (v) => (flag = v);
      export function App() {
        return (
          <button>
            {flag ? <svg class="moon"><path d="M1 1" /></svg> : <svg class="sun"><circle r="4" /></svg>}
          </button>
        );
      }
    `);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('moon');
    expect(container.querySelector('circle')).toBeNull();
  });

  it('removes server markup the client did not render', async () => {
    const { container } = await serverThenClient(`
      let flag = false;
      export const setFlag = (v) => (flag = v);
      export function App() {
        return (
          <main>
            <h1>Title</h1>
            {flag ? null : <p class="server-only">extra</p>}
          </main>
        );
      }
    `);
    expect(container.querySelector('.server-only')).toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('Title');
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
