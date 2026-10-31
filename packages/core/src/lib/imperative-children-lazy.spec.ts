// @vitest-environment jsdom
/**
 * Lazy content under <Suspense>, passed through a component's {props.children}, appears
 * once it loads (client render).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

const SRC = `
  import { createResource } from '@fluixi/reactive/signal';
  import { Suspense, lazy } from '@fluixi/core';
  function Page() {
    const [data] = createResource(() => new Promise((r) => setTimeout(() => r('PAGE-DATA'), 5)));
    return <p class="page">{() => data()}</p>;
  }
  const LazyPage = lazy(() => new Promise((r) => setTimeout(() => r({ default: Page }), 5)));
  function Shell(props) {
    return <main class="pos-main">{props.children}</main>;
  }
  export function App() {
    return <Shell><Suspense fallback={<p>loading</p>}><LazyPage /></Suspense></Shell>;
  }
`;

describe('lazy+Suspense through {props.children} (imperative)', () => {
  it('async content appears through the Shell children hop', async () => {
    const { App } = compile(SRC);
    const container = document.createElement('div');
    document.body.appendChild(container);
    DOM.render(() => App(), container);
    await vi.waitFor(() => expect(container.querySelector('.page')?.textContent).toBe('PAGE-DATA'));
    await S.flush();
    const pages = container.querySelectorAll('.page');
    expect(pages.length).toBe(1);
    expect(pages[0]?.textContent).toBe('PAGE-DATA');
    container.remove();
  });
});
