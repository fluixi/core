// @vitest-environment jsdom
/**
 * A component that returns control flow hands back a memo: `<Show>` keeps it reactive, so a
 * `<Suspense>` it reveals still swaps its fallback for the content when the data arrives.
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

describe('a Suspense inside a Show', () => {
  it('shows the content once the resource it waits for resolves', async () => {
    const { App, api } = compile(
      `import { Suspense, Show } from '@fluixi/core';
       import { createSignal, createResource } from '@fluixi/reactive/signal';
       export const api = {};
       function ClientData() {
         const [r] = createResource(() => new Promise((res) => setTimeout(() => res('client value'), 20)));
         return <p class="value">{r()}</p>;
       }
       export function App() {
         const [mounted, setMounted] = createSignal(false);
         api.mount = () => setMounted(true);
         return (
           <section>
             <Show when={mounted()}>
               <Suspense fallback={<p class="fallback">client loading</p>}>
                 <ClientData />
               </Suspense>
             </Show>
           </section>
         );
       }`,
      {},
    );
    const container = document.createElement('div');
    S.createRoot(() => DOM.render(() => App(), container));
    api.mount();
    await wait(5);
    expect(container.textContent).toBe('client loading');
    await wait(60);
    expect(container.textContent).toBe('client value');
  });
});
