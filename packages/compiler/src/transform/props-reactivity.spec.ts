// @vitest-environment jsdom
/**
 * Does the rewrite actually keep reactivity, in both authoring modes?
 *
 * The source-level tests in props.spec check what comes out. This one runs it: compile a
 * component that destructures its props, render it with a signal behind the prop, change
 * the signal, and look at the DOM. Destructuring without the rewrite reads once, so the
 * text would stay put — that's the failure this has to rule out.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { transformTemplates } from './templates.js';
import { ensureIntegration } from '../../../core/src/lib/render/component.js';

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
};

/** Compile the way a build does — one pass, the rewrite folded in — then load it. */
function build(src: string, format: 'jsx' | 'lit') {
  const compiled =
    transformTemplates(src, 'component.tsx', {
      format,
      propsDestructure: true,
      runtimeModule: '@fluixi/dom',
      signalModule: '@fluixi/dom',
      controlFlowModule: '@fluixi/dom',
      importSource: '@fluixi/dom',
    })?.code ?? src;

  const code = babel.transformSync(compiled, {
    filename: 'component.js',
    configFile: false,
    babelrc: false,
    presets: [],
    plugins: [[require.resolve('@babel/plugin-transform-modules-commonjs'), {}]],
  })!.code!;

  const module = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(module.exports, req, module);
  return { module: module.exports, source: compiled };
}

beforeAll(() => ensureIntegration());

/** Render `App` into a container and hand back the text of the rendered node. */
function mount(App: () => any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  DOM.render(() => App(), container);
  return { container, text: () => container.textContent };
}

describe('a rewritten component stays reactive', () => {
  it('updates through JSX', () => {
    const { module } = build(
      `
      import { createSignal } from '@fluixi/reactive/signal';

      export function Label({ text }) {
        return <span class="out">{text}</span>;
      }

      export function App() {
        const [value, setValue] = createSignal('first');
        globalThis.__setValue = setValue;
        return <Label text={value()} />;
      }
      `,
      'jsx',
    );

    const { text } = mount(module.App);
    expect(text()).toBe('first');

    (globalThis as any).__setValue('second');
    expect(text()).toBe('second');
  });

  it('updates through an html template', () => {
    const { module } = build(
      `
      import { html } from '@fluixi/dom';
      import { createSignal } from '@fluixi/reactive/signal';

      export function Label({ text }) {
        return html\`<span class="out">\${text}</span>\`;
      }

      export function App() {
        const [value, setValue] = createSignal('first');
        globalThis.__setValue2 = setValue;
        return html\`<\${Label} text=\${value()} />\`;
      }
      `,
      'lit',
    );

    const { text } = mount(module.App);
    expect(text()).toBe('first');

    (globalThis as any).__setValue2('second');
    expect(text()).toBe('second');
  });

  it('applies a default only when the prop is missing', () => {
    const { module } = build(
      `
      export function Label({ text = 'fallback' }) {
        return <span>{text}</span>;
      }
      export function App() { return <Label />; }
      export function Given() { return <Label text="given" />; }
      `,
      'jsx',
    );

    expect(mount(module.App).text()).toBe('fallback');
    expect(mount(module.Given).text()).toBe('given');
  });

  it('leaves a null prop as null, the way a JS default does', () => {
    // `??` would substitute the default here; a destructuring default does not.
    const { module } = build(
      `
      export function Label({ text = 'fallback' }) {
        return <span>{String(text)}</span>;
      }
      export function App() { return <Label text={null} />; }
      `,
      'jsx',
    );

    expect(mount(module.App).text()).toBe('null');
  });
});

describe('a rest element', () => {
  it('spreads onto the element and keeps the named prop live', () => {
    const { module } = build(
      `
      import { createSignal } from '@fluixi/reactive/signal';

      export function Field({ label, ...rest }) {
        return <input aria-label={label} {...rest} />;
      }

      export function App() {
        const [name, setName] = createSignal('first');
        globalThis.__setField = setName;
        return <Field label={name()} type="text" data-role="entry" />;
      }
      `,
      'jsx',
    );

    const { container } = mount(module.App);
    const input = container.querySelector('input')!;
    // The rest half carried the other props over.
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('data-role')).toBe('entry');
    expect(input.getAttribute('aria-label')).toBe('first');

    // And splitProps kept the getters, so the named half still updates.
    (globalThis as any).__setField('second');
    expect(input.getAttribute('aria-label')).toBe('second');
  });

  it('behaves exactly like the splitProps call it replaces', () => {
    // Parity is the bar: whatever the hand-written idiom does, the generated one does.
    // Both keep a forwarded prop live, since splitProps hands the rest over as getters
    // and spread re-reads them in an effect.
    const app = (field: string) => `
      import { splitProps } from '@fluixi/dom';
      import { createSignal } from '@fluixi/reactive/signal';

      ${field}

      export function App() {
        const [role, setRole] = createSignal('one');
        globalThis.__setRole = setRole;
        return <Field label="x" data-role={role()} />;
      }
    `;

    const generated = build(
      app('export function Field({ label, ...rest }) { return <input aria-label={label} {...rest} />; }'),
      'jsx',
    );
    const handWritten = build(
      app(
        'export function Field(props) { const [local, others] = splitProps(props, ["label"]); ' +
          'return <input aria-label={local.label} {...others} />; }',
      ),
      'jsx',
    );

    const read = (module: any) => {
      const { container } = mount(module.App);
      const input = container.querySelector('input')!;
      const before = input.getAttribute('data-role');
      (globalThis as any).__setRole('two');
      return { before, after: input.getAttribute('data-role'), label: input.getAttribute('aria-label') };
    };

    expect(read(generated.module)).toEqual(read(handWritten.module));
  });
});

describe('without the rewrite', () => {
  it('shows the problem it solves, and that the shape analysis has to know about it', () => {
    const src = `
      import { createSignal } from '@fluixi/reactive/signal';

      export function Label({ text }) {
        return <span>{text}</span>;
      }

      export function App() {
        const [value, setValue] = createSignal('first');
        globalThis.__setValue3 = setValue;
        return <Label text={value()} />;
      }
    `;
    // Same pipeline with the option off. This also guards the subtler half: the hole is
    // only wired reactively when the analysis sees a member read, so a rewrite that
    // changed the text without changing the AST would land right back here.
    const compiled = transformTemplates(src, 'component.tsx', {
      format: 'jsx',
      runtimeModule: '@fluixi/dom',
      signalModule: '@fluixi/dom',
      controlFlowModule: '@fluixi/dom',
      importSource: '@fluixi/dom',
    })!.code;
    const code = babel.transformSync(compiled, {
      filename: 'component.js',
      configFile: false,
      babelrc: false,
      plugins: [[require.resolve('@babel/plugin-transform-modules-commonjs'), {}]],
    })!.code!;
    const module = { exports: {} as any };
    // eslint-disable-next-line no-new-func
    new Function('exports', 'require', 'module', code)(
      module.exports,
      (id: string) => REQUIRE_MAP[id],
      module,
    );

    const { text } = mount(module.exports.App);
    expect(text()).toBe('first');
    (globalThis as any).__setValue3('second');
    expect(text()).toBe('first');
  });
});
