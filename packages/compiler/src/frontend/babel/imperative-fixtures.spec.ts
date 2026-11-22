// @vitest-environment jsdom
import { compile } from '../../../test/fixtures.js';
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';

// Behavioural hardening: run a broad set of JSX patterns through the compiler,
// execute the output against the real @fluixi/dom runtime in jsdom, and assert
// the produced DOM. Catches backend edge cases (spreads, ref, style, fragments,
// control flow, SVG, ...) before real apps do.
//
// This ran each fixture through two codegens while a second, inline lowering
// existed alongside the IR pipeline. That lowering is gone, one path, one set of
// semantics: so the fixtures now assert the only behaviour there is.

const OPTS = {
  importSource: '@fluixi/dom',
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/reactive/store': Store,
};

function load(src: string, options: Record<string, unknown>): any {
  const step1 = compile(src, options);
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsPlugin] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

beforeAll(() => {
  const asComponent = (DOM as any).asComponent ?? ((x: any) => x);
  DOM.registerCreateComponent(((C: any, p: any) => asComponent(S.untrack(() => C(p)))) as any);
});

/** Resolve a render result (memo/accessor or node) to a concrete node. */
function resolve(v: any): any {
  while (typeof v === 'function') v = v();
  return v;
}

interface Fixture {
  name: string;
  src: string;
  run: (mod: any) => void | Promise<void>;
}

const FIXTURES: Fixture[] = [
  {
    name: 'static attributes + text',
    src: `export const render = () => <div id="x" title="hi" class="c">hello</div>;`,
    run: (mod) => {
      const el = resolve(mod.render());
      expect(el.id).toBe('x');
      expect(el.getAttribute('title')).toBe('hi');
      expect(el.className).toBe('c');
      expect(el.textContent).toBe('hello');
    },
  },
  {
    name: 'reactive class + reactive text, with static sibling',
    src: `export const render = (cls, n) => <div><span class="sib">s</span><b class={cls()}>{n()}</b></div>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [cls, setCls] = S.createSignal('a');
        const [n, setN] = S.createSignal(0);
        const el = resolve(mod.render(cls, n));
        const b = el.querySelector('b');
        expect(el.querySelector('.sib')).toBeTruthy();
        expect(b.className).toBe('a');
        expect(b.textContent).toContain('0');
        setCls('z'); setN(7);
        await S.flush();
        expect(b.className).toBe('z');
        expect(b.textContent).toContain('7');
      });
    },
  },
  {
    name: 'spread props ({...obj})',
    src: `export const render = (rest) => <div {...rest} class="base">x</div>;`,
    run: (mod) => {
      const el = resolve(mod.render({ id: 'sp', 'data-k': 'v' }));
      expect(el.id).toBe('sp');
      expect(el.getAttribute('data-k')).toBe('v');
    },
  },
  {
    name: 'ref callback',
    src: `export const render = (ref) => <div ref={ref} class="r">x</div>;`,
    run: (mod) => {
      let captured: any = null;
      resolve(mod.render((el: any) => { captured = el; }));
      expect(captured).toBeTruthy();
      expect(captured.className).toBe('r');
    },
  },
  {
    // ref={el} on a variable assigns the element; before, the variable stayed undefined.
    name: 'ref variable is assigned',
    src: `export const render = () => { let el; const node = <div ref={el} class="v">x</div>; return { node, get: () => el }; };`,
    run: (mod) => {
      const r = mod.render();
      const node = resolve(r.node);
      expect(r.get()).toBe(node);
    },
  },
  {
    name: 'ref variable inside a fragment is assigned',
    src: `export const render = () => { let el; const nodes = <><canvas ref={el} /><b>y</b></>; return { nodes, get: () => el }; };`,
    run: (mod) => {
      const r = mod.render();
      const el = r.get();
      expect(el).toBeTruthy();
      expect(el.tagName.toLowerCase()).toBe('canvas');
    },
  },
  {
    // A const holding a callback is never assigned to: that would not even compile.
    name: 'ref const callback is called',
    src: `export const render = (cb) => { const set = cb; return <div ref={set} class="c">x</div>; };`,
    run: (mod) => {
      let captured: any = null;
      resolve(mod.render((el: any) => { captured = el; }));
      expect(captured?.className).toBe('c');
    },
  },
  {
    name: 'ref object gets current',
    src: `export const render = (box) => <div ref={box} class="o">x</div>;`,
    run: (mod) => {
      const box = { current: null as any };
      resolve(mod.render(box));
      expect(box.current?.className).toBe('o');
    },
  },
  {
    name: 'reactive style object',
    src: `export const render = (st) => <div style={st()}>x</div>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [st, setSt] = S.createSignal({ color: 'red' });
        const el = resolve(mod.render(st));
        expect(el.style.color).toBe('red');
        setSt({ color: 'blue' });
        await S.flush();
        expect(el.style.color).toBe('blue');
      });
    },
  },
  {
    name: 'boolean + numeric attributes (reactive)',
    src: `export const render = (flag) => <input tabindex={3} disabled={flag()} />;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [flag, setFlag] = S.createSignal(true);
        const el = resolve(mod.render(flag));
        expect(el.getAttribute('tabindex')).toBe('3');
        expect(el.disabled).toBe(true);
        setFlag(false);
        await S.flush();
        expect(el.disabled).toBe(false);
      });
    },
  },
  {
    name: 'delegated event handler',
    src: `export const render = (onClick) => <button onClick={onClick}>go</button>;`,
    run: (mod) => {
      let n = 0;
      const el = resolve(mod.render(() => { n++; }));
      document.body.appendChild(el);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(n).toBe(1);
    },
  },
  {
    name: 'fragment as child',
    src: `export const render = () => <div><><span class="a">a</span><span class="b">b</span></></div>;`,
    run: (mod) => {
      const el = resolve(mod.render());
      expect(el.querySelector('.a')).toBeTruthy();
      expect(el.querySelector('.b')).toBeTruthy();
    },
  },
  {
    name: 'nested components (children passthrough)',
    src: `const Box = (p) => <section class="box">{p.children}</section>;
          export const render = () => <Box><span class="inner">i</span></Box>;`,
    run: (mod) => {
      const el = resolve(mod.render());
      expect(el.tagName).toBe('SECTION');
      expect(el.querySelector('.inner')).toBeTruthy();
    },
  },
  {
    name: 'For with reactive list + index',
    src: `import { For } from '@fluixi/dom';
          export const render = (items) => <ul><For each={items}>{(item, i) => <li class="row">{item}</li>}</For></ul>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [items, setItems] = S.createSignal(['a', 'b']);
        const el = resolve(mod.render(items));
        expect(el.querySelectorAll('.row').length).toBe(2);
        setItems(['a', 'b', 'c']);
        await S.flush();
        expect(el.querySelectorAll('.row').length).toBe(3);
        expect(el.textContent).toContain('c');
      });
    },
  },
  {
    name: 'Switch / Match',
    src: `import { Switch, Match } from '@fluixi/dom';
          export const render = (mode) => <Switch fallback={<p class="none">none</p>}>
            <Match when={() => mode() === 'a'}><p class="a">A</p></Match>
            <Match when={() => mode() === 'b'}><p class="b">B</p></Match>
          </Switch>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [mode, setMode] = S.createSignal('a');
        const host = document.createElement('div');
        DOM.insert(host, mod.render(mode));
        expect(host.querySelector('.a')).toBeTruthy();
        expect(host.querySelector('.b')).toBeNull();
        setMode('b');
        await S.flush();
        expect(host.querySelector('.b')).toBeTruthy();
        expect(host.querySelector('.a')).toBeNull();
        setMode('c');
        await S.flush();
        expect(host.querySelector('.none')).toBeTruthy();
      });
    },
  },
  {
    name: 'SVG element',
    src: `export const render = () => <svg viewBox="0 0 10 10"><rect width="5" height="5" /></svg>;`,
    run: (mod) => {
      const el = resolve(mod.render());
      expect(el.tagName.toLowerCase()).toBe('svg');
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
      const rect = el.querySelector('rect');
      expect(rect?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    },
  },
  {
    name: 'text interleaved with expressions',
    src: `export const render = (name) => <p>Hello {name()} — welcome!</p>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [name, setName] = S.createSignal('Ada');
        const el = resolve(mod.render(name));
        expect(el.textContent).toContain('Hello');
        expect(el.textContent).toContain('Ada');
        expect(el.textContent).toContain('welcome');
        setName('Bo');
        await S.flush();
        expect(el.textContent).toContain('Bo');
        expect(el.textContent).not.toContain('Ada');
      });
    },
  },
  {
    name: 'multiple events on one element',
    src: `export const render = (onClick, onInput) => <input onClick={onClick} onInput={onInput} />;`,
    run: (mod) => {
      let clicks = 0, inputs = 0;
      const el = resolve(mod.render(() => { clicks++; }, () => { inputs++; }));
      document.body.appendChild(el);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      expect(clicks).toBe(1);
      expect(inputs).toBe(1);
    },
  },
  {
    name: 'classList (reactive, per-entry accessor)',
    src: `export const render = (on) => <div class="base" classList={{ active: on }}>x</div>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [on, setOn] = S.createSignal(false);
        const el = resolve(mod.render(on));
        expect(el.classList.contains('base')).toBe(true);
        expect(el.classList.contains('active')).toBe(false);
        setOn(true);
        await S.flush();
        expect(el.classList.contains('active')).toBe(true);
      });
    },
  },
  {
    name: 'innerHTML',
    src: `export const render = () => <div innerHTML="<b class='ih'>bold</b>" />;`,
    run: (mod) => {
      const el = resolve(mod.render());
      expect(el.querySelector('.ih')).toBeTruthy();
      expect(el.querySelector('.ih').textContent).toBe('bold');
    },
  },
  {
    name: 'component with a reactive prop',
    src: `const Label = (p) => <span class="lbl">{() => p.text()}</span>;
          export const render = (text) => <Label text={text} />;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [text, setText] = S.createSignal('one');
        const host = document.createElement('div');
        DOM.insert(host, mod.render(text));
        expect(host.querySelector('.lbl')?.textContent).toContain('one');
        setText('two');
        await S.flush();
        expect(host.querySelector('.lbl')?.textContent).toContain('two');
      });
    },
  },
  {
    // Regression: IR wrapped component prop *values* in `() => ...` thunks (unlike
    // inline), so a prop like `history={createMemoryHistory()}` reached the
    // component as a function: `history.get is not a function`. Component props
    // must be passed as values (the createComponent call already sits in a memo).
    name: 'component prop (call expr) is passed as a value, not a thunk',
    src: `const makeApi = () => ({ get: () => 'V' });
          const Box = (p) => <span class="box" data-kind={typeof p.api}>{p.api.get()}</span>;
          export const render = () => <Box api={makeApi()} />;`,
    run: (mod: any) => {
      const host = document.createElement('div');
      DOM.insert(host, mod.render());
      const el = host.querySelector('.box');
      expect(el?.getAttribute('data-kind')).toBe('object'); // not 'function'
      expect(el?.textContent).toBe('V');
    },
  },
  {
    name: 'For with removal + reorder (keyed)',
    src: `import { For } from '@fluixi/dom';
          export const render = (items) => <ul><For each={items}>{(it) => <li class="row" data-id={it.id}>{it.t}</li>}</For></ul>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const a = { id: 1, t: 'a' }, b = { id: 2, t: 'b' }, c = { id: 3, t: 'c' };
        const [items, setItems] = S.createSignal([a, b, c]);
        const el = resolve(mod.render(items));
        expect(el.querySelectorAll('.row').length).toBe(3);
        setItems([c, a]); // remove b, reorder
        await S.flush();
        const rows = [...el.querySelectorAll('.row')];
        expect(rows.length).toBe(2);
        expect(rows.map((r: any) => r.getAttribute('data-id'))).toEqual(['3', '1']);
      });
    },
  },
  {
    name: 'Index control flow',
    src: `import { Index } from '@fluixi/dom';
          export const render = (items) => <ul><Index each={items}>{(item, i) => <li class="row">{item()}</li>}</Index></ul>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const [items, setItems] = S.createSignal(['x', 'y']);
        const el = resolve(mod.render(items));
        expect(el.querySelectorAll('.row').length).toBe(2);
        setItems(['x', 'y', 'z']);
        await S.flush();
        expect(el.querySelectorAll('.row').length).toBe(3);
      });
    },
  },
  {
    name: 'Dynamic component (reactive switch)',
    src: `import { Dynamic } from '@fluixi/dom';
          export const render = (which) => <Dynamic component={which} />;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        const A = () => { const p = DOM.createNativeElement('p') as HTMLElement; p.className = 'da'; p.textContent = 'A'; return p; };
        const B = () => { const p = DOM.createNativeElement('p') as HTMLElement; p.className = 'db'; p.textContent = 'B'; return p; };
        const host = document.createElement('div');
        const [which, setWhich] = S.createSignal<any>(A);
        DOM.insert(host, mod.render(which));
        expect(host.querySelector('.da')).toBeTruthy();
        expect(host.querySelector('.db')).toBeNull();
        setWhich(() => B);
        await S.flush();
        expect(host.querySelector('.db')).toBeTruthy();
        expect(host.querySelector('.da')).toBeNull();
      });
    },
  },
  {
    name: 'Portal renders into a mount target (not in place)',
    src: `import { Portal } from '@fluixi/dom';
          export const render = (mount) => <div class="host"><span class="here">h</span><Portal mount={mount}><p class="pc">portaled</p></Portal></div>;`,
    run: (mod) => {
      S.createRoot(() => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);
        const el = resolve(mod.render(mount));
        expect(el.querySelector('.here')).toBeTruthy();
        expect(el.querySelector('.pc')).toBeNull();          // not in the host tree
        expect(mount.querySelector('.pc')?.textContent).toBe('portaled'); // in the mount
      });
    },
  },
  {
    name: 'ErrorBoundary catches a throwing child component',
    src: `import { ErrorBoundary } from '@fluixi/dom';
          const Risky = () => { throw new Error('boom'); };
          export const render = () => <ErrorBoundary fallback={<p class="fb">caught</p>}><Risky /></ErrorBoundary>;`,
    run: (mod) => {
      S.createRoot(() => {
        const host = document.createElement('div');
        DOM.insert(host, mod.render());
        expect(host.querySelector('.fb')?.textContent).toBe('caught');
      });
    },
  },
  {
    // Regression: a resource rendered through control flow. The resource accessor
    // must be isResource/isSignal-detectable so Show's `.loading` gate and insert's
    // reactive read work: otherwise it freezes on the fallback (compat dropped the
    // $RESOURCE/$SIGNAL markers; this guards them end-to-end through the codegen).
    name: 'Show gated on resource loading',
    src: `import { Show } from '@fluixi/dom';
          export const render = (data) => <Show when={() => !data.loading} fallback={<p class="load">loading</p>}>{() => <p class="val">{data()}</p>}</Show>;`,
    run: async (mod) => {
      await S.createRoot(async () => {
        let resolve!: (v: string) => void;
        const p = new Promise<string>((r) => { resolve = r; });
        const [data] = S.createResource(() => p);
        const host = document.createElement('div');
        DOM.insert(host, mod.render(data));
        expect(host.querySelector('.load')).toBeTruthy();
        expect(host.querySelector('.val')).toBeNull();
        resolve('OK');
        await p.catch(() => {});
        await S.flush();
        await S.flush();
        expect(host.querySelector('.val')).toBeTruthy();
        expect(host.textContent).toContain('OK');
      });
    },
  },
];

describe('imperative fixtures', () => {
  for (const fx of FIXTURES) {
    it(fx.name, () => fx.run(load(fx.src, OPTS)));
  }
});
