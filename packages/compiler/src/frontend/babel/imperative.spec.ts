import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import plugin from './plugin.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';

// Step 5: prove the imperative backend's compiled output (createNativeElement /
// spread / insert / createComponent) renders and stays fine-grained reactive
// against the real @fluixi/dom runtime — not just that it type-checks.

const IMPERATIVE = {
  backend: 'imperative' as const,
  importSource: '@fluixi/dom',
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
  hoistStatics: false,
};

/** Run only our plugin (ESM output) — for asserting codegen shape. */
function compileEsm(src: string, options: Record<string, unknown> = IMPERATIVE): string {
  return babel.transformSync(src, {
    filename: 'test.tsx',
    configFile: false,
    babelrc: false,
    plugins: [[plugin, options]],
  })!.code!;
}

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
function load(src: string): any {
  const code = compile(src);
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
    expect(code).toContain('createNativeElement');
    expect(code).toContain('insert');
    expect(code).not.toMatch(/\bjsx\(/);
    expect(code).not.toMatch(/\bjsxs\(/);
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

describe('jsx backend (default) is unchanged', () => {
  it('still emits jsx()/jsxs() calls', () => {
    const code = compileEsm(
      `export const r = (x) => <div id="a">{x()}</div>;`,
      { importSource: '@fluixi/jsx-runtime' },
    );
    expect(code).toMatch(/\bjsx\(/);
    expect(code).not.toContain('createNativeElement');
  });
});
