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

function compile(src: string) {
  // Partial templates are opt-in; this suite exercises them deliberately.
  return imperativeBackend.emit(buildIR(parseJSX(src)), { partialTemplates: true } as never);
}

/** Execute an emitted expression, wiring runtime imports + user vars into scope. */
function evalExpr(src: string, vars: Record<string, any> = {}): any {
  const { code, imports, templates } = compile(src);
  const runtimeNames = imports;
  // Runtime fns come from @fluixi/dom; reactive primitives (createMemo) from the signal core.
  const runtimeVals = runtimeNames.map((n) => (DOM as any)[n] ?? (S as any)[n]);
  const userNames = Object.keys(vars);
  const userVals = userNames.map((k) => vars[k]);
  // Static templates are declarations the host must emit, exactly like `imports`.
  // Templates are plain HTML strings; `templateNode` decides how to realise them.
  const decls = (templates ?? [])
    .map((t) => `const ${t.id} = ${JSON.stringify(t.html)};`)
    .join('\n');
  // eslint-disable-next-line no-new-func
  const fn = new Function(...runtimeNames, ...userNames, `${decls}\nreturn (${code});`);
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
    // Structure static, one hole — a partial template rather than element-by-element.
    const { code, imports } = compile('(<ul><li>{x()}</li></ul>)');
    expect(code).toContain('templateNode');
    expect(code).toContain('insert');
    expect(imports).toContain('templateNode');
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

describe('Solid-style JSX directives (parity)', () => {
  it('routes use:name into a single normalized `use` prop', () => {
    const ir: any = buildIR(parseJSX('(<div use:tooltip={opts} use:autofocus></div>)'));
    const use = ir.props.find((p: any) => p.name === 'use');
    expect(use).toBeDefined();
    expect(use.expr).toBe('[[tooltip, () => opts], [autofocus]]');
  });

  it('runs a use: directive with the element + options accessor', () => {
    const seen: any[] = [];
    const tooltip = (el: Element, value: () => any) => { seen.push([el.tagName, value()]); };
    S.createRoot(() => {
      evalExpr('(<div use:tooltip={{ text: "hi" }}></div>)', { tooltip });
    });
    expect(seen).toEqual([['DIV', { text: 'hi' }]]);
  });

  it('binds a native listener via on: (bypassing delegation)', () => {
    let n = 0;
    const el = evalExpr('(<div on:click={h}></div>)', { h: () => { n++; } }) as HTMLElement;
    el.dispatchEvent(new MouseEvent('click')); // no bubbling — delegation would miss it
    expect(n).toBe(1);
  });

  it('oncapture:click attaches a capture-phase native listener', () => {
    const ir: any = buildIR(parseJSX('(<button oncapture:click={h}></button>)'));
    const p = ir.props.find((x: any) => x.name === 'on:click');
    expect(p).toBeDefined();
    expect(p.expr).toBe('[h, { capture: true }]');
  });

  it('toggles classes via classList', () => {
    const el = evalExpr('(<div classList={{ active: true, hidden: false }}></div>)') as HTMLElement;
    expect(el.classList.contains('active')).toBe(true);
    expect(el.classList.contains('hidden')).toBe(false);
  });

  it('prop:x forces a DOM property (no reflected attribute)', () => {
    const el = evalExpr('(<div prop:foo={42}></div>)') as HTMLElement;
    expect((el as any).foo).toBe(42);
    expect(el.getAttribute('foo')).toBeNull();
  });

  it('attr:x forces an attribute', () => {
    const el = evalExpr('(<div attr:foo={"bar"}></div>)') as HTMLElement;
    expect(el.getAttribute('foo')).toBe('bar');
  });

  it('bool:x toggles a boolean attribute by truthiness', () => {
    const on = evalExpr('(<button bool:disabled={1}></button>)') as HTMLElement;
    expect(on.hasAttribute('disabled')).toBe(true);
    expect(on.getAttribute('disabled')).toBe('');
    const off = evalExpr('(<button bool:disabled={0}></button>)') as HTMLElement;
    expect(off.hasAttribute('disabled')).toBe(false);
  });

  it('prop:x stays reactive', async () => {
    await new Promise<void>((resolve, reject) => {
      S.createRoot(() => {
        const [v, setV] = S.createSignal(1);
        const el = evalExpr('(<div prop:foo={v()}></div>)', { v }) as HTMLElement;
        expect((el as any).foo).toBe(1);
        setV(2);
        S.flush().then(() => {
          expect((el as any).foo).toBe(2);
          resolve();
        }).catch(reject);
      });
    });
  });
});

describe('template cloning produces the same DOM as building element by element', () => {
  // The optimisation is only sound if the two paths are indistinguishable. Each case
  // pairs a static tree (cloned) with a near-identical dynamic one (imperative) and
  // compares the markup they produce.
  const cases: [string, string, string][] = [
    [
      'nested static tree',
      '(<div class="card"><header class="h"><h3>Title</h3></header><p>Body</p></div>)',
      '<div class="card"><header class="h"><h3>Title</h3></header><p>Body</p></div>',
    ],
    ['void element', '(<div><br/><img src="a.png"/></div>)', '<div><br><img src="a.png"></div>'],
    [
      // The `<!--fx-->` pair brackets the hole: it is what makes the clone, the
      // server's markup and the hydrated DOM the same shape, and what lets the runtime
      // identify a hole's existing content exactly.
      'entities in text and attributes',
      '(<div title={"a<b"}>{"1 < 2"}</div>)',
      '<div title="a<b"><!--fx-->1 &lt; 2<!--fx/--></div>',
    ],
    ['valueless attribute', '(<input disabled/>)', '<input disabled="">'],
  ];

  it.each(cases)('%s', (_label, src, expected) => {
    const node = evalExpr(src) as HTMLElement;
    const host = document.createElement('div');
    host.appendChild(node);
    expect(host.innerHTML).toBe(expected);
  });

  it('clones a fresh node per call rather than sharing one', () => {
    // The failure this guards against is the reason hoisting was disabled for the
    // imperative backend: a shared live node appearing in two places.
    const a = evalExpr('(<p class="x">hi</p>)') as HTMLElement;
    const b = evalExpr('(<p class="x">hi</p>)') as HTMLElement;
    expect(a).not.toBe(b);
    a.textContent = 'changed';
    expect(b.textContent).toBe('hi');
  });

  it('actually took the clone path for a static tree', () => {
    expect(compile('(<div class="a"><span>x</span></div>)').code).toContain('templateNode');
  });

  it('templates the structure and inserts the hole when a child is dynamic', () => {
    const { code } = compile('(<div class="a">{v()}</div>)');
    expect(code).toContain('templateNode');
    expect(code).toContain('insert(_el$');
  });

  it('falls back to building when the element itself is dynamic', () => {
    // A reactive attribute cannot be baked into a template.
    expect(compile('(<div class={cls()}>x</div>)').code).toContain('createNativeElement');
  });
});
