import { describe, it, expect } from 'vitest';
import { compile } from '../../test/fixtures.js';

const OPTIONS = { signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', sourceLocations: true, filename: 'src/App.ts' };
const run = (src: string) => compile(src, OPTIONS);

describe('source locations', () => {
  it('marks a signal with its file, position and name', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';\nconst count = signal(0);`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,14,"count")');
  });

  it('marks a memo and an anonymous effect', () => {
    const out = run(`import { memo, effect } from '@fluixi/reactive/signal';
const doubled = memo(() => 1);
effect(() => {});`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,16,"doubled")');
    // No variable to name it after, so the mark carries a position only.
    expect(out).toContain('__fx_source?.("src/App.ts",3,0)');
  });

  it('marks the $ intrinsics', () => {
    const out = run(`const count = $signal(0);\nconst d = $memo(() => count() * 2);`);
    expect(out).toContain('__fx_source?.("src/App.ts",1,14,"count")');
    expect(out).toContain('__fx_source?.("src/App.ts",2,10,"d")');
  });

  it('marks where a component is declared, and skips a plain function', () => {
    const out = run(`export function App() {
  return <div>hi</div>;
}
const Row = () => <b>x</b>;
function helper() { return 1; }`);
    expect(out).toContain('__fx_component?.("App","src/App.ts",1,7)');
    expect(out).toContain('__fx_component?.("Row","src/App.ts",4,6)');
    expect(out).not.toContain('"helper"');
  });

  it('distinguishes two primitives on separate statements of one line', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';\nconst a = signal(1); const b = signal(2);`);
    expect(out).toContain('"src/App.ts",2,10,"a"');
    expect(out).toContain('"src/App.ts",2,31,"b"');
  });

  it('marks where a component is used, inside the memo that wraps it', () => {
    const out = run(`import { Row } from './Row';
export function App() {
  return <div><Row label="x" /></div>;
}`);
    // Before the arrow, so it is the mark the wrapping memo takes.
    expect(out).toContain('createMemo((globalThis.__fx_source?.("src/App.ts",3,14,"Row"), () =>');
  });

  /**
   * Every binding kind a template can produce has to carry the position of its
   * own hole. A binding that carries none falls back to the runtime stack at
   * inspection time, which reports a line in the *compiled* file — a number that
   * looks like a source line, resolves to the wrong code, and is past the end of
   * short files. So the assertion is that the marked line really does hold the
   * expression, not that it holds some particular number.
   */
  it('marks each hole in a template with the line its expression is on', () => {
    const src = `import { signal } from '@fluixi/reactive/signal';
import { html } from '@fluixi/dom';
const count = signal(0);
const name = signal('a');
const on = signal(true);
export function App() {
  return html\`<div>
    <p>\${count()}</p>
    <button ?disabled=\${count() < 0}>x</button>
    <input bind:value=\${name} />
    <span class:hot=\${on()}>y</span>
    <span style:color=\${on() ? 'red' : 'blue'}>z</span>
    <b class="box tone-\${on() ? 'on' : 'off'}">w</b>
    <input .valueAsNumber=\${count()} />
  </div>\`;
}`;
    const lines = src.split('\n');
    const marks = [...run(src).matchAll(/\(f\) => f\)\)\(([\s\S]*?),(\d+),(\d+)\)/g)].map((m) => ({
      expr: m[1],
      line: Number(m[2]),
    }));

    // content, ?bool, bind:, class:, style:, mixed attr, .prop
    expect(marks).toHaveLength(7);
    for (const { expr, line } of marks) {
      const text = lines[line - 1];
      expect(text, `hole ${expr} marked at line ${line}, past the end of a ${lines.length}-line file`).toBeDefined();
      // The lowered code wraps the author's expression, so match on the signal it reads.
      const read = /\b(count|name|on)\b/.exec(expr)?.[1];
      expect(text).toContain(read);
    }
  });

  /**
   * A tag inside a template is the only kind that used to emit no mark at all, so the nodes
   * it made took whichever mark the last declaration left behind — in a component that
   * declares signals and renders no holes, that is every node in the template.
   */
  it('marks a tag written inside a template, where the tag is', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';
import { html } from '@fluixi/dom';
const count = signal(0);
export function App() {
  return html\`<div>
    <Show when=\${count()}><b>x</b></Show>
    <Card header>y</Card>
    <p if=\${count()}>z</p>
  </div>\`;
}`);
    expect(out).toContain('__fx_source?.("src/App.ts",6,4,"Show")');
    // No hole anywhere in it: the tag's own position is the only thing that can place it.
    expect(out).toContain('__fx_source?.("src/App.ts",7,4,"Card")');
    // `if=` is a Show once lowered, and belongs to the element that carried the directive.
    expect(out).toContain('__fx_source?.("src/App.ts",8,4,"Show")');
  });

  it('leaves the source alone when off', () => {
    const out = compile(`import { signal } from '@fluixi/reactive/signal';\nconst c = signal(0);`, { ...OPTIONS, sourceLocations: false });
    expect(out).not.toContain('__fx_source');
  });
});

describe('statements the grammar only allows one of', () => {
  it('braces a marked if-branch instead of pushing it out of the branch', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
function f(v) {
  if (typeof v === 'function') effect(() => read(v));
  else other(v);
}`);
    expect(out).toContain("if (typeof v === 'function') {globalThis.__fx_source?.(");
    expect(out).toMatch(/effect\(\(\) => read\(v\)\);\}\n\s*else other\(v\);/);
  });

  it('braces a loop body that is a bare statement', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
for (const v of list) effect(() => read(v));`);
    expect(out).toContain('for (const v of list) {globalThis.__fx_source?.(');
    expect(out.trimEnd().endsWith('}')).toBe(true);
  });

  it('leaves a braced branch alone', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
if (ok) { effect(() => read()); }`);
    expect(out).toContain('{ globalThis.__fx_source?.(');
  });
});

describe('where a component mark can go', () => {
  it('stays inside the block when the component is declared in a callback', () => {
    const out = run(`it('renders', () => {
  function Page() {
    return <div />;
  }
  mount(Page);
});`);
    expect(out).toMatch(/\};globalThis\.__fx_component\?\.\("Page"/);
    expect(out).not.toMatch(/__fx_component\?\.\([^)]*\);\)/);
  });

  it('reaches past the export of a declared component', () => {
    const out = run(`export const Row = () => <b />;`);
    expect(out).toMatch(/;globalThis\.__fx_component\?\.\("Row"[^)]*\);\s*$/);
  });
});

describe('an exported declaration', () => {
  it('marks in front of the export, not between it and the declaration', () => {
    const out = run(`import { createStore } from '@fluixi/reactive/store';
export const [cart, setCart] = createStore({ items: [] }, { name: 'cart' });`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,31,"cart");export const [cart');
  });

  it('marks a default export the same way', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';
export default signal(0);`);
    expect(out).toMatch(/__fx_source\?\.\("src\/App\.ts",2,15\);export default/);
  });
});
