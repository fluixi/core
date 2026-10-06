// @vitest-environment jsdom
/**
 * A heading, then a <Show> with a list, under a component: hydration must keep that order,
 * whether the server's nodes are adopted, the condition turns true late, or the whole branch
 * is one the server did not render. Found in the identity provider's console, where the list
 * came out above its heading.
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

describe('hydration: a <Switch> fallback holding a heading and a <Show>', () => {
  it('keeps the heading before the list', async () => {
    const src = `
      import { Show, For, Switch, Match } from '@fluixi/core';
      function Card(props) { return <div class="card">{props.children}</div>; }
      function Body(props) { return <div class="body">{props.children}</div>; }
      const rows = ['a', 'b'];
      function Dashboard() {
        return (
          <section>
            <h1>{() => 'Overview'}</h1>
            <Card>
              <Body>
                <h2>{() => 'Waiting'}</h2>
                <Show when={rows.length} fallback={<p>none</p>}>
                  <ul>
                    <For each={rows}>{(row) => <li>{row}</li>}</For>
                  </ul>
                </Show>
              </Body>
            </Card>
          </section>
        );
      }
      export function App() {
        const gate = () => null;
        return (
          <Switch fallback={<Dashboard />}>
            <Match when={gate() === 'closed'}>
              <p>closed</p>
            </Match>
          </Switch>
        );
      }
    `;
    const { App } = compile(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);
    expect((html.match(/<(h2|ul)\b/g) ?? []).join(',')).toBe('<h2,<ul');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverNodes = [...container.querySelectorAll('*')];
    DOM.hydrate(() => App(), container);
    await tick();
    expect([...container.querySelectorAll('.body > *')].map((n) => n.tagName)).toEqual(['H2', 'UL']);
    expect([...container.querySelectorAll('*')].every((node) => serverNodes.includes(node))).toBe(true);
  });
});

describe('hydration: a <Show> whose data arrives after hydration starts', () => {
  it('keeps the heading before the list when the condition turns true late', async () => {
    const src = `
      import { Show, For } from '@fluixi/core';
      import { createSignal } from '@fluixi/reactive/signal';
      function Body(props) { return <div class="body">{props.children}</div>; }
      export const [rows, setRows] = createSignal(globalThis.__server ? ['a', 'b'] : []);
      export function App() {
        return (
          <Body>
            <h2>{() => 'Waiting'}</h2>
            <Show when={rows().length} fallback={<p>none</p>}>
              <ul>
                <For each={rows()}>{(row) => <li>{row}</li>}</For>
              </ul>
            </Show>
          </Body>
        );
      }
    `;
    (globalThis as any).__server = true;
    const server = compile(src);
    setServerMode(true);
    const html = await renderToStringAsync(() => server.App());
    setServerMode(false);
    (globalThis as any).__server = false;

    const client = compile(src);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    DOM.hydrate(() => client.App(), container);
    await tick();
    client.setRows(['a', 'b']);
    await tick();
    await tick();
    expect([...container.querySelectorAll('.body > *')].map((n) => n.tagName)).toEqual(['H2', 'UL']);
  });
});

describe('hydration: a parent built fresh while hydrating', () => {
  it('keeps a heading before the <Show> list after it', async () => {
    // Body builds its own element instead of claiming the server's, as a component that makes
    // its node by hand does: hydration is active, but this parent has no server nodes.
    const src = `
      import { Show, For } from '@fluixi/core';
      import { insert, createNativeElement } from '@fluixi/dom';
      function Body(props) {
        const el = globalThis.__server ? createNativeElement('div') : document.createElement('div');
        el.className = 'body';
        insert(el, () => props.children);
        return el;
      }
      const rows = ['a', 'b'];
      export function App() {
        return (
          <main>
            <Body>
              <h2>{() => 'Waiting'}</h2>
              <Show when={rows.length} fallback={<p>none</p>}>
                <ul>
                  <For each={rows}>{(row) => <li>{row}</li>}</For>
                </ul>
              </Show>
            </Body>
            <p>after</p>
          </main>
        );
      }
    `;
    const { App } = compile(src);
    (globalThis as any).__server = true;
    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);
    (globalThis as any).__server = false;

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    DOM.hydrate(() => App(), container);
    await tick();
    const body = [...container.querySelectorAll('.body')].at(-1)!;
    expect([...body.children].map((n) => n.tagName)).toEqual(['H2', 'UL']);
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
