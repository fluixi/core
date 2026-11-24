// @vitest-environment jsdom
/**
 * Does the rewrite actually keep reactivity, in both authoring modes?
 *
 * The source-level tests in props.spec check what comes out. This one runs it: compile a
 * component that destructures its props, render it with a signal behind the prop, change
 * the signal, and look at the DOM. Destructuring without the rewrite reads once, so the
 * text would stay put, that's the failure this has to rule out.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as DOM from '@fluixi/dom';
import { transformTemplates } from '@fluixi/compiler/transform';
import { ensureIntegration } from './component.js';

/**
 * Compiled output is written here and imported, rather than converted to CJS and run
 * with a stubbed module map. The directory has to sit inside the package: node resolves
 * a bare specifier by walking up from the file, so `@fluixi/dom` and
 * `@fluixi/reactive/signal` only resolve, and resolve to the same instances this file
 * imported, from within core. That is also what makes a transformer unnecessary, and
 * this package has no business depending on one to run a test.
 */
let dir: string;
let seq = 0;

/** Compile the way a build does, one pass, the rewrite folded in, then load it. */
async function build(src: string, format: 'jsx' | 'html') {
  const compiled =
    transformTemplates(src, 'component.tsx', {
      format,
      propsDestructure: true,
      runtimeModule: '@fluixi/dom',
      controlFlowModule: '@fluixi/dom',
    })?.code ?? src;

  const file = join(dir, `component${seq++}.js`);
  writeFileSync(file, compiled);
  const module = (await import(pathToFileURL(file).href)) as any;
  return { module, source: compiled };
}

beforeAll(() => {
  ensureIntegration();
  dir = mkdtempSync(join(dirname(fileURLToPath(import.meta.url)), '.props-reactivity-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Render `App` into a container and hand back the text of the rendered node. */
function mount(App: () => any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  DOM.render(() => App(), container);
  return { container, text: () => container.textContent };
}

describe('a rewritten component stays reactive', () => {
  it('updates through JSX', async () => {
    const { module } = await build(
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

  it('updates through an html template', async () => {
    const { module } = await build(
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
      'html',
    );

    const { text } = mount(module.App);
    expect(text()).toBe('first');

    (globalThis as any).__setValue2('second');
    expect(text()).toBe('second');
  });

  it('applies a default only when the prop is missing', async () => {
    const { module } = await build(
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

  it('leaves a null prop as null, the way a JS default does', async () => {
    // `??` would substitute the default here; a destructuring default does not.
    const { module } = await build(
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
  it('spreads onto the element and keeps the named prop live', async () => {
    const { module } = await build(
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

  it('behaves exactly like the splitProps call it replaces', async () => {
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

    const generated = await build(
      app('export function Field({ label, ...rest }) { return <input aria-label={label} {...rest} />; }'),
      'jsx',
    );
    const handWritten = await build(
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
  it('shows the problem it solves, and that the shape analysis has to know about it', async () => {
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
    // Same pipeline with the option turned off explicitly. This also guards the subtler
    // half: the hole is
    // only wired reactively when the analysis sees a member read, so a rewrite that
    // changed the text without changing the AST would land right back here.
    const compiled = transformTemplates(src, 'component.tsx', {
      format: 'jsx',
      propsDestructure: false,
      runtimeModule: '@fluixi/dom',
      controlFlowModule: '@fluixi/dom',
    })!.code;
    const file = join(dir, `component${seq++}.js`);
    writeFileSync(file, compiled);
    const module = (await import(pathToFileURL(file).href)) as any;

    const { text } = mount(module.App);
    expect(text()).toBe('first');
    (globalThis as any).__setValue3('second');
    expect(text()).toBe('first');
  });
});
