// @vitest-environment jsdom
/**
 * A <Show> whose function child returns a fragment of two more <Show>s, followed by an element.
 * Hydration must keep the fragment between its siblings, and wrapping it in a div must not
 * render it twice. Found in the identity provider's sidebar, where the organization picker
 * moved below the navigation groups.
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

const classes = (el: Element) => [...el.querySelectorAll('nav > *')].map((n) => n.className || n.tagName.toLowerCase());

async function roundTrip(src: string) {
  const server = compile(src);
  setServerMode(true);
  const html = await renderToStringAsync(() => server.App());
  setServerMode(false);
  const client = compile(src);
  document.body.innerHTML = `<div id="app">${html}</div>`;
  const container = document.getElementById('app')!;
  const serverOrder = classes(container);
  DOM.hydrate(() => client.App(), container);
  await tick();
  await tick();
  return { serverOrder, clientOrder: classes(container), container };
}

const shape = (body: string) => `
  import { Show } from '@fluixi/core';
  const context = () => ({ name: 'Acme', back: null, switcher: { label: 'Switch' } });
  const searchable = () => false;
  export function App() {
    return (
      <nav class="sidebar">
        <div class="top">{() => 'brand'}</div>
        ${body}
        <Show when={searchable()}><div class="search" /></Show>
        <div class="groups">{() => 'groups'}</div>
      </nav>
    );
  }
`;

const FRAGMENT = `
  <Show when={context()}>
    {(c) => (
      <>
        <Show when={c.back}>{(back) => <a class="back">{back.label}</a>}</Show>
        <Show when={c.switcher} fallback={<div class="context">{c.name}</div>}>
          {(switcher) => <button class="picker">{switcher.label}</button>}
        </Show>
      </>
    )}
  </Show>
`;

describe('hydration: a <Show> fragment followed by an element', () => {

  it('keeps the fragment before the element', async () => {
    const { serverOrder, clientOrder } = await roundTrip(shape(FRAGMENT));
    expect(serverOrder).toEqual(['top', 'picker', 'groups']);
    expect(clientOrder).toEqual(['top', 'picker', 'groups']);
  });

  it('renders it once when wrapped in a div', async () => {
    const { serverOrder, clientOrder } = await roundTrip(shape(`<div class="wrap">${FRAGMENT}</div>`));
    expect(serverOrder).toEqual(['top', 'wrap', 'groups']);
    expect(clientOrder).toEqual(['top', 'wrap', 'groups']);
  });
});

describe('hydration: a menu in the fragment', () => {
  // The organization picker: a provider around a trigger button with spread props, and a
  // closed popup, in place of the context card.
  const src = `
    import { Show, Portal, createContext } from '@fluixi/core';
    import { createNativeElement, insert } from '@fluixi/dom';
    const Ctx = createContext(0);
    function Menu(props) { return <Ctx.Provider value={1}>{props.children}</Ctx.Provider>; }
    // As a library build emits it: the element by hand, its children inserted after.
    function Trigger(props) {
      const el = createNativeElement('button');
      el.setAttribute('class', 'picker');
      insert(el, () => props.children);
      return el;
    }
    function Popup(props) { return <Show when={false}><Portal>{props.children}</Portal></Show>; }
    const context = () => ({ name: 'Acme', back: null, switcher: { label: 'Switch' } });
    export function App() {
      return (
        <nav class="sidebar">
          <style>{'.sidebar {}'}</style>
          <div class="top">{() => 'brand'}</div>
          <Show when={context()}>
            {(c) => (
              <>
                <Show when={c.back}>{(back) => <a class="back">{back.label}</a>}</Show>
                <Show when={c.switcher} fallback={<div class="context">{c.name}</div>}>
                  {(switcher) => (
                    <Menu>
                      <Trigger aria-label={switcher.label}><span>{c.name}</span></Trigger>
                      <Popup><div class="menu">items</div></Popup>
                    </Menu>
                  )}
                </Show>
              </>
            )}
          </Show>
          <Show when={false}><div class="search" /></Show>
          <div class="groups">{() => 'groups'}</div>
        </nav>
      );
    }
  `;

  it('keeps the picker before the groups', async () => {
    const { serverOrder, clientOrder, container } = await roundTrip(src);
    const want = ['style', 'top', 'picker', 'groups'];
    expect(serverOrder).toEqual(want);
    expect(clientOrder).toEqual(want);
    expect(container.querySelectorAll('.picker')).toHaveLength(1);
  });
});

describe('hydration: the element path, one insert per child', () => {
  const { createComponent, createNativeElement, insert, Show } = DOM as any;
  const div = (cls: string, text?: string) => {
    const el = createNativeElement('div');
    el.setAttribute('class', cls);
    if (text) insert(el, () => text, null);
    return el;
  };
  const [ready, setReady] = S.createSignal(true);
  const [name, setName] = S.createSignal('Acme');
  const App = (switcher: boolean) => () => {
    const nav = createNativeElement('nav');
    insert(nav, div('top', 'brand'), null);
    insert(
      nav,
      S.createMemo(() =>
        createComponent(Show, {
          get when() { return ready() ? { name: name() } : null; },
          get children() {
            return (c: any) => [
              S.createMemo(() => createComponent(Show, { get when() { return undefined; }, get children() { return () => div('back'); } })),
              S.createMemo(() =>
                createComponent(Show, {
                  get when() { return switcher ? { label: 'Switch' } : undefined; },
                  get fallback() { return div('context', c.name); },
                  get children() { return () => div('picker'); },
                }),
              ),
            ];
          },
        }),
      ),
      null,
    );
    insert(nav, S.createMemo(() => createComponent(Show, { get when() { return false; }, get children() { return div('search'); } })), null);
    insert(nav, div('groups', 'groups'), null);
    return nav;
  };

  it('keeps the context in place when it arrives after hydration', async () => {
    setReady(true);
    setServerMode(true);
    const html = await renderToStringAsync(() => App(false)());
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const groups = container.querySelector('.groups');
    setReady(false);
    DOM.hydrate(() => App(false)(), container);
    // The client built no context, so its groups must still adopt the server's groups.
    expect(container.querySelector('.groups')).toBe(groups);
    await tick();
    // What the app's client entry does once hydration settles.
    DOM.removeUnclaimedKeyed(container);
    setReady(true);
    await tick();
    await tick();
    expect(classes(container)).toEqual(['top', 'context', 'groups']);
  });

  it('steps out of a button adopted inside an array', async () => {
    const [label, setLabel] = S.createSignal('Acme');
    const Picker = () => {
      const nav = createNativeElement('nav');
      insert(nav, div('top', 'brand'), null);
      insert(
        nav,
        S.createMemo(() =>
          createComponent(Show, {
            get when() { return { name: label() }; },
            get children() {
              return (c: any) => [
                S.createMemo(() => {
                  const button = createNativeElement('button');
                  button.setAttribute('class', 'picker');
                  const mark = createNativeElement('span');
                  insert(mark, () => c.name, null);
                  insert(button, mark, null);
                  return button;
                }),
                S.createMemo(() => createComponent(Show, { get when() { return false; }, get children() { return div('menu'); } })),
              ];
            },
          }),
        ),
        null,
      );
      insert(nav, S.createMemo(() => createComponent(Show, { get when() { return false; }, get children() { return div('search'); } })), null);
      insert(nav, div('groups', 'groups'), null);
      return nav;
    };
    setServerMode(true);
    const html = await renderToStringAsync(() => Picker());
    setServerMode(false);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    DOM.hydrate(() => Picker(), container);
    await tick();
    expect(classes(container)).toEqual(['top', 'picker', 'groups']);
    setLabel('Globex');
    await tick();
    expect(classes(container)).toEqual(['top', 'picker', 'groups']);
  });

  for (const hydrating of [true, false]) {
    it(`keeps the context in place when it is replaced${hydrating ? ' after hydration' : ''}`, async () => {
      setReady(true);
      setName('Acme');
      document.body.innerHTML = '<div id="app"></div>';
      let container = document.getElementById('app')!;
      if (hydrating) {
        setServerMode(true);
        const html = await renderToStringAsync(() => App(false)());
        setServerMode(false);
        container.innerHTML = html;
        DOM.hydrate(() => App(false)(), container);
      } else {
        DOM.render(() => App(false)(), container);
      }
      await tick();
      expect(classes(container)).toEqual(['top', 'context', 'groups']);
      // A new context object: the branch is built again in the same place.
      setName('Globex');
      await tick();
      expect(classes(container)).toEqual(['top', 'context', 'groups']);
      expect(container.querySelector('.context')!.textContent).toBe('Globex');
    });
  }

  for (const switcher of [false, true]) {
    it(`keeps the ${switcher ? 'picker' : 'context'} before the groups`, async () => {
      setServerMode(true);
      const html = await renderToStringAsync(() => App(switcher)());
      setServerMode(false);
      document.body.innerHTML = `<div id="app">${html}</div>`;
      const container = document.getElementById('app')!;
      const want = ['top', switcher ? 'picker' : 'context', 'groups'];
      expect(classes(container)).toEqual(want);
      DOM.hydrate(() => App(switcher)(), container);
      await tick();
      await tick();
      expect(classes(container)).toEqual(want);
    });
  }
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
