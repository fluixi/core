// @vitest-environment jsdom
/**
 * if/else, each/key and <container> in JSX, compiled the whole-file way and run against the
 * live runtime.
 */
import { describe, it, expect } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { compile, load as loadModule } from '../../../test/fixtures.js';

const MODULES: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S };
const load = (src: string): any => loadModule(compile(src), MODULES);

const mount = (node: unknown): HTMLElement => {
  const host = document.createElement('div');
  DOM.insert(host, node as never);
  return host;
};

describe('each in JSX', () => {
  it('renders the element once and its content per item', () => {
    const mod = load(
      'export const render = (colors) => <div class="row" each={colors()}>{(c) => <span style={`color: ${c}`}>{c}</span>}</div>;',
    );
    const host = mount(mod.render(() => ['red', 'green']));
    expect(host.querySelectorAll('.row')).toHaveLength(1);
    expect(host.querySelectorAll('.row > span')).toHaveLength(2);
  });

  it('folds key into a keyed For and keeps key a plain attribute elsewhere', () => {
    const code = compile('export const r = (rows) => <ul each={rows()} key="id">{(r) => <li>{r().id}</li>}</ul>;');
    expect(code.replace(/\s+/g, ' ')).toContain('(item) => item["id"]');
    const plain = compile('export const r = () => <li key="x">a</li>;');
    expect(plain).toContain('key');
  });

  it('keeps a text body that reads a signal live', () => {
    const mod = load('export const render = (items, suffix) => <p each={items()}>{(x) => x + suffix()}</p>;');
    const [suffix, setSuffix] = S.createSignal('!');
    const host = mount(mod.render(() => ['a', 'b'], suffix));
    expect(host.textContent).toBe('a!b!');
    setSuffix('?');
    S.flush();
    expect(host.textContent).toBe('a?b?');
  });
});

describe('if and else in JSX', () => {
  it('pairs an else sibling across whitespace, and a lone if has no fallback', () => {
    const mod = load(`export const render = (user) => (
      <div>
        <p if={user()}>hi {user()}</p>
        <a else>sign in</a>
      </div>
    );`);
    const [user, setUser] = S.createSignal<string | null>(null);
    const host = mount(mod.render(user));
    expect(host.querySelector('a')?.textContent).toBe('sign in');
    setUser('ada');
    S.flush();
    expect(host.querySelector('a')).toBeNull();
    expect(host.querySelector('p')?.textContent).toBe('hi ada');
    expect(host.querySelector('p')?.hasAttribute('if')).toBe(false);
  });
});

describe('<container> in JSX', () => {
  it('renders only its content, for if/else and each', () => {
    const mod = load(`export const render = (on, rows) => (
      <table><tbody><tr>
        <container if={on()}>
          <container each={rows}>{(r) => <><td>{r.a}</td><td>{r.b}</td></>}</container>
        </container>
        <container else><td>off</td></container>
      </tr></tbody></table>
    );`);
    const [on, setOn] = S.createSignal(true);
    const host = mount(mod.render(on, [{ a: 1, b: 2 }, { a: 3, b: 4 }]));
    expect(host.querySelectorAll('container')).toHaveLength(0);
    expect(Array.from(host.querySelectorAll('td'), (td) => td.textContent)).toEqual(['1', '2', '3', '4']);
    setOn(false);
    S.flush();
    expect(Array.from(host.querySelectorAll('td'), (td) => td.textContent)).toEqual(['off']);
  });
});
