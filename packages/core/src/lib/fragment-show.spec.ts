// @vitest-environment jsdom
/**
 * A fragment of components, each returning a fragment that holds a `<Show>`, rendered as it is:
 * the array the app returns holds arrays, and each `<Show>` in them still updates in place.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

beforeAll(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function compile(src: string, extra: Record<string, unknown>): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [['@babel/plugin-transform-modules-commonjs']] })!.code!;
  const m = { exports: {} as any };
  const map: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi, ...extra };
  new Function('exports', 'require', 'module', code)(m.exports, (id: string) => {
    if (id in map) return map[id];
    throw new Error('unexpected require: ' + id);
  }, m);
  return m.exports;
}

describe('a fragment of fragments', () => {
  it('updates a Show inside one of them, in its place', async () => {
    const { App, api } = compile(
      `import { Show } from '@fluixi/core';
       import { createSignal } from '@fluixi/reactive/signal';
       export const api = {};
       function Item(props) {
         const [open, setOpen] = createSignal(false);
         api[props.name] = setOpen;
         return <><button>{props.name}</button><Show when={open()}><p class="panel">{props.name}</p></Show></>;
       }
       export function App() { return <><Item name="a" /><Item name="b" /></>; }`,
      {},
    );
    const container = document.createElement('div');
    S.createRoot(() => DOM.render(() => App(), container));
    api.a(true);
    await wait(5);
    expect(container.querySelectorAll('.panel')).toHaveLength(1);
    expect(container.textContent).toBe('aab');
  });
});
