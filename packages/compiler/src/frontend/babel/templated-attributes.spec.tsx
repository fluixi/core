// @vitest-environment jsdom
import { compile, load } from '../../../test/fixtures.js';
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { compileTemplate } from '../../lower/compile-template.js';

const OPTS = {
  templateClone: true,
  partialTemplates: true,
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};

const count = (code: string, needle: string): number => code.split(needle).length - 1;
const templates = (code: string): number => (code.match(/const _fxTmpl\$\d+/g) ?? []).length;

beforeAll(() => DOM.registerCreateComponent(((C: any, p: any) => C(p)) as any));

describe('generated code', () => {
  it('keeps the benchmark row in one template with a class binding', () => {
    const code = compile(
      `export const Row = (props) => (
        <tr class={props.selected() === row().id ? 'danger' : ''}>
          <td class="col-md-1">{row().id}</td>
          <td class="col-md-4"><a class="lbl">{row().label()}</a></td>
          <td class="col-md-1"><a class="remove"><span>x</span></a></td>
          <td class="col-md-6"></td>
        </tr>
      );`,
      OPTS,
    );
    expect(templates(code)).toBe(1);
    expect(code).not.toContain('spread(');
    expect(count(code, 'insert(')).toBe(2);
    expect(code).toContain('setClassName(');
  });

  it('binds classList, style and a plain attribute the same way', () => {
    const byClassList = compile(
      `export const A = () => <div classList={{ danger: sel() }}><span>{x()}</span></div>;`,
      OPTS,
    );
    expect(templates(byClassList)).toBe(1);
    expect(byClassList).not.toContain('spread(');
    expect(byClassList).toContain('setDynamicClassList(');

    const byStyle = compile(
      `export const B = () => <div style={{ color: c() }}><span>{x()}</span></div>;`,
      OPTS,
    );
    expect(templates(byStyle)).toBe(1);
    expect(byStyle).not.toContain('spread(');
    expect(byStyle).toContain('setStyle(');

    const byAttr = compile(
      `export const C = () => <div title={t()}><span>{x()}</span></div>;`,
      OPTS,
    );
    expect(templates(byAttr)).toBe(1);
    expect(byAttr).not.toContain('spread(');
    expect(byAttr).toContain('setDynamicAttribute(');
  });

  it('binds a reactive attribute on a nested element, not only the root', () => {
    const code = compile(
      `export const A = () => <div><p>a</p><span title={t()}>{x()}</span></div>;`,
      OPTS,
    );
    expect(templates(code)).toBe(1);
    expect(code).not.toContain('spread(');
    expect(code).toContain('setDynamicAttribute(');
  });

  it('templates an element built inside a list callback, not only a root', () => {
    const code = compile(
      `export const List = () => (
        <ul>
          {items.map((i) => (
            <li class={sel() === i ? 'on' : ''}>{label(i)}</li>
          ))}
        </ul>
      );`,
      OPTS,
    );
    expect(code).not.toContain('spread(');
    expect(code).toContain('setClassName(');
    expect(code).toContain('<li');
  });

  it('keeps spread for a real spread and for a property-only name', () => {
    const spread = compile(`export const A = (p) => <div {...p}><span>{x()}</span></div>;`, OPTS);
    expect(spread).toContain('spread(');
    const value = compile(`export const B = () => <input value={v()} />;`, OPTS);
    expect(value).toContain('spread(');
  });

  it('shares the fix with html templates when partial templates are on', () => {
    const { code } = compileTemplate(
      {
        statics: ['<div title="', '"><span>', '</span></div>'],
        holes: [
          { code: 't()', reactive: true },
          { code: 'x()', reactive: true },
        ],
      },
      { partialTemplates: true, templateClone: true },
    );
    expect(code).not.toContain('spread(');
    expect(code).toContain('setDynamicAttribute(');
    expect(count(code, 'templateNode(')).toBe(1);
  });
});

const SRC = `
import { createSignal } from '@fluixi/reactive/signal';
export const api = {};
export function Row() {
  const [sel, setSel] = createSignal(false);
  const [label, setLabel] = createSignal('a');
  const [title, setTitle] = createSignal('one');
  const [color, setColor] = createSignal('red');
  api.setSel = setSel;
  api.setLabel = setLabel;
  api.setTitle = setTitle;
  api.setColor = setColor;
  return (
    <tr class={sel() ? 'danger' : ''} title={title()}>
      <td class="col-md-1">{7}</td>
      <td class="col-md-4"><a class="lbl" style={{ color: color() }}>{label()}</a></td>
      <td class="col-md-1"><a class="remove"><span>x</span></a></td>
      <td class="col-md-6"></td>
    </tr>
  );
}
export function Card() {
  const [on, setOn] = createSignal(false);
  const [label, setLabel] = createSignal('x');
  api.setOn = setOn;
  api.setCardLabel = setLabel;
  return <div class={on() ? 'danger' : ''}><span>{label()}</span></div>;
}
`;

// Hydration needs the hydratable output whichever output the run is checking.
const HYDRATABLE = { hydratable: true };

function loadSrc(extra = {}) {
  return load(compile(SRC, { ...OPTS, ...extra }), { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S });
}

describe('runtime bindings on a templated element', () => {
  it('updates class, attribute and style on that node only', async () => {
    const mod = loadSrc();
    const host = document.createElement('div');
    document.body.append(host);
    DOM.render(() => mod.Row(), host);
    const tr = host.querySelector('tr')!;
    const label = host.querySelector('.lbl') as HTMLElement;
    const sibling = host.querySelector('.col-md-6')!;
    expect(tr.getAttribute('class')).toBe('');
    expect(tr.getAttribute('title')).toBe('one');
    expect(label.style.color).toBe('red');

    mod.api.setSel(true);
    mod.api.setTitle('two');
    mod.api.setColor('blue');
    await S.flush();
    expect(host.querySelector('tr')).toBe(tr);
    expect(tr.getAttribute('class')).toBe('danger');
    expect(tr.getAttribute('title')).toBe('two');
    expect(label.style.color).toBe('blue');
    expect(host.querySelector('.col-md-6')).toBe(sibling);

    mod.api.setSel(false);
    mod.api.setTitle(null);
    await S.flush();
    expect(tr.getAttribute('class')).toBe('');
    expect(tr.hasAttribute('title')).toBe(false);
  });

  it('toggles classList entries without touching a static class', async () => {
    const mod = load(
      compile(
        `
import { createSignal } from '@fluixi/reactive/signal';
export const api = {};
export function A() {
  const [on, setOn] = createSignal(false);
  api.setOn = setOn;
  return <div class="base" classList={{ danger: on() }}><span>{'x'}</span></div>;
}
`,
        OPTS,
      ),
      { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S },
    );
    const host = document.createElement('div');
    document.body.append(host);
    DOM.render(() => mod.A(), host);
    const div = host.querySelector('div')!;
    expect(div.getAttribute('class')).toBe('base');
    mod.api.setOn(true);
    await S.flush();
    expect(div.classList.contains('danger')).toBe(true);
    expect(div.classList.contains('base')).toBe(true);
    mod.api.setOn(false);
    await S.flush();
    expect(div.classList.contains('danger')).toBe(false);
    expect(div.classList.contains('base')).toBe(true);
  });
});

const LIST_SRC = `
import { createSignal } from '@fluixi/reactive/signal';
import { For } from '@fluixi/dom';
export const api = {};
const rows = [
  { id: 1, label: 'One' },
  { id: 2, label: 'Two' },
  { id: 3, label: 'Three' },
];
export function List() {
  const [sel, setSel] = createSignal(2);
  api.setSel = setSel;
  return (
    <table>
      <tbody>
        <For each={rows} by={(r) => r.id}>
          {(row) => (
            <tr class={sel() === row().id ? 'danger' : ''}>
              <td>{row().label}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
`;

function loadList(extra = {}) {
  return load(compile(LIST_SRC, { ...OPTS, ...extra }), { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S });
}

describe('templated rows in a list', () => {
  it('moves the selected class between rows without rebuilding them', async () => {
    const mod = loadList();
    const host = document.createElement('div');
    document.body.append(host);
    DOM.render(() => mod.List(), host);
    const rows = [...host.querySelectorAll('tr')];
    expect(rows).toHaveLength(3);
    expect(rows[1]!.getAttribute('class')).toBe('danger');

    mod.api.setSel(1);
    await S.flush();
    const after = [...host.querySelectorAll('tr')];
    expect(after.every((r, i) => r === rows[i])).toBe(true);
    expect(rows[0]!.getAttribute('class')).toBe('danger');
    expect(rows[1]!.getAttribute('class')).toBe('');
  });

  it('hydrates by adopting the server rows, then updates the adopted row', async () => {
    const serverMod = loadList(HYDRATABLE);
    const html = DOM.renderToString(() => serverMod.List());

    const clientMod = loadList(HYDRATABLE);
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = html;
    const serverRows = [...container.querySelectorAll('tr')];
    expect(serverRows).toHaveLength(3);
    expect(serverRows[1]!.getAttribute('class')).toBe('danger');

    DOM.hydrate(() => clientMod.List(), container);
    const after = [...container.querySelectorAll('tr')];
    expect(after.every((r, i) => r === serverRows[i])).toBe(true);

    clientMod.api.setSel(3);
    await S.flush();
    expect(serverRows[1]!.getAttribute('class')).toBe('');
    expect(serverRows[2]!.getAttribute('class')).toBe('danger');
    expect(container.querySelectorAll('tr')).toHaveLength(3);
  });
});

describe('hydration of a templated element with reactive attributes', () => {
  it('adopts the server node once and binds updates onto it', async () => {
    const serverMod = loadSrc(HYDRATABLE);
    const html = DOM.renderToString(() => serverMod.Card());
    expect(html).toContain('class=""');

    const clientMod = loadSrc(HYDRATABLE);
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = html;
    const serverDiv = container.querySelector('div');
    expect(serverDiv).not.toBeNull();

    DOM.hydrate(() => clientMod.Card(), container);
    const divs = container.querySelectorAll('div');
    expect(divs).toHaveLength(1);
    expect(divs[0]).toBe(serverDiv);
    expect(divs[0]!.getAttribute('class')).toBe('');

    clientMod.api.setOn(true);
    clientMod.api.setCardLabel('y');
    await S.flush();
    expect(divs[0]!.getAttribute('class')).toBe('danger');
    expect(divs[0]!.querySelector('span')!.textContent).toBe('y');
  });
});
