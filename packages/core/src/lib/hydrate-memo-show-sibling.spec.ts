// @vitest-environment jsdom
/**
 * The shape @fluixi-ui/form's compiled FormField produces: a component whose children are
 * [createMemo(<Show>{() => <label/>}</Show>), () => <input/>]. Hydrating it must adopt the
 * server's label and input, not build a second input beside them.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

const { createComponent, createNativeElement, insert, Show } = DOM as any;
const tick = () => new Promise((r) => setTimeout(r, 0));

function el(tag: string, children?: unknown) {
  const node = createNativeElement(tag);
  if (children !== undefined) insert(node, children);
  return node;
}

function Field(props: { children: unknown }) {
  return el('div', () => props.children);
}

function FormFieldLike() {
  return S.createMemo(() =>
    createComponent(Field, {
      get children() {
        return [
          S.createMemo(() =>
            createComponent(Show, {
              get when() {
                return true;
              },
              get children() {
                return () => el('label', 'Email');
              },
            }),
          ),
          () => el('input'),
        ];
      },
    }),
  );
}

beforeAll(() => ensureIntegration());

describe('hydration: a memoised <Show> before a sibling', () => {
  it('adopts the label and the input in order', async () => {
    const App = () => el('form', () => [createComponent(FormFieldLike, {}), () => el('button', 'Go')]);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);
    expect((html.match(/<input/g) || []).length).toBe(1);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverInput = container.querySelector('input');

    DOM.hydrate(() => App(), container);
    await tick();

    expect({
      labels: container.querySelectorAll('label').length,
      inputs: container.querySelectorAll('input').length,
      buttons: container.querySelectorAll('button').length,
    }).toEqual({ labels: 1, inputs: 1, buttons: 1 });
    expect(container.querySelector('input')).toBe(serverInput);
  });

  it('adopts it when the same shape comes from the current compiler', async () => {
    const src = `
      import { Show } from '@fluixi/core';
      function Field(props) { return <div data-field="">{props.children}</div>; }
      function FormField(props) {
        return (
          <Field>
            <Show when={props.label != null}>{() => <label>{props.label}</label>}</Show>
            {props.children ? props.children() : <input />}
          </Field>
        );
      }
      export function App() {
        return (
          <form>
            <FormField label="Email">{() => <input type="email" />}</FormField>
            <button>Go</button>
          </form>
        );
      }
    `;
    const { App } = compile(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverInput = container.querySelector('input');
    const serverNodes = [...container.querySelectorAll('*')];
    DOM.hydrate(() => App(), container);
    await tick();
    // Every node is the server's: nothing rebuilt, nothing out of order.
    expect([...container.querySelectorAll('*')].every((node) => serverNodes.includes(node))).toBe(true);
    expect([...container.querySelectorAll('[data-field] > *')].map((n) => n.tagName)).toEqual(['LABEL', 'INPUT']);

    expect({
      labels: container.querySelectorAll('label').length,
      inputs: container.querySelectorAll('input').length,
      buttons: container.querySelectorAll('button').length,
    }).toEqual({ labels: 1, inputs: 1, buttons: 1 });
    expect(container.querySelector('input')).toBe(serverInput);
  });

  it('adopts a mapped list that mixes a component item with element items', async () => {
    const src = `
      function Nav(props) { return <a href={props.href} class="module">{props.children}</a>; }
      const modules = [
        { id: 'a', label: 'One' },
        { id: 'b', label: 'Two', soon: true },
        { id: 'c', label: 'Three', soon: true },
      ];
      export function App() {
        return (
          <nav>
            <h2>{() => 'Home'}</h2>
            {() =>
              modules.map((m) =>
                m.soon ? (
                  <span class="module">{m.label}<span class="soon">{() => 'Soon'}</span></span>
                ) : (
                  <Nav href={'/' + m.id}>{m.label}</Nav>
                ),
              )
            }
          </nav>
        );
      }
    `;
    const { App } = compile(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverNodes = [...container.querySelectorAll('*')];
    DOM.hydrate(() => App(), container);
    await tick();
    expect([...container.querySelectorAll('.module')].map((n) => n.firstChild?.textContent)).toEqual(['One', 'Two', 'Three']);
    expect([...container.querySelectorAll('*')].every((node) => serverNodes.includes(node))).toBe(true);
  });

  it('adopts a form whose children open with an empty reactive slot', async () => {
    const src = `
      import { createSignal } from '@fluixi/reactive/signal';
      // Reads the children getter twice, as @fluixi-ui/form's Form does.
      function Form(props) {
        const content = () => (typeof props.children === 'function' ? props.children() : props.children);
        return <form>{content}</form>;
      }
      function Field(props) { return <div data-field="">{props.label}</div>; }
      function Button(props) { return <button type="submit">{props.children}</button>; }
      export function App() {
        const [error] = createSignal(null);
        const [pending] = createSignal(false);
        return (
          <Form>
            {() => (error() ? <p role="alert">{error()}</p> : null)}
            <Field label="Email" />
            <Field label="Password" />
            <Button>{() => (pending() ? 'Wait' : 'Go')}</Button>
          </Form>
        );
      }
    `;
    const { App } = compile(src);

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverNodes = [...container.querySelectorAll('*')];
    DOM.hydrate(() => App(), container);
    await tick();
    expect(container.querySelectorAll('button').length).toBe(1);
    expect(container.querySelectorAll('[data-field]').length).toBe(2);
    expect([...container.querySelectorAll('*')].every((node) => serverNodes.includes(node))).toBe(true);
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
