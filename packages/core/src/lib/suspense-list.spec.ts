// @vitest-environment jsdom
/**
 * SuspenseList coordinates the Suspense boundaries compiled JSX puts inside it: `forwards`
 * reveals them in order, and `tail="collapsed"` shows one fallback, the next one's.
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

describe('SuspenseList', () => {
  it('reveals forwards in order, with one fallback when collapsed', async () => {
    // Each row loads until the test resolves it, so the order is the test's, not the timers'.
    const resolvers = new Map<string, (value: string) => void>();
    const Row = (props: { name: string }) => {
      const [data] = S.createResource(() => new Promise<string>((r) => resolvers.set(props.name, r)));
      const p = DOM.createNativeElement('p');
      DOM.insert(p, () => data() ?? '');
      return p;
    };
    const { App } = compile(
      `import { Suspense, SuspenseList } from '@fluixi/core';
       import { Row } from 'row';
       export function App() {
         return (
           <SuspenseList revealOrder="forwards" tail="collapsed">
             <Suspense fallback={<i>wait one</i>}><Row name="one" /></Suspense>
             <Suspense fallback={<i>wait two</i>}><Row name="two" /></Suspense>
             <Suspense fallback={<i>wait three</i>}><Row name="three" /></Suspense>
           </SuspenseList>
         );
       }`,
      { row: { Row } },
    );
    const container = document.createElement('div');
    S.createRoot(() => DOM.render(() => App(), container));
    await wait(1);
    expect(container.textContent).toBe('wait one');

    resolvers.get('two')!('two');
    resolvers.get('three')!('three');
    await wait(1);
    // `two` and `three` have resolved, but `one` has not: nothing is revealed out of order.
    expect(container.textContent).toBe('wait one');

    resolvers.get('one')!('one');
    await wait(1);
    expect(container.textContent).toBe('onetwothree');
  });
});
