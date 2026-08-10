import { compile as compileFixture } from '../../../test/fixtures.js';
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';

// Step 5: prove the imperative backend's compiled output (createNativeElement /
// spread / insert / createComponent) renders and stays fine-grained reactive
// against the real @fluixi/dom runtime — not just that it type-checks.

const IMPERATIVE = {
  importSource: '@fluixi/dom',
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};

// There is one path now: build IR, run the imperative backend. The alias is kept
// so the tests written against the IR pipeline read as they did.
const IMPERATIVE_IR = IMPERATIVE;

/** Compile to ESM — for asserting codegen shape. */
const compileEsm = (src: string, options: Record<string, unknown> = IMPERATIVE): string =>
  compileFixture(src, { filename: 'test.tsx', ...options });

/** Run our plugin, then lower ESM -> CJS so we can eval with a controlled require. */
function compile(src: string, options: Record<string, unknown> = IMPERATIVE): string {
  const step1 = compileEsm(src, options);
  const step2 = babel.transformSync(step1, {
    filename: 'test.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsPlugin],
  })!.code!;
  return step2;
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/reactive/store': Store,
};

/** Evaluate compiled CJS with imports resolved to the live workspace modules. */
function load(src: string, options: Record<string, unknown> = IMPERATIVE): any {
  const code = compile(src, options);
  const moduleObj = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require in compiled output: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(moduleObj.exports, req, moduleObj);
  return moduleObj.exports;
}

beforeAll(() => {
  // @fluixi/dom auto-initializes its signal integration from @fluixi/reactive on
  // import; we only need to register the component system for createComponent.
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('imperative backend codegen', () => {
  it('emits runtime calls, not jsx()', () => {
    const code = compileEsm(`export const r = (x) => <div id="a">{x()}</div>;`);
    // How the element is built is codegen's choice — element-by-element, or cloned from a
    // template when its structure is static. Asserting one of those pinned an optimisation
    // rather than the behaviour this test is about.
    expect(code).toMatch(/createNativeElement|templateNode/);
    expect(code).toContain('insert');
    expect(code).not.toMatch(/\bjsx\(/);
    expect(code).not.toMatch(/\bjsxs\(/);
  });

  it('emits component children as a lazy getter (owner nesting for context/Suspense)', () => {
    // Children must be a getter, not an eagerly-built value — so child components
    // are created inside the parent component's execution (nested owner scope),
    // not as sibling memos at the call site. Critical for Suspense/lazy + providers.
    const code = compileEsm(`export const r = () => <Wrap><span>x</span></Wrap>;`);
    expect(code).toMatch(/get children\(\)/);
    expect(code).not.toMatch(/children:\s*\(\(\) => \{/); // not an eager IIFE value
  });

  it('emits an inline JSX component prop as a lazy getter', () => {
    // <Suspense fallback={<div/>}> — the fallback must be a getter, not an eager IIFE built
    // when the props object is constructed. Eager construction walks the hydration cursor and
    // adopts the real server node, duplicating the tree on hydration. Inline AND IR must agree.
    const src = `export const r = () => <Wrap fallback={<div class="fb" />}>hi</Wrap>;`;
    for (const opts of [IMPERATIVE, IMPERATIVE_IR]) {
      const code = compileEsm(src, opts);
      expect(code).toMatch(/get fallback\(\)/);
      expect(code).not.toMatch(/fallback:\s*\(\(\) =>/); // not an eager IIFE value
    }
  });

  it('builds a native element with a static attribute', () => {
    const mod = load(`export const render = () => <div id="x" title="hello" />;`);
    const el = mod.render() as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('x');
    expect(el.getAttribute('title')).toBe('hello');
  });

  it('binds a reactive attribute and a reactive text child', async () => {
    const mod = load(`export const render = (count, cls) => <p class={cls()}>{count()}</p>;`);
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [count, setCount] = S.createSignal(0);
        const [cls, setCls] = S.createSignal('a');
        const el = mod.render(count, cls) as HTMLElement;
        expect(el.className).toBe('a');
        expect(el.textContent).toContain('0');
        setCount(1);
        setCls('b');
        S.flush().then(() => {
          expect(el.className).toBe('b');
          expect(el.textContent).toContain('1');
          resolve();
        }).catch(reject);
      });
    });
  });

  it('wires a delegated event handler', () => {
    const mod = load(`export const render = (onClick) => <button onClick={onClick}>go</button>;`);
    let n = 0;
    const el = mod.render(() => { n++; }) as HTMLElement;
    document.body.appendChild(el);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(n).toBe(1);
    expect(el.textContent).toContain('go');
  });

  it('nests native elements', () => {
    const mod = load(`export const render = () => <ul><li>a</li><li>b</li></ul>;`);
    const el = mod.render() as HTMLElement;
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.textContent).toBe('ab');
  });

  it('instantiates a component through createComponent', () => {
    const mod = load(`export const render = (Greeting, label) => <Greeting label={label} />;`);
    const Greeting = (p: any) => {
      const s = DOM.createNativeElement('span') as HTMLElement;
      s.textContent = p.label;
      return s;
    };
    S.createRoot(() => {
      const acc = mod.render(Greeting, 'hi');
      const node = (typeof acc === 'function' ? acc() : acc) as HTMLElement;
      expect(node.tagName).toBe('SPAN');
      expect(node.textContent).toBe('hi');
    });
  });
});

// Regression: a reactive/component child that is NOT the only child must still be
// bound reactively. The old codegen emitted insert(el, [c1, c2]) (one array), and
// insert does not reactively bind function/component elements inside an array — so
// a reactive child or a <Show>/<For> next to siblings rendered once and never
// updated. The fix emits a separate insert(el, child, marker) per child (like the
// jsx runtime's applyProps).

describe('multi-child reactive child (regression)', () => {
  for (const [label, opts] of [['imperative', IMPERATIVE]] as const) {
    it(`${label}: a reactive child beside a sibling stays reactive`, async () => {
      const mod = load(`export const render = (count) => <div><span class="sib">x</span>{count()}</div>;`, opts);
      await new Promise<void>((resolve, reject) => {
        S.createRoot(() => {
          const [count, setCount] = S.createSignal(0);
          const el = mod.render(count) as HTMLElement;
          expect(el.querySelector('.sib')).toBeTruthy();
          expect(el.textContent).toContain('0');
          setCount(1);
          S.flush().then(() => {
            expect(el.textContent).toContain('1');
            expect(el.querySelector('.sib')).toBeTruthy();
            resolve();
          }).catch(reject);
        });
      });
    });
  }

  // A component child (Show) with a JSX fallback beside a sibling — the user's exact
  // case. The default 'inline' path handles JSX-valued props; the 'ir' path does not
  // yet recurse into JSX nested in expressions (see note below), so this is inline-only.
  it('inline: a Show beside a sibling stays reactive', async () => {
    const mod = load(
      `import { Show } from '@fluixi/dom';
       export const render = (on) => <div><span class="sib">x</span><Show when={on} fallback={<p class="off">off</p>}><p class="on">on</p></Show></div>;`,
      IMPERATIVE,
    );
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [on, setOn] = S.createSignal(false);
        const el = mod.render(on) as HTMLElement;
        expect(el.querySelector('.off')).toBeTruthy();
        expect(el.querySelector('.on')).toBeNull();
        setOn(true);
        S.flush().then(() => {
          expect(el.querySelector('.on')).toBeTruthy();
          expect(el.querySelector('.off')).toBeNull();
          resolve();
        }).catch(reject);
      });
    });
  });
});

// Regression: the IR codegen must recurse into JSX nested inside expressions
// (render-props, ternaries, .map callbacks, fallback={<p/>}, () => cond && <jsx/>).
// build-ir compiles those nested JSX nodes back through build-ir + emit and
// splices the generated code in (previously it stringified raw JSX -> parse error).
describe('ir: JSX nested in expressions (regression)', () => {
  it('a reactive conditional child that contains JSX', async () => {
    const mod = load(
      `export const render = (on) => <div class="host">{() => on() && <p class="inner">yo</p>}</div>;`,
      IMPERATIVE_IR,
    );
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [on, setOn] = S.createSignal(false);
        const el = mod.render(on) as HTMLElement;
        expect(el.querySelector('.inner')).toBeNull();
        setOn(true);
        S.flush().then(() => {
          expect(el.querySelector('.inner')?.textContent).toBe('yo');
          resolve();
        }).catch(reject);
      });
    });
  });

  it('a Show whose fallback prop is JSX', async () => {
    const mod = load(
      `import { Show } from '@fluixi/dom';
       export const render = (on) => <div><Show when={on} fallback={<p class="off">off</p>}><p class="on">on</p></Show></div>;`,
      IMPERATIVE_IR,
    );
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [on, setOn] = S.createSignal(false);
        const el = mod.render(on) as HTMLElement;
        expect(el.querySelector('.off')).toBeTruthy();
        setOn(true);
        S.flush().then(() => {
          expect(el.querySelector('.on')).toBeTruthy();
          expect(el.querySelector('.off')).toBeNull();
          resolve();
        }).catch(reject);
      });
    });
  });

  it('a render-prop returning JSX (.map)', () => {
    const mod = load(
      `export const render = (items) => <ul>{items().map((x) => <li class="row">{x}</li>)}</ul>;`,
      IMPERATIVE_IR,
    );
    S.createRoot(() => {
      const [items] = S.createSignal(['a', 'b', 'c']);
      const el = mod.render(items) as HTMLElement;
      expect(el.querySelectorAll('.row').length).toBe(3);
      expect(el.textContent).toBe('abc');
    });
  });
});

// The `backend: 'jsx'` option — emit jsx()/jsxs() and let the runtime interpret
// them — was removed. Nothing selected it, and it was the last consumer of a
// second lowering that duplicated every semantic the IR pipeline owns. What the
// automatic runtime still serves is esbuild and TypeScript's jsxImportSource;
// this compiler never emits a jsx() call.
describe('there is no jsx-factory backend', () => {
  it('compiles to runtime calls, never jsx()', () => {
    const code = compileEsm(`export const r = (x) => <div id="a">{x()}</div>;`, IMPERATIVE);
    expect(code).not.toMatch(/\bjsx\(/);
    expect(code).toContain('insert');
  });
});

describe('imperative backend via the IR codegen path (codegen: ir)', () => {
  it('emits the same runtime calls through the plugin', () => {
    const code = compileEsm(`export const r = (x) => <div id="a">{x()}</div>;`, IMPERATIVE_IR);
    // Structure static with one hole — a partial template, then the hole is inserted.
    expect(code).toContain('templateNode');
    expect(code).toContain('insert');
    expect(code).not.toMatch(/\bjsx\(/);
  });

  it('renders + stays reactive when compiled through the plugin', async () => {
    const mod = load(`export const render = (count) => <p>{count()}</p>;`, IMPERATIVE_IR);
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [count, setCount] = S.createSignal(0);
        const el = mod.render(count) as HTMLElement;
        expect(el.tagName).toBe('P');
        expect(el.textContent).toContain('0');
        setCount(2);
        S.flush().then(() => {
          expect(el.textContent).toContain('2');
          resolve();
        }).catch(reject);
      });
    });
  });

  it('nests elements through the plugin', () => {
    const mod = load(`export const render = () => <ul><li>a</li><li>b</li></ul>;`, IMPERATIVE_IR);
    const el = mod.render() as HTMLElement;
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.textContent).toBe('ab');
  });
});
