// @vitest-environment jsdom
/**
 * A deferred component (`load:`) the server rendered in full keeps that content through
 * hydration until its code loads, instead of blanking until the trigger fires, or for good when
 * a media query never matches.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import { deferred, type LoadStrategy } from './render/deferred.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => ensureIntegration());
afterEach(() => vi.unstubAllGlobals());

function compile(src: string, extra: Record<string, unknown>): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [['@babel/plugin-transform-modules-commonjs']],
  })!.code!;
  const m = { exports: {} as any };
  const map: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi, ...extra };
  new Function('exports', 'require', 'module', code)(m.exports, (id: string) => {
    if (id in map) return map[id];
    throw new Error('unexpected require: ' + id);
  }, m);
  return m.exports;
}

async function serverThenHydrate(strategy: LoadStrategy) {
  const widget = compile(`export function Widget() { return <p class="w">widget</p>; }`, {});
  // Counted rather than the loader: the server render already loaded the module in this process.
  let renders = 0;
  const Widget = () => (renders++, widget.Widget());
  const Lazy = deferred(() => Promise.resolve({ default: Widget }), { strategy });
  const { App } = compile(`import { Lazy } from 'lazy'; export function App() { return <main><Lazy /><span>after</span></main>; }`, { lazy: { Lazy } });

  setServerMode(true);
  const html = await renderToStringAsync(() => App());
  setServerMode(false);
  expect(html).toContain('widget');
  renders = 0;

  document.body.innerHTML = `<div id="app">${html}</div>`;
  const container = document.getElementById('app')!;
  const serverP = container.querySelector('p.w');
  DOM.beginAppHydration();
  DOM.hydrate(() => App(), container);
  DOM.endAppHydration();
  await tick();
  // What startClient sweeps 100 ms after hydrating.
  DOM.removeUnclaimedKeyed(container);
  return { container, serverP, renders: () => renders };
}

describe('a deferred component while the page hydrates', () => {
  it('keeps the server content until its trigger loads the code', async () => {
    const { container, serverP, renders } = await serverThenHydrate({ kind: 'interaction', events: ['click'] });
    expect(renders()).toBe(0);
    expect(container.querySelector('p.w')).toBe(serverP);
    expect(container.textContent).toBe('widgetafter');

    serverP!.dispatchEvent(new Event('click', { bubbles: true }));
    await tick(10);
    expect(renders()).toBe(1);
    expect(container.querySelectorAll('p.w').length).toBe(1);
    expect(container.textContent).toBe('widgetafter');
  });

  it('keeps it for good when a media query never matches', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { container, serverP, renders } = await serverThenHydrate({ kind: 'media', query: '(max-width: 1px)' });
    await tick(10);
    expect(renders()).toBe(0);
    expect(container.querySelector('p.w')).toBe(serverP);
    expect(container.textContent).toBe('widgetafter');
  });
});

describe('a load:never component in the browser', () => {
  it('keeps the server content with no code to fetch', async () => {
    const widget = compile(`export function Widget() { return <p class="w">server only</p>; }`, {});
    // As the two builds compile it: the server's loads the module, the browser's has none.
    const OnServer = deferred(() => Promise.resolve({ default: widget.Widget }), { strategy: { kind: 'never' } });
    const InBrowser = deferred(null, { strategy: { kind: 'never' } });
    let Current: unknown = OnServer;
    const { App } = compile(`import { Lazy } from 'lazy'; export function App() { return <main><Lazy /><span>after</span></main>; }`, {
      lazy: { get Lazy() { return Current; } },
    });

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);
    expect(html).toContain('server only');

    Current = InBrowser;
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverP = container.querySelector('p.w');
    DOM.beginAppHydration();
    DOM.hydrate(() => App(), container);
    DOM.endAppHydration();
    await tick(10);
    DOM.removeUnclaimedKeyed(container);
    expect(container.querySelector('p.w')).toBe(serverP);
    expect(container.textContent).toBe('server onlyafter');
  });

  describe('load:interaction on the component, with the interaction played again (finding 015)', () => {
    async function counter() {
      const mod = compile(
        `import { createSignal } from '@fluixi/reactive/signal';
         export function Counter() {
           const [n, setN] = createSignal(0);
           const [text, setText] = createSignal('');
           return <form class="c" onSubmit={(e) => e.preventDefault()}>
             <button type="button" onClick={() => setN(n() + 1)}>clicks {() => n()}</button>
             <input onInput={(e) => setText(e.currentTarget.value)} />
             <output>{() => text()}</output>
           </form>;
         }`,
        {},
      );
      // Renders, not loads: the server render already loaded the module in this process.
      let renders = 0;
      const Counter = (props: unknown) => (renders++, mod.Counter(props));
      const Lazy = deferred(() => Promise.resolve({ default: Counter }), {
        strategy: { kind: 'interaction', events: ['pointerdown', 'focusin'] },
      });
      const { App } = compile(`import { Lazy } from 'lazy'; export function App() { return <main><Lazy /><p class="elsewhere">x</p></main>; }`, { lazy: { Lazy } });
      setServerMode(true);
      const html = await renderToStringAsync(() => App());
      setServerMode(false);
      renders = 0;
      document.body.innerHTML = `<div id="app">${html}</div>`;
      const container = document.getElementById('app')!;
      DOM.beginAppHydration();
      DOM.hydrate(() => App(), container);
      DOM.endAppHydration();
      await tick();
      DOM.removeUnclaimedKeyed(container);
      return { container, renders: () => renders };
    }

    it('does not load for an interaction elsewhere on the page', async () => {
      const { container, renders } = await counter();
      container.querySelector('.elsewhere')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      await tick(10);
      expect(renders()).toBe(0);
    });

    it('loads on an interaction inside it and replays the click that followed', async () => {
      const { container, renders } = await counter();
      const button = container.querySelector('button')!;
      button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick(10);
      expect(renders()).toBe(1);
      expect(container.querySelector('button')!.textContent).toBe('clicks 1');
    });

    it('replays text typed before the code arrived', async () => {
      const { container } = await counter();
      const input = container.querySelector('input')!;
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      input.value = 'ada';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await tick(10);
      expect(container.querySelector('input')!.value).toBe('ada');
      expect(container.querySelector('output')!.textContent).toBe('ada');
    });
  });
});
