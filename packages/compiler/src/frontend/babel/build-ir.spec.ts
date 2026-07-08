import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { buildIR } from './build-ir.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';

// Proves the full AST -> IR -> emit() pipeline end to end: parse JSX, build the
// host-agnostic IR, run the imperative backend's emit() to get code, then EXECUTE
// that code against the real @fluixi/dom runtime in jsdom and assert on the DOM.

function parseJSX(src: string): any {
  const ast = babel.parseSync(src, {
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx'] },
  });
  let found: any = null;
  const walk = (n: any) => {
    if (!n || found || typeof n !== 'object') return;
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') { found = n; return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  };
  walk(ast);
  if (!found) throw new Error('no JSX found in: ' + src);
  return found;
}

function compile(src: string): { code: string; imports: string[] } {
  return imperativeBackend.emit(buildIR(parseJSX(src)), {});
}

/** Execute an emitted expression, wiring runtime imports + user vars into scope. */
function evalExpr(src: string, vars: Record<string, any> = {}): any {
  const { code, imports } = compile(src);
  const runtimeNames = imports;
  // Runtime fns come from @fluixi/dom; reactive primitives (createMemo) from the signal core.
  const runtimeVals = runtimeNames.map((n) => (DOM as any)[n] ?? (S as any)[n]);
  const userNames = Object.keys(vars);
  const userVals = userNames.map((k) => vars[k]);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...runtimeNames, ...userNames, `return (${code});`);
  return fn(...runtimeVals, ...userVals);
}

beforeAll(() => {
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('AST -> IR -> emit() pipeline', () => {
  it('builds IR with normalized props', () => {
    const ir: any = buildIR(parseJSX('(<div id="x" class={cls()} onClick={h}>hi</div>)'));
    expect(ir.kind).toBe('element');
    expect(ir.tag).toBe('div');
    const byName = Object.fromEntries(ir.props.map((p: any) => [p.name, p]));
    expect(byName.id.literal).toBe('x');
    expect(byName.className.expr).toBe('cls()');
    expect(byName.className.reactive).toBe(true);
    expect(byName.onClick.kind).toBe('event');
    expect(ir.children[0]).toMatchObject({ kind: 'text', value: 'hi' });
  });

  it('emit() targets the runtime contract', () => {
    const { code, imports } = compile('(<ul><li>{x()}</li></ul>)');
    expect(code).toContain('createNativeElement');
    expect(code).toContain('insert');
    expect(imports).toContain('createNativeElement');
    expect(imports).not.toContain('jsx');
  });

  it('renders a native element with static + reactive bindings', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [count, setCount] = S.createSignal(0);
        const [cls, setCls] = S.createSignal('a');
        const el = evalExpr('(<p id="x" class={cls()}>{count()}</p>)', { count, cls }) as HTMLElement;
        expect(el.id).toBe('x');
        expect(el.className).toBe('a');
        expect(el.textContent).toContain('0');
        setCount(1); setCls('b');
        S.flush().then(() => {
          expect(el.className).toBe('b');
          expect(el.textContent).toContain('1');
          resolve();
        }).catch(reject);
      });
    });
  });

  it('nests elements and renders text', () => {
    const el = evalExpr('(<ul><li>a</li><li>b</li></ul>)') as HTMLElement;
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.textContent).toBe('ab');
  });

  it('wires a delegated event handler', () => {
    let n = 0;
    const el = evalExpr('(<button onClick={onClick}>go</button>)', { onClick: () => { n++; } }) as HTMLElement;
    document.body.appendChild(el);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(n).toBe(1);
  });

  it('instantiates a component through createComponent', () => {
    const Greeting = (p: any) => {
      const s = DOM.createNativeElement('span') as HTMLElement;
      s.textContent = p.label;
      return s;
    };
    S.createRoot(() => {
      const acc = evalExpr('(<Greeting label="hi" />)', { Greeting });
      const node = (typeof acc === 'function' ? acc() : acc) as HTMLElement;
      expect(node.tagName).toBe('SPAN');
      expect(node.textContent).toBe('hi');
    });
  });
});
